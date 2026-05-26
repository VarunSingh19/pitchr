/**
 * Shine.com Job Scraper — Production Grade
 *
 * Three-strategy pipeline (tried in order):
 *   1. JSON-LD structured data  (<script type="application/ld+json">)  — cleanest, schema.org/JobPosting
 *   2. Window state JSON        (window.__SHINE_STATE__ / __INITIAL_DATA__ variants)
 *   3. Cheerio DOM fallback     (multi-selector patterns for both old and new Shine markup)
 *
 * Anti-bot: Minimal (no Cloudflare WAF, no Akamai). Standard ScraperAPI sufficient.
 * Shine pages are fully server-side rendered — no JS execution required.
 *
 * URL pattern:
 *   /job-search/{query}-jobs-in-{location}/?q={query}&l={location}&page={n}
 */

import * as cheerio from "cheerio";
import type { DiscoveredJob } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────

const SHINE_BASE = "https://www.shine.com";
const TIMEOUT_MS = 10_000;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: SHINE_BASE + "/",
};

// ── Utilities ─────────────────────────────────────────────────────────────

function scraperUrl(target: string, key: string): string {
  return `https://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(target)}&country_code=in`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function stripHtml(s: string): string {
  return s.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function parseDate(s: string | undefined): Date {
  if (!s) return new Date();
  const lower = s.toLowerCase();
  const now = Date.now();
  if (lower.includes("today") || lower.includes("just")) return new Date(now);
  const d = lower.match(/(\d+)\s*day/);
  if (d) return new Date(now - +d[1] * 86_400_000);
  const w = lower.match(/(\d+)\s*week/);
  if (w) return new Date(now - +w[1] * 604_800_000);
  if (lower.includes("30+") || lower.includes("month"))
    return new Date(now - 30 * 86_400_000);
  // Try ISO date string (Shine sometimes embeds "2026-05-10" in JSON-LD)
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? new Date() : iso;
}

// ── Strategy 1: JSON-LD ────────────────────────────────────────────────────

function extractJsonLd(html: string, defaultLoc: string): DiscoveredJob[] {
  const jobs: DiscoveredJob[] = [];
  const re =
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    try {
      const raw = JSON.parse(m[1]);
      const items = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;

        const title = String(item.title ?? "").trim();
        const url = String(item.url ?? item["@id"] ?? "").trim();
        if (!title || !url) continue;

        const company = String(
          item.hiringOrganization?.name ?? "Unknown Company",
        ).trim();
        const location = String(
          item.jobLocation?.address?.addressLocality ??
            item.jobLocation?.address?.addressRegion ??
            defaultLoc ??
            "India",
        ).trim();

        jobs.push({
          source: "shine" as const,
          jobTitle: title,
          companyName: company,
          location,
          description: stripHtml(
            String(item.description ?? "View job on Shine.com"),
          ).slice(0, 500),
          postingDate: parseDate(String(item.datePosted ?? "")),
          jobUrl: url.startsWith("http") ? url : `${SHINE_BASE}${url}`,
        });
      }
    } catch {
      /* skip malformed JSON-LD blocks */
    }
  }
  return jobs;
}

// ── Strategy 2: Window State JSON ─────────────────────────────────────────

function extractWindowState(html: string, defaultLoc: string): DiscoveredJob[] {
  // Shine sometimes embeds job data as: window.__INITIAL_DATA__ = {...};
  const patterns = [
    /window\.__INITIAL_DATA__\s*=\s*({[\s\S]+?});\s*(?:window|<\/script>)/,
    /window\.__SHINE_STATE__\s*=\s*({[\s\S]+?});\s*(?:window|<\/script>)/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    try {
      const data = JSON.parse(m[1]);
      // Try known paths into the state tree
      const listings: any[] =
        data?.jobList?.jobs ?? data?.results?.jobs ?? data?.jobResults ?? [];
      if (!listings.length) continue;

      return listings
        .filter((j) => j.jobId || j.id)
        .map((j) => ({
          source: "shine" as const,
          jobTitle: String(j.jobTitle ?? j.title ?? "").trim(),
          companyName: String(
            j.companyName ?? j.company ?? "Unknown Company",
          ).trim(),
          location: String(
            j.location ?? j.city ?? defaultLoc ?? "India",
          ).trim(),
          description: stripHtml(
            String(j.jobDescription ?? j.description ?? "View on Shine"),
          ).slice(0, 500),
          postingDate: parseDate(String(j.postedOn ?? j.createdAt ?? "")),
          jobUrl: j.jobUrl
            ? j.jobUrl.startsWith("http")
              ? j.jobUrl
              : `${SHINE_BASE}${j.jobUrl}`
            : `${SHINE_BASE}/job-search/detail/${j.jobId ?? j.id}`,
        }));
    } catch {
      continue;
    }
  }
  return [];
}

