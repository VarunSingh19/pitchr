import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { inngest } from "@/inngest/client";
import JobLead from "@/models/JobLead";
import User from "@/models/User";
import LeadsDiscoveryLog from "@/models/LeadsDiscoveryLog";
import UserSeenJobs from "@/models/UserSeenJobs";
import CacheQueryMeta from "@/models/CacheQueryMeta";
import { searchAllJobBoards, type PageOffsets } from "@/lib/services/job-discovery";
import { resolveDomain } from "@/lib/services/domain-resolver";
import { scrapeEmailsFromWebsite, verifyEmail } from "@/lib/services/email-scraper";
import { normalizeQueryWithLocation } from "@/lib/services/query-normalize";

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

async function enrichAndSaveJob(job: any, query: string, normalizedQuery: string) {
  let websiteUrl = null;
  let contactEmail = null;
  let emailSource = null;
  let emailVerified = false;

  try {
    websiteUrl = await resolveDomain(job.companyName);
    if (websiteUrl) {
      const scrapeRes = await scrapeEmailsFromWebsite(websiteUrl);
      if (scrapeRes.emails && scrapeRes.emails.length > 0) {
        for (const email of scrapeRes.emails) {
          const isVerified = await verifyEmail(email);
          if (isVerified) {
            contactEmail = email;
            emailSource = scrapeRes.source;
            emailVerified = true;
            break;
          }
        }
        if (!contactEmail) {
          contactEmail = scrapeRes.emails[0];
          emailSource = scrapeRes.source;
          emailVerified = false;
        }
      }
    }
  } catch (err) {
    console.error(`[BackgroundDiscovery] Error enriching job for ${job.companyName}:`, err);
  }

  const payload = {
    searchQuery: query,
    normalizedQuery,
    source: job.source,
    jobTitle: job.jobTitle,
    companyName: job.companyName,
    website: websiteUrl,
    location: job.location,
    description: job.description,
    contactEmail,
    emailSource,
    emailVerified,
    postingDate: job.postingDate || new Date(),
    status: "discovered" as const,
  };

  try {
    await JobLead.findOneAndUpdate(
      { jobUrl: job.jobUrl },
      { $set: payload },
      { upsert: true, returnDocument: "after" }
    );
  } catch (dbErr) {
    console.error(`[BackgroundDiscovery] Error saving JobLead for ${job.companyName}:`, dbErr);
  }
}

async function runDiscoveryInBackground(
  query: string,
  location: string,
  normalizedQuery: string,
  pageOffsets?: PageOffsets
) {
  try {
    await dbConnect();
    console.log(
      `[BackgroundDiscovery] Starting background search for "${query}" in "${location}" (pages: ${JSON.stringify(pageOffsets)})...`
    );
    const jobs = await searchAllJobBoards(query, location, pageOffsets);
    console.log(`[BackgroundDiscovery] Scraper found ${jobs.length} total jobs.`);

    if (!jobs || jobs.length === 0) {
      console.log(`[BackgroundDiscovery] No jobs found for "${query}".`);
      return;
    }

    const batchSize = 5;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(`[BackgroundDiscovery] Sourcing batch ${Math.floor(i / batchSize) + 1}...`);
      await Promise.all(batch.map((job) => enrichAndSaveJob(job, query, normalizedQuery)));
    }

    // Update CacheQueryMeta with the page offsets used
    const sources: Array<"adzuna" | "jooble" | "indeed"> = ["adzuna", "jooble", "indeed"];
    for (const source of sources) {
      const pageUsed = pageOffsets?.[source] ?? 1;
      await CacheQueryMeta.findOneAndUpdate(
        { normalizedQuery, source },
        {
          $set: { lastPageFetched: pageUsed, lastFetchedAt: new Date() },
          $inc: { totalCachedCount: jobs.filter((j) => j.source === source).length },
        },
        { upsert: true }
      );
    }

    console.log(`[BackgroundDiscovery] Finished enrichment for "${query}".`);
  } catch (err) {
    console.error(`[BackgroundDiscovery] Background process failed:`, err);
  }
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
async function getNextPageOffsets(normalizedQuery: string): Promise<PageOffsets> {
  const metas = await CacheQueryMeta.find({ normalizedQuery });
  const offsets: PageOffsets = { adzuna: 1, jooble: 1, indeed: 1 };

  for (const meta of metas) {
    const source = meta.source as keyof PageOffsets;
    if (source in offsets) {
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

      const nextOffsets = await getNextPageOffsets(normalizedQuery);

      // Trigger Inngest background job
      try {
        await inngest.send({
          name: "leads/discover",
          data: { query, location: location || "", pageOffsets: nextOffsets },
        });
      } catch (inngestErr) {
        console.warn("[LeadsDiscoverAPI] Inngest trigger failed:", inngestErr);
      }

      // Failsafe: local background thread
      runDiscoveryInBackground(query, location || "", normalizedQuery, nextOffsets).catch((err) => {
        console.error("[LeadsDiscoverAPI] Failsafe background execution failed:", err);
      });

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

      // Mark these as seen
      const newlySeen = unseenLeads.map((l) => l.jobUrl);
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
      ? await getNextPageOffsets(normalizedQuery)
      : undefined;

    // Trigger Inngest background job
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
        "[LeadsDiscoverAPI] Inngest trigger failed (normal in dev if local dev server is offline):",
        inngestErr
      );
    }

    // Failsafe: local background thread
    runDiscoveryInBackground(query, location || "", normalizedQuery, pageOffsets).catch(
      (err) => {
        console.error("[LeadsDiscoverAPI] Failsafe background execution failed:", err);
      }
    );

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

    // Use normalized query to find leads (with backwards-compatible fallback)
    const normalizedQuery = normalizeQueryWithLocation(query, "");
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
