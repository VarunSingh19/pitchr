/**
 * Shared lead-discovery enrichment pipeline.
 *
 * This is the single source of truth for turning raw scraped job postings into
 * enriched JobLead records (domain + contact email) and advancing the query
 * page cache. BOTH the API route's local fallback and the Inngest background
 * worker call into here, so the two paths can never drift apart again.
 */
import { dbConnect } from "@/lib/db";
import JobLead from "@/models/JobLead";
import CacheQueryMeta, { type CacheSource } from "@/models/CacheQueryMeta";
import { searchAllJobBoards, isIndiaLocation, type PageOffsets } from "@/lib/services/job-discovery";
import { resolveDomain } from "@/lib/services/domain-resolver";
import { scrapeEmailsFromWebsite, verifyEmail } from "@/lib/services/email-scraper";

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

export function isLikelyJobTitle(name: string): boolean {
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
export interface EnrichmentResult {
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
export async function enrichAndSaveJob(
  job: any,
  query: string,
  normalizedQuery: string,
  companyCache: Map<string, EnrichmentResult>
) {
  // Skip domain resolution for entries whose "company name" is actually a job
  // category label (Internshala emits these as companyName on some pages).
  if (isLikelyJobTitle(job.companyName)) {
    console.log(`[Discovery] Skipping — "${job.companyName}" looks like a job title`);
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
    console.log(`[Discovery] Cache hit for "${job.companyName}" — reusing enrichment`);
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
      console.error(`[Discovery] Error enriching "${job.companyName}":`, err);
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
    console.error(`[Discovery] Error saving "${job.companyName}":`, dbErr);
  }
}

/**
 * Advance the per-source page cache for a query after a discovery run.
 */
export async function updateCacheQueryMeta(
  normalizedQuery: string,
  location: string,
  jobs: any[],
  pageOffsets?: PageOffsets
) {
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
    // Set the ACTUAL deduped count of cached leads for this query+source rather
    // than $inc-ing each run's batch size — the latter double-counts every time
    // the same page is re-fetched (jobUrls are upserted, not duplicated).
    const cachedCount = await JobLead.countDocuments({ normalizedQuery, source });
    await CacheQueryMeta.findOneAndUpdate(
      { normalizedQuery, source },
      {
        $set: { lastPageFetched: pageUsed, lastFetchedAt: new Date(), totalCachedCount: cachedCount },
      },
      { upsert: true }
    );
  }
}

/**
 * Full end-to-end discovery run: scrape → enrich → persist → advance cache.
 * Used by the API route as an inline fallback when the Inngest dispatch fails.
 */
export async function runDiscoveryPipeline(
  query: string,
  location: string,
  normalizedQuery: string,
  pageOffsets?: PageOffsets
) {
  try {
    await dbConnect();
    console.log(
      `[Discovery] Starting run for "${query}" in "${location}" (pages: ${JSON.stringify(pageOffsets)})...`
    );
    const jobs = await searchAllJobBoards(query, location, pageOffsets);
    console.log(`[Discovery] Scraper found ${jobs.length} total jobs.`);

    if (!jobs || jobs.length === 0) {
      console.log(`[Discovery] No jobs found for "${query}".`);
      return;
    }

    // Per-run enrichment cache: same company → one API call, results reused for
    // all its job postings. Mastercard appearing 9× becomes 1 real call + 8 cache hits.
    const companyCache = new Map<string, EnrichmentResult>();

    const batchSize = 10;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(`[Discovery] Sourcing batch ${Math.floor(i / batchSize) + 1} (${batch.length} jobs)...`);
      await Promise.all(batch.map((job) => enrichAndSaveJob(job, query, normalizedQuery, companyCache)));
    }

    await updateCacheQueryMeta(normalizedQuery, location, jobs, pageOffsets);

    console.log(`[Discovery] Finished enrichment for "${query}".`);
  } catch (err) {
    console.error(`[Discovery] Run failed:`, err);
  }
}