// ── Strategy 3: Cheerio DOM ────────────────────────────────────────────────

function parseDom(html: string, defaultLoc: string): DiscoveredJob[] {
  const $ = cheerio.load(html);
  const jobs: DiscoveredJob[] = [];

  // Shine has redesigned their card markup a few times — try multiple containers
  const CARD_SELECTORS = [
    "div.jobCard",
    "article.jobCard",
    "div[class*='job-card']",
    "li.jobListing",
    "div[class*='joblist']",
    "div[class*='job_list']",
    "div[class*='jobItem']",
  ];

  let $cards = $([]) as ReturnType<typeof $>;
  for (const sel of CARD_SELECTORS) {
    const found = $(sel);
    if (found.length > 0) {
      $cards = found;
      break;
    }
  }

  // Last-resort: collect all job detail links and build minimal records
  if (!$cards.length) {
    $("a[href*='/job-search/detail/']").each((_i, el) => {
      const $a = $(el);
      const href = $a.attr("href") ?? "";
      const title = $a.text().trim();
      if (title && href) {
        jobs.push({
          source: "shine" as const,
          jobTitle: title,
          companyName: "Unknown Company",
          location: defaultLoc || "India",
          description: "View job on Shine.com",
          postingDate: new Date(),
          jobUrl: href.startsWith("http") ? href : `${SHINE_BASE}${href}`,
        });
      }
    });
    return jobs;
  }

  $cards.each((_i, el) => {
    const $el = $(el);

    // Title + URL
    const titleEl = $el
      .find(
        "h2.jobCard__title a, h3 a, a[href*='/job-search/detail/'], a[class*='title'], h2 a",
      )
      .first();
    const title = titleEl.text().trim();
    const href = titleEl.attr("href") ?? "";
    if (!title || !href) return;
    const jobUrl = href.startsWith("http") ? href : `${SHINE_BASE}${href}`;

    // Company
    const company =
      $el
        .find(
          "span.jobCard__company, a.comp-name, span[class*='company'], div[class*='company'] a, p[class*='company']",
        )
        .first()
        .text()
        .trim() || "Unknown Company";

    // Location
    const location =
      $el
        .find(
          "span.jobCard__location, span[class*='location'], div[class*='location'] span, li[class*='location']",
        )
        .first()
        .text()
        .trim() ||
      defaultLoc ||
      "India";

    // Description
    const description =
      $el
        .find(
          "p.jobCard__description, div[class*='description'], p[class*='desc'], span[class*='summary']",
        )
        .first()
        .text()
        .trim() || "View job on Shine.com";

    // Posted date
    const dateText = $el
      .find(
        "span.jobCard__posted, span[class*='posted'], div[class*='date'], time",
      )
      .first()
      .text()
      .trim();

    jobs.push({
      source: "shine" as const,
      jobTitle: title,
      companyName: company,
      location,
      description: stripHtml(description).slice(0, 500),
      postingDate: parseDate(dateText),
      jobUrl,
    });
  });

  return jobs;
}

// ── Main Export ────────────────────────────────────────────────────────────

export async function scrapeShineJobs(
  query: string,
  location: string,
  page = 1,
): Promise<DiscoveredJob[]> {
  const apiKey = process.env.SCRAPER_API_KEY;
  const qSlug = slugify(query);
  const locSlug = slugify(location);

  const target = locSlug
    ? `${SHINE_BASE}/job-search/${qSlug}-jobs-in-${locSlug}/?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&page=${page}`
    : `${SHINE_BASE}/job-search/${qSlug}-jobs/?q=${encodeURIComponent(query)}&page=${page}`;

  const fetchUrl = apiKey ? scraperUrl(target, apiKey) : target;

  try {
    const res = await fetch(fetchUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[Shine] HTTP ${res.status} for "${query}"`);
      return [];
    }

    const html = await res.text();

    // Strategy 1: JSON-LD (cleanest — schema.org structured data)
    const jsonLdJobs = extractJsonLd(html, location);
    if (jsonLdJobs.length > 0) {
      console.log(`[Shine] JSON-LD ✓ — ${jsonLdJobs.length} jobs`);
      return jsonLdJobs;
    }

    // Strategy 2: Window state JSON
    const stateJobs = extractWindowState(html, location);
    if (stateJobs.length > 0) {
      console.log(`[Shine] Window state ✓ — ${stateJobs.length} jobs`);
      return stateJobs;
    }

    // Strategy 3: DOM
    const domJobs = parseDom(html, location);
    if (domJobs.length > 0) {
      console.log(`[Shine] DOM ✓ — ${domJobs.length} jobs`);
      return domJobs;
    }

    console.warn(`[Shine] No jobs found for "${query}" in "${location}"`);
    return [];
  } catch (err) {
    console.error(`[Shine] Error for "${query}":`, (err as Error).message);
    return [];
  }
}
