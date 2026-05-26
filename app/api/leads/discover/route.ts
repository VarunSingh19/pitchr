import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { inngest } from "@/inngest/client";
import JobLead from "@/models/JobLead";
import User from "@/models/User";
import LeadsDiscoveryLog from "@/models/LeadsDiscoveryLog";
import UserSeenJobs from "@/models/UserSeenJobs";
import CacheQueryMeta from "@/models/CacheQueryMeta";
import { searchAllJobBoards, isIndiaLocation, type PageOffsets } from "@/lib/services/job-discovery";
import { resolveDomain } from "@/lib/services/domain-resolver";
import { scrapeEmailsFromWebsite, verifyEmail } from "@/lib/services/email-scraper";
import { normalizeQueryWithLocation } from "@/lib/services/query-normalize";
import type { CacheSource } from "@/models/CacheQueryMeta";

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

// ── Generic-job-title guard ────────────────────────────────────────────────
// Internshala (and occasionally other scrapers) sometimes emit the job profile
// category as the companyName (e.g. "Social Media Marketing", "IT Recruitment").
// Resolving a domain for such a string produces garbage, wastes ScraperAPI
// credits, and plants bogus emails in the DB.

// Multi-word check: if 70%+ of non-trivial words are generic job-function words
const GENERIC_JOB_WORDS = new Set([
  // Core functions
  "social", "media", "marketing", "content", "writing", "writer", "video",
  "editing", "graphic", "design", "designer", "development", "developer",
  "human", "resources", "sales", "finance", "financial", "accounting",
  "bookkeeping", "operations", "management", "manager", "photography",
  "photographer", "architecture", "architect", "research", "analyst",
  "data", "entry", "digital", "strategy", "strategic", "coordinator",
  "communications", "business", "consulting", "consultant", "production",
  "journalism", "mass", "visual", "brand", "branding", "export",
  "merchandising", "recruitment", "recruiter", "talent", "acquisition",
  "law", "legal", "executive", "admin", "administration", "office",
  "technical", "technology", "seo", "designing", "modeling", "testing",
  "programming", "coding", "animation", "illustration", "videography",
  "copywriting", "community", "manager", "assistant", "officer",
  "specialist", "associate", "director", "engineer", "engineering",
  "services", "service", "servicing", "partnership", "partnerships",
  "client", "customer", "support", "care", "success", "experience",
  "ios", "android", "mobile", "web", "frontend", "backend", "fullstack",
  "cloud", "devops", "qa", "it", "ml", "ai", "hr", "pr", "seo", "sem",
  "fashion", "apparel", "editorial", "influencer", "creator", "podcast",
  // Filler words (don't count toward the company-name score)
  "and", "or", "the", "of", "in", "for", "with", "based", "cum",
]);

// Single-word strings that are definitely job categories, not company names
const SINGLE_WORD_JOB_TITLES = new Set([
  "photography", "accounting", "marketing", "writing", "coding", "programming",
  "designing", "videography", "copywriting", "architecture", "editing",
  "modeling", "animation", "illustration", "recruitment", "consulting",
  "management", "operations", "communications", "engineering",
]);

function isLikelyJobTitle(name: string): boolean {
  if (!name || name.trim() === "" || name === "Unknown Company") return true;

  // Has a real company-entity suffix → definitely a company, not a job title
  if (/\b(inc\.?|ltd\.?|llc\.?|corp\.?|pvt\.?|gmbh|plc|s\.a\.|s\.r\.l\.)\b/i.test(name)) return false;

  const cleaned = name.replace(/\(.*?\)/g, "").trim();
  const words   = cleaned.toLowerCase().split(/[\s,&/|+\-]+/).filter(Boolean);
  if (words.length === 0) return true;

  // Single-word: allow real company names but block obvious job categories
  if (words.length === 1) return SINGLE_WORD_JOB_TITLES.has(words[0]);

  // Multi-word: if 70%+ of words are generic job-function words, it's a title
  const genericCount = words.filter((w) => GENERIC_JOB_WORDS.has(w)).length;
  return genericCount / words.length >= 0.70;
}

// ── Enrichment result cache type ──────────────────────────────────────────
interface EnrichmentResult {
  website: string | null;
  contactEmail: string | null;
  emailSource: string | null;
  emailVerified: boolean;
}

