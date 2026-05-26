/**
 * Job Discovery — Unified Multi-Source Pipeline
 *
 * Sources fetched in parallel:
 *   GLOBAL  : Adzuna API, Jooble API, Indeed (ScraperAPI + render=true)
 *   INDIA   : Naukri (3-strategy), Shine (3-strategy), Internshala (4-strategy, jobs+internships)
 *
 * India sources are only called when the location string contains an Indian
 * city / country name — or when no location is given (product default = India).
 *
 * Key fixes vs previous version:
 *   - Indeed mosaic JSON: brace-counter parser (was a non-greedy regex that broke
 *     on any `};` inside string values inside the JSON payload)
 *   - Indeed: ScraperAPI render=true (headless Chrome) + country_code routing
 *   - Indeed: __NEXT_DATA__ added as a third fallback before DOM regex
 *   - Result cap: 50 (was 20)
 *   - Deduplication: URL + (company + title) compound key to catch cross-source duplicates
 */

import type { DiscoveredJob } from "@/lib/types";
import { scrapeNaukriJobs }     from "@/lib/services/scrapers/naukri";
import { scrapeShineJobs }      from "@/lib/services/scrapers/shine";
import { scrapeInternshalaJobs } from "@/lib/services/scrapers/internshala";

// ── India Location Detection ──────────────────────────────────────────────
// Exported so route.ts can use the same logic for CacheQueryMeta source tracking.

const INDIA_KEYWORDS = new Set([
  "india", "mumbai", "bangalore", "bengaluru", "delhi", "new delhi", "noida",
  "gurugram", "gurgaon", "pune", "hyderabad", "chennai", "kolkata", "ahmedabad",
  "surat", "jaipur", "lucknow", "kochi", "thiruvananthapuram", "chandigarh",
  "indore", "bhopal", "nagpur", "visakhapatnam", "vadodara", "coimbatore",
  "agra", "patna", "ranchi", "bhubaneswar", "guwahati", "dehradun", "faridabad",
  "malad", "andheri", "thane", "navi mumbai", "powai", "bandra", "goregaon",
  "whitefield", "electronic city", "hsr layout", "koramangala", "hitech city",
  "cyberabad", "sector 62", "sector 44", "udyog vihar",
]);

