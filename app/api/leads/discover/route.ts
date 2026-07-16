import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { inngest } from "@/inngest/client";
import JobLead from "@/models/JobLead";
import User from "@/models/User";
import LeadsDiscoveryLog from "@/models/LeadsDiscoveryLog";
import UserSeenJobs from "@/models/UserSeenJobs";
import CacheQueryMeta from "@/models/CacheQueryMeta";
import { isIndiaLocation, type PageOffsets } from "@/lib/services/job-discovery";
import { normalizeQueryWithLocation } from "@/lib/services/query-normalize";
import { runDiscoveryPipeline } from "@/lib/services/lead-discovery-pipeline";

// ── Helpers ──

function getSearchLimit(user: any): number {
  if (user.role === "admin") return 9999;
  if (user.plan === "starter") return 30;
  if (user.plan === "pro") return 90;
  if (user.plan === "enterprise") return 500;
  return 0;
}

async function getMonthlySearchCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return LeadsDiscoveryLog.countDocuments({
    userId,
    createdAt: { $gte: monthStart },
  });
}

/**
 * Record jobUrls as "seen" by the user, capped at 500 entries via $slice.
 */
async function markJobsAsSeen(userId: string, normalizedQuery: string, jobUrls: string[]) {
  if (jobUrls.length === 0) return;

  await UserSeenJobs.findOneAndUpdate(
    { userId, normalizedQuery },
    {
      $push: { seenJobUrls: { $each: jobUrls, $slice: -500 } },
      $set: { lastSeenAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

/**
 * Get the next page offsets for a query by reading CacheQueryMeta,
 * incrementing each source's page by 1.
 */
async function getNextPageOffsets(
  normalizedQuery: string,
  location: string
): Promise<PageOffsets> {
  const metas = await CacheQueryMeta.find({ normalizedQuery });

  const india = isIndiaLocation(location);
  const offsets: PageOffsets = {
    adzuna: 1, jooble: 1, indeed: 1,
    // India sources default to 1 regardless — only incremented if actually used
    naukri: 1, shine: 1, internshala: 1,
  };

  for (const meta of metas) {
    const source = meta.source as keyof PageOffsets;
    if (source in offsets) {
      // Only advance India source pages when the location is actually India
      if (!india && (source === "naukri" || source === "shine" || source === "internshala")) {
        continue;
      }
      offsets[source] = meta.lastPageFetched + 1;
    }
  }

  return offsets;
}

// ── POST: Start or continue discovery ──

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, location, forceRefresh } = await request.json();
    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    await dbConnect();

    // 1. Authenticate & check plan
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isPaidUser = user.role === "admin" || (user.plan && user.plan !== "free");
    if (!isPaidUser) {
      return Response.json(
        { error: "Leads Discovery is a premium feature. Please upgrade your plan to access it." },
        { status: 403 }
      );
    }

    // 2. Normalize query for cache key matching
    const normalizedQuery = normalizeQueryWithLocation(query, location || "");
    const searchLimit = getSearchLimit(user);
    const searchCount = await getMonthlySearchCount(user._id);
    const discoveryRemaining = Math.max(0, searchLimit - searchCount);

    // 3. If forceRefresh ("Find More Leads") — skip cache, go straight to fresh fetch
    if (forceRefresh) {
      if (searchCount >= searchLimit) {
        return Response.json(
          {
            error: `You have reached the search limit (${searchCount}/${searchLimit}) for your plan this month. Please upgrade your plan to increase limits.`,
          },
          { status: 403 }
        );
      }

      console.log(
        `[LeadsDiscoverAPI] Force refresh requested for "${query}". Fetching next page. Count: ${searchCount}/${searchLimit}.`
      );

      // Deduct 1 quota credit
      await LeadsDiscoveryLog.create({
        userId: user._id,
        query,
        location: location || "",
      });

      const nextOffsets = await getNextPageOffsets(normalizedQuery, location || "");

      // Dispatch to the Inngest background worker. Only if the dispatch itself
      // fails (e.g. Inngest offline in local dev) do we fall back to an inline
      // run — this prevents every discovery from executing twice.
      try {
        await inngest.send({
          name: "leads/discover",
          data: { query, location: location || "", normalizedQuery, pageOffsets: nextOffsets },
        });
      } catch (inngestErr) {
        console.warn("[LeadsDiscoverAPI] Inngest trigger failed — running inline fallback:", inngestErr);
        runDiscoveryPipeline(query, location || "", normalizedQuery, nextOffsets).catch((err) => {
          console.error("[LeadsDiscoverAPI] Inline fallback failed:", err);
        });
      }

      return Response.json({
        success: true,
        trigger: "background",
        cached: false,
        forceRefresh: true,
        discoveryRemaining: Math.max(0, discoveryRemaining - 1),
        discoveryLimit: searchLimit,
      });
    }

    // 4. Check global cache (JobLead) for this normalized query within 48h TTL
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cachedLeads = await JobLead.find({
      normalizedQuery,
      createdAt: { $gte: fortyEightHoursAgo },
    });

    // Also check raw query for backwards compatibility with pre-normalization data
    let allCachedLeads = cachedLeads;
    if (cachedLeads.length === 0) {
      const legacyCached = await JobLead.find({
        searchQuery: query,
        createdAt: { $gte: fortyEightHoursAgo },
      });
      allCachedLeads = legacyCached;
    }

    // 5. Get user's seen jobs for this query
    const seenDoc = await UserSeenJobs.findOne({
      userId: user._id,
      normalizedQuery,
    });
    const seenUrls = new Set<string>(seenDoc?.seenJobUrls || []);

    // 6. Filter out seen jobs
    const unseenLeads = allCachedLeads.filter(
      (lead) => !seenUrls.has(lead.jobUrl)
    );

    // 7. If we have enough unseen results — return them (FREE, no quota deduction)
    if (unseenLeads.length >= 5) {
      console.log(
        `[LeadsDiscoverAPI] Unseen cache hit: ${unseenLeads.length} unseen leads for "${query}" (${allCachedLeads.length} total cached, ${seenUrls.size} seen). No quota deducted.`
      );

      // Mark as seen — but only leads that actually have a contact email.
      // A lead that hasn't been enriched with an email yet is hidden by the UI,
      // so marking it seen would bury it permanently even if a later run finds
      // its email. Leaving it unseen lets it resurface once enriched.
      const newlySeen = unseenLeads.filter((l) => l.contactEmail).map((l) => l.jobUrl);
      await markJobsAsSeen(user._id, normalizedQuery, newlySeen);

      return Response.json({
        success: true,
        leads: unseenLeads,
        cached: true,
        fromSharedCache: true,
        discoveryRemaining,
        discoveryLimit: searchLimit,
      });
    }

    // 8. Not enough unseen results — need fresh data from APIs
    //    Check if there are zero unseen and zero cached (truly empty)
    const hasSeenEverything =
      allCachedLeads.length > 0 && unseenLeads.length === 0;

    // Check quota before making fresh API calls
    if (searchCount >= searchLimit) {
      if (hasSeenEverything) {
        return Response.json({
          success: true,
          leads: [],
          cached: true,
          allSeen: true,
          noNewData: true,
          discoveryRemaining: 0,
          discoveryLimit: searchLimit,
          message: "No new leads found. Try a different search.",
        });
      }
      return Response.json(
        {
          error: `You have reached the search limit (${searchCount}/${searchLimit}) for your plan this month. Please upgrade your plan to increase limits.`,
        },
        { status: 403 }
      );
    }

    console.log(
      `[LeadsDiscoverAPI] Cache miss or all seen: ${allCachedLeads.length} cached, ${unseenLeads.length} unseen, ${seenUrls.size} seen. Count: ${searchCount}/${searchLimit}. Triggering fresh discovery.`
    );

    // Deduct 1 quota credit
    await LeadsDiscoveryLog.create({
      userId: user._id,
      query,
      location: location || "",
    });

    const updatedRemaining = Math.max(0, searchLimit - (searchCount + 1));

    // Determine page offsets — if user has seen everything, fetch next page
    const pageOffsets = hasSeenEverything
      ? await getNextPageOffsets(normalizedQuery, location || "")
      : undefined;

    // Dispatch to the Inngest background worker. Only fall back to an inline run
    // if the dispatch itself fails — otherwise discovery would execute twice.
    try {
      await inngest.send({
        name: "leads/discover",
        data: {
          query,
          location: location || "",
          normalizedQuery,
          pageOffsets,
        },
      });
    } catch (inngestErr) {
      console.warn(
        "[LeadsDiscoverAPI] Inngest trigger failed — running inline fallback:",
        inngestErr
      );
      runDiscoveryPipeline(query, location || "", normalizedQuery, pageOffsets).catch(
        (err) => {
          console.error("[LeadsDiscoverAPI] Inline fallback failed:", err);
        }
      );
    }

    return Response.json({
      success: true,
      trigger: "background",
      cached: false,
      discoveryRemaining: updatedRemaining,
      discoveryLimit: searchLimit,
    });
  } catch (error) {
    console.error("[LeadsDiscoverAPI] POST error:", error);
    return Response.json(
      { error: "Failed to process discovery request" },
      { status: 500 }
    );
  }
}

// ── GET: Poll for discovered leads ──

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const location = searchParams.get("location") || "";

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    await dbConnect();

    // Check user plan protection
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isPaidUser =
      user.role === "admin" || (user.plan && user.plan !== "free");
    if (!isPaidUser) {
      return Response.json(
        {
          error:
            "Leads Discovery is a premium feature. Please upgrade your plan to access it.",
        },
        { status: 403 }
      );
    }

    // Use normalized query (query + location) to find leads. This MUST match the
    // key the POST/enrichment path saves under, otherwise the poll would fall
    // through to the raw-searchQuery lookup and surface leads from other cities.
    const normalizedQuery = normalizeQueryWithLocation(query, location);
    let leads = await JobLead.find({ normalizedQuery });

    // Backwards compatibility: also check raw searchQuery
    if (leads.length === 0) {
      leads = await JobLead.find({ searchQuery: query });
    }

    // Filter out user's already-seen leads so polling only returns new ones
    const seenDoc = await UserSeenJobs.findOne({
      userId: user._id,
      normalizedQuery,
    });
    const seenUrls = new Set<string>(seenDoc?.seenJobUrls || []);
    const unseenLeads = leads.filter((l) => !seenUrls.has(l.jobUrl));

    return Response.json({ success: true, leads: unseenLeads });
  } catch (error) {
    console.error("[LeadsDiscoverAPI] GET error:", error);
    return Response.json(
      { error: "Failed to fetch discovered leads" },
      { status: 500 }
    );
  }
}