/**
 * Enrich a single job posting with domain + contact email, then upsert to DB.
 *
 * @param companyCache  Per-run Map keyed by normalised company name.
 *   When two (or more) postings from the SAME company are processed in the
 *   same discovery run (e.g. Mastercard appears 9 times), only the first call
 *   does real I/O — subsequent calls reuse the cached result instantly.
 *   This cuts API usage and speeds up enrichment significantly.
 */
async function enrichAndSaveJob(
  job: any,
  query: string,
  normalizedQuery: string,
  companyCache: Map<string, EnrichmentResult>
) {
  // Skip domain resolution for entries whose "company name" is actually a job
  // category label (Internshala emits these as companyName on some pages).
  if (isLikelyJobTitle(job.companyName)) {
    console.log(`[BackgroundDiscovery] Skipping — "${job.companyName}" looks like a job title`);
    // Still save the record (without enrichment) so it exists in DB for cache hits
    await JobLead.findOneAndUpdate(
      { jobUrl: job.jobUrl },
      { $set: {
          searchQuery: query, normalizedQuery, source: job.source,
          jobTitle: job.jobTitle, companyName: job.companyName,
          website: null, location: job.location, description: job.description,
          contactEmail: null, emailSource: null, emailVerified: false,
          postingDate: job.postingDate || new Date(), status: "discovered" as const,
        }
      },
      { upsert: true }
    ).catch(() => {});
    return;
  }

  const cacheKey = job.companyName.toLowerCase().trim();

  let enrichment: EnrichmentResult;

  if (companyCache.has(cacheKey)) {
    // Reuse enrichment from a previous job with the same company this run
    enrichment = companyCache.get(cacheKey)!;
    console.log(`[BackgroundDiscovery] Cache hit for "${job.companyName}" — reusing enrichment`);
  } else {
    // Fresh enrichment
    let websiteUrl: string | null    = null;
    let contactEmail: string | null  = null;
    let emailSource: string | null   = null;
    let emailVerified                = false;

    try {
      websiteUrl = await resolveDomain(job.companyName);
      if (websiteUrl) {
        const scrapeRes = await scrapeEmailsFromWebsite(websiteUrl);
        if (scrapeRes.emails && scrapeRes.emails.length > 0) {
          for (const email of scrapeRes.emails) {
            const isVerified = await verifyEmail(email);
            if (isVerified) {
              contactEmail = email;
              emailSource  = scrapeRes.source;
              emailVerified = true;
              break;
            }
          }
          if (!contactEmail) {
            contactEmail = scrapeRes.emails[0];
            emailSource  = scrapeRes.source;
            emailVerified = false;
          }
        }
      }
    } catch (err) {
      console.error(`[BackgroundDiscovery] Error enriching "${job.companyName}":`, err);
    }

    enrichment = { website: websiteUrl, contactEmail, emailSource, emailVerified };
    companyCache.set(cacheKey, enrichment);
  }

  const payload = {
    searchQuery: query,
    normalizedQuery,
    source: job.source,
    jobTitle: job.jobTitle,
    companyName: job.companyName,
    website: enrichment.website,
    location: job.location,
    description: job.description,
    contactEmail: enrichment.contactEmail,
    emailSource: enrichment.emailSource,
    emailVerified: enrichment.emailVerified,
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
    console.error(`[BackgroundDiscovery] Error saving "${job.companyName}":`, dbErr);
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

    // Per-run enrichment cache: same company → one API call, results reused for
    // all its job postings. Mastercard appearing 9× becomes 1 real call + 8 cache hits.
    const companyCache = new Map<string, EnrichmentResult>();

    const batchSize = 10;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(`[BackgroundDiscovery] Sourcing batch ${Math.floor(i / batchSize) + 1} (${batch.length} jobs)...`);
      await Promise.all(batch.map((job) => enrichAndSaveJob(job, query, normalizedQuery, companyCache)));
    }

    // Update CacheQueryMeta with the page offsets used.
    // Only track India sources when the location is actually India — prevents
    // stale page-advance entries from non-India searches polluting the cache.
    const india = isIndiaLocation(location);
    const baseSources: CacheSource[]  = ["adzuna", "jooble", "indeed"];
    const indiaSources: CacheSource[] = ["naukri", "shine", "internshala"];
    const sources: CacheSource[] = india
      ? [...baseSources, ...indiaSources]
      : baseSources;

    for (const source of sources) {
      const pageUsed = pageOffsets?.[source as keyof PageOffsets] ?? 1;
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
      ? await getNextPageOffsets(normalizedQuery, location || "")
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