export function isIndiaLocation(location: string): boolean {
  if (!location || location.trim() === "") return true; // no location = assume India (product default)
  const lower = location.toLowerCase();
  for (const kw of INDIA_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

// ── Page Offsets ──────────────────────────────────────────────────────────

export interface PageOffsets {
  adzuna:      number;
  jooble:      number;
  indeed:      number;
  naukri:      number;
  shine:       number;
  internshala: number;
}

// ── Adzuna ────────────────────────────────────────────────────────────────

export async function fetchJobsFromAdzuna(
  query: string,
  location: string,
  page = 1
): Promise<DiscoveredJob[]> {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log("[Adzuna] Credentials missing, skipping.");
    return [];
  }

  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&content-type=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);

    const data = await res.json();
    return (data.results ?? []).map((job: any) => ({
      source: "adzuna" as const,
      jobTitle:     String(job.title               ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      companyName:  String(job.company?.display_name ?? "Unknown Company").trim(),
      location:     String(job.location?.display_name ?? location).trim(),
      description:  String(job.description          ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      postingDate:  job.created ? new Date(job.created) : new Date(),
      jobUrl:       String(job.redirect_url          ?? ""),
    }));
  } catch (err) {
    console.error("[Adzuna] Error:", err);
    return [];
  }
}

// ── Jooble ────────────────────────────────────────────────────────────────

export async function fetchJobsFromJooble(
  query: string,
  location: string,
  page = 1
): Promise<DiscoveredJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    console.log("[Jooble] API key missing, skipping.");
    return [];
  }

  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: query, location, page }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Jooble HTTP ${res.status}`);

    const data = await res.json();
    return (data.jobs ?? []).map((job: any) => ({
      source: "jooble" as const,
      jobTitle:    String(job.title    ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      companyName: String(job.company  ?? "Unknown Company").trim(),
      location:    String(job.location ?? location).trim(),
      description: String(job.snippet  ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      postingDate: job.updated ? new Date(job.updated) : new Date(),
      jobUrl:      String(job.link     ?? ""),
    }));
  } catch (err) {
    console.error("[Jooble] Error:", err);
    return [];
  }
}

// ── Indeed ────────────────────────────────────────────────────────────────

/**
 * Brace-counting JSON extractor — replaces the old non-greedy regex
 * /({[\s\S]+?});/ which broke whenever `};` appeared inside a JSON string value.
 *
 * Correctly handles nested braces and escaped characters.
 */
function extractBracedJson(html: string, anchor: string): any | null {
  const anchorIdx = html.indexOf(anchor);
  if (anchorIdx === -1) return null;

  const eqIdx = html.indexOf("=", anchorIdx + anchor.length);
  if (eqIdx === -1) return null;

  const braceStart = html.indexOf("{", eqIdx);
  if (braceStart === -1) return null;

  let depth      = 0;
  let inString   = false;
  let escapeNext = false;

  for (let i = braceStart; i < html.length; i++) {
    const c = html[i];
    if (escapeNext)             { escapeNext = false; continue; }
    if (c === "\\")             { escapeNext = true;  continue; }
    if (c === '"' && !escapeNext) { inString = !inString; continue; }
    if (inString)               continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(braceStart, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

export async function fetchJobsFromIndeedScraper(
  query: string,
  location: string,
  page = 1
): Promise<DiscoveredJob[]> {
  const scraperApiKey = process.env.SCRAPER_API_KEY;

  const isIndia = isIndiaLocation(location);
  const host    = isIndia ? "in.indeed.com" : "www.indeed.com";
  const country = isIndia ? "in" : "us";
  const start   = (page - 1) * 10;
  const searchUrl = `https://${host}/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&start=${start}`;

  // render=true → ScraperAPI spins up a headless Chrome instance.
  // This resolves ~30-40% of requests that previously returned a Cloudflare
  // challenge page or a JS-gated shell with no mosaic JSON.
  const fetchUrl = scraperApiKey
    ? `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}&render=true&country_code=${country}`
    : searchUrl;

  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(20_000), // render=true needs more time
    });

    if (!res.ok) throw new Error(`Indeed HTTP ${res.status}`);
    const html = await res.text();
    const jobs: DiscoveredJob[] = [];

    // ── Approach 1: window.mosaic providerData (brace-counter — production safe) ──
    const mosaicData = extractBracedJson(html, 'providerData["mosaic-provider-jobcards"]');
    if (mosaicData) {
      const results: any[] =
        mosaicData?.metaData?.mosaicProviderJobCardsModel?.results ??
        mosaicData?.results ??
        [];

      for (const r of results) {
        if (!r.jobkey) continue;
        jobs.push({
          source: "indeed" as const,
          jobTitle:    String(r.title ?? r.normTitle ?? "").trim(),
          companyName: String(r.company ?? r.companyRatingModel?.companyName ?? "Unknown Company").trim(),
          location:    String(r.formattedLocation ?? r.location ?? location).trim(),
          description: String(r.snippet ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
          postingDate: r.createDate ? new Date(r.createDate) : new Date(),
          jobUrl:      `https://${host}/viewjob?jk=${r.jobkey}`,
        });
      }
      if (jobs.length > 0) return jobs;
    }

    // ── Approach 2: __NEXT_DATA__ JSON (newer Indeed page variants) ───────
    if (jobs.length === 0) {
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const results: any[] = nextData?.props?.pageProps?.jobResults?.results ?? [];
          for (const r of results) {
            if (!r.jobkey) continue;
            jobs.push({
              source: "indeed" as const,
              jobTitle:    String(r.title ?? "").trim(),
              companyName: String(r.company ?? "Unknown Company").trim(),
              location:    String(r.formattedLocation ?? location).trim(),
              description: String(r.snippet ?? "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
              postingDate: r.createDate ? new Date(r.createDate) : new Date(),
              jobUrl:      `https://${host}/viewjob?jk=${r.jobkey}`,
            });
          }
        } catch { /* silent */ }
      }
    }

    // ── Approach 3: RegExp DOM extraction (CSS class selectors as last resort) ──
    if (jobs.length === 0) {
      const cellRegex = /<td[^>]*class="[^"]*resultContent[^"]*"[^>]*>([\s\S]+?)<\/td>/g;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(html)) !== null) {
        const cellHtml = cellMatch[1];

        const titleMatch = cellHtml.match(/href="\/rc\/clk\?jk=([^"&]+)/) ??
                           cellHtml.match(/data-jk="([^"]+)"/);
        const textMatch  = cellHtml.match(/<span[^>]*title="([^"]+)"/) ??
                           cellHtml.match(/aria-label="([^"]+)"/);
        if (!titleMatch || !textMatch) continue;

        const jk      = titleMatch[1];
        const title   = textMatch[1].trim();
        const company = (
          cellHtml.match(/data-testid="company-name"[^>]*>([^<]+)/) ??
          cellHtml.match(/class="[^"]*companyName[^"]*"[^>]*>([^<]+)/)
        )?.[1]?.replace(/<\/?[^>]+(>|$)/g, "").trim() ?? "Unknown Company";
        const loc     = (
          cellHtml.match(/data-testid="text-location"[^>]*>([^<]+)/) ??
          cellHtml.match(/class="[^"]*companyLocation[^"]*"[^>]*>([^<]+)/)
        )?.[1]?.replace(/<\/?[^>]+(>|$)/g, "").trim() ?? location;

        jobs.push({
          source: "indeed" as const,
          jobTitle: title,
          companyName: company,
          location: loc,
          description: "View job listing details on indeed.com",
          postingDate: new Date(),
          jobUrl: `https://${host}/viewjob?jk=${jk}`,
        });
      }
    }

    return jobs;
  } catch (err) {
    console.error("[Indeed] Scraper error:", err);
    return [];
  }
}

// ── Unified Search ────────────────────────────────────────────────────────

export async function searchAllJobBoards(
  query: string,
  location: string,
  pageOffsets?: Partial<PageOffsets>
): Promise<DiscoveredJob[]> {
  const adzunaPage      = pageOffsets?.adzuna      ?? 1;
  const jooblePage      = pageOffsets?.jooble       ?? 1;
  const indeedPage      = pageOffsets?.indeed       ?? 1;
  const naukriPage      = pageOffsets?.naukri       ?? 1;
  const shinePage       = pageOffsets?.shine        ?? 1;
  const internshalaPage = pageOffsets?.internshala  ?? 1;

  const india = isIndiaLocation(location);

  console.log(
    `[JobDiscovery] Query="${query}" Location="${location}" India=${india} ` +
    `Pages: adzuna=${adzunaPage} jooble=${jooblePage} indeed=${indeedPage}` +
    (india ? ` naukri=${naukriPage} shine=${shinePage} internshala=${internshalaPage}` : "")
  );

  // Always-on global sources + India sources when applicable
  const fetches: Promise<DiscoveredJob[]>[] = [
    fetchJobsFromAdzuna(query, location, adzunaPage),
    fetchJobsFromJooble(query, location, jooblePage),
    fetchJobsFromIndeedScraper(query, location, indeedPage),
    ...(india
      ? [
          scrapeNaukriJobs(query, location, naukriPage),
          scrapeShineJobs(query, location, shinePage),
          scrapeInternshalaJobs(query, location, internshalaPage),
        ]
      : []),
  ];

  const settled = await Promise.allSettled(fetches);

  const [adzunaJobs, joobleJobs, indeedJobs, naukriJobs, shineJobs, internshalaJobs] = settled.map(
    (r) => (r.status === "fulfilled" ? r.value : [])
  );

  // Order: India-specific sources first (most targeted for Mumbai/India queries),
  // then global aggregators
  const allJobs = [
    ...(indeedJobs       ?? []),
    ...(naukriJobs       ?? []),
    ...(internshalaJobs  ?? []),
    ...(shineJobs        ?? []),
    ...(joobleJobs       ?? []),
    ...(adzunaJobs       ?? []),
  ];

  // Deduplication: primary by URL, secondary by (company + title) to remove
  // the same posting found on multiple boards
  const seenUrls     = new Set<string>();
  const seenCompound = new Set<string>();
  const unique: DiscoveredJob[] = [];

  for (const job of allJobs) {
    if (!job.jobUrl) continue;

    if (seenUrls.has(job.jobUrl)) continue;
    seenUrls.add(job.jobUrl);

    const compound = `${job.companyName.toLowerCase()}|${job.jobTitle.toLowerCase()}`;
    if (seenCompound.has(compound)) continue;
    seenCompound.add(compound);

    unique.push(job);
  }

  console.log(`[JobDiscovery] Total unique results: ${unique.length}`);
  return unique.slice(0, 100); // cap: 100 — gives more candidates after email filter
}
