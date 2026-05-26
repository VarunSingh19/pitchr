/**
 * Internshala Job + Internship Scraper — Production Grade
 *
 * Four-strategy pipeline per page type; internships AND jobs fetched concurrently:
 *
 *   Strategy 1 — JSON-LD structured data (<script type="application/ld+json">)
 *                Works when Internshala injects schema.org/JobPosting blocks.
 *
 *   Strategy 2 — Embedded JSON in script tag (window.__INITIAL_STATE__ variants)
 *                The React app sometimes pre-hydrates with a serialised store.
 *
 *   Strategy 3 — Cheerio DOM with multi-pattern selector sets
 *                Covers both the legacy jQuery-era markup and the 2024+ React markup.
 *                Two full selector pattern sets tried in order, fallback to href scan.
 *
 *   Strategy 4 — AJAX POST endpoint (/internships/fetch-internships/ / /jobs/fetch-jobs-by-ajax/)
 *                Internshala's XHR pagination endpoint; returns an HTML fragment.
 *                Attempted only when the main HTML page returns 0 results.
 *
 * Why both internships AND jobs?
 *   Companies posting internships are actively scaling and highly receptive to
 *   developer outreach — they represent some of the best cold-email targets.
 *   Combining both pools gives roughly 2× more unique leads per query.
 *
 * Anti-bot: Cloudflare basic challenge (rarely triggered for standard GET requests).
 *   ScraperAPI standard mode (no render=true) is sufficient. country_code=in preferred.
 *
 * Rate limit: ~20 req/min per IP → ScraperAPI pool handles rotation.
 */

import * as cheerio from "cheerio";
import type { DiscoveredJob } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────

const BASE = "https://internshala.com";
const TIMEOUT_MS = 12_000;

const PAGE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: BASE + "/",
};

const AJAX_HEADERS: Record<string, string> = {
  ...PAGE_HEADERS,
  "X-Requested-With": "XMLHttpRequest",
  Accept: "text/html, */*; q=0.01",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

// Selector pattern sets for different Internshala markup generations
const INTERNSHIP_CARD_SELECTORS = [
  "div[id^='internship-item']", // legacy: id="internship-item-12345"
  "div.internship_meta", // legacy wrapper
  "div.individual_internship", // shared class (legacy)
  "div[data-internship_id]", // data attribute variant
  "div[class*='InternshipCard']", // React 2024+ variant
  "article[class*='internship']", // semantic markup variant
];

const JOB_CARD_SELECTORS = [
  "div[id^='job-internship-item']", // legacy: id="job-internship-item-67890"
  "div[id^='job-item']",
  "div.job_listing",
  "div[class*='JobCard']", // React 2024+ variant
  "article[class*='job']",
];

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
  if (
    lower.includes("today") ||
    lower.includes("just") ||
    lower.includes("new") ||
    lower.includes("activ")
  )
    return new Date(now);
  const h = lower.match(/(\d+)\s*hour/);
  if (h) return new Date(now - +h[1] * 3_600_000);
  const d = lower.match(/(\d+)\s*day/);
  if (d) return new Date(now - +d[1] * 86_400_000);
  const w = lower.match(/(\d+)\s*week/);
  if (w) return new Date(now - +w[1] * 604_800_000);
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? new Date() : iso;
}

// ── Strategy 1: JSON-LD ────────────────────────────────────────────────────

function extractJsonLd(html: string): DiscoveredJob[] {
  const jobs: DiscoveredJob[] = [];
  const re =
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    try {
      const raw = JSON.parse(m[1]);
      const items = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        // Internshala uses both "JobPosting" and custom types — be permissive
        if (!["JobPosting", "Internship", "Occupation"].includes(item["@type"]))
          continue;
        const title = String(item.title ?? item.name ?? "").trim();
        const url = String(item.url ?? item["@id"] ?? "").trim();
        if (!title || !url) continue;

        const company = String(
          item.hiringOrganization?.name ??
            item.employerName ??
            "Unknown Company",
        ).trim();
        const location = String(
          item.jobLocation?.address?.addressLocality ??
            item.jobLocation?.address?.addressRegion ??
            item.applicantLocationRequirements?.name ??
            "India",
        ).trim();

        jobs.push({
          source: "internshala" as const,
          jobTitle: title,
          companyName: company,
          location,
          description: stripHtml(
            String(item.description ?? "View on Internshala"),
          ).slice(0, 500),
          postingDate: item.datePosted ? new Date(item.datePosted) : new Date(),
          jobUrl: url.startsWith("http") ? url : `${BASE}${url}`,
        });
      }
    } catch {
      /* skip malformed blocks */
    }
  }
  return jobs;
}

// ── Strategy 2: Embedded Window State ─────────────────────────────────────

function extractWindowState(html: string, defaultLoc: string): DiscoveredJob[] {
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});\s*(?:window|<\/script>)/,
    /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?});\s*(?:window|<\/script>)/,
    /window\.ISData\s*=\s*({[\s\S]+?});\s*(?:window|<\/script>)/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    try {
      const data = JSON.parse(m[1]);
      const listings: any[] =
        data?.internships ??
        data?.jobs ??
        data?.props?.pageProps?.listings ??
        data?.results ??
        [];
      if (!listings.length) continue;

      return listings
        .filter((j) => j.id || j.internship_id || j.job_id)
        .map((j) => {
          const id = j.id ?? j.internship_id ?? j.job_id;
          const rel =
            j.job_url ?? j.internship_url ?? `/internship/detail/-${id}`;
          return {
            source: "internshala" as const,
            jobTitle: String(
              j.profile_name ?? j.title ?? j.job_title ?? "",
            ).trim(),
            companyName: String(
              j.company_name ?? j.employer_name ?? "Unknown Company",
            ).trim(),
            location: String(
              j.location_names?.join(", ") ?? j.city ?? defaultLoc ?? "India",
            ).trim(),
            description: stripHtml(
              String(
                j.about_company ??
                  j.description ??
                  j.job_description ??
                  "View on Internshala",
              ),
            ).slice(0, 500),
            postingDate: j.start_date ? new Date(j.start_date) : new Date(),
            jobUrl: rel.startsWith("http") ? rel : `${BASE}${rel}`,
          };
        });
    } catch {
      continue;
    }
  }
  return [];
}

// ── Strategy 3: Cheerio DOM ────────────────────────────────────────────────

/**
 * Parses a rendered Internshala listing page.
 * `isJob=false` → internship selectors; `isJob=true` → job selectors.
 * Falls back between pattern sets automatically.
 */
function parseDom(
  html: string,
  defaultLoc: string,
  isJob: boolean,
): DiscoveredJob[] {
  const $ = cheerio.load(html);
  const jobs: DiscoveredJob[] = [];

  const SELECTORS = isJob ? JOB_CARD_SELECTORS : INTERNSHIP_CARD_SELECTORS;

  let $cards = $([]) as ReturnType<typeof $>;
  for (const sel of SELECTORS) {
    const found = $(sel);
    if (found.length > 0) {
      $cards = found;
      break;
    }
  }

  // Absolute fallback — scan all links that lead to detail pages
  if (!$cards.length) {
    const linkPattern = isJob ? "/job-detail/" : "/internship/detail/";
    $(`a[href*="${linkPattern}"]`).each((_i, el) => {
      const $a = $(el);
      const href = $a.attr("href") ?? "";
      const title = $a.text().trim();
      if (!title || !href) return;

      const $parent = $a.closest("div, li, article");
      const company = $parent
        .find(
          "a.company-name, a.link_display_like_text, span.company-name, p.company-name",
        )
        .first()
        .text()
        .trim();

      jobs.push({
        source: "internshala" as const,
        jobTitle: title,
        companyName: company || "Unknown Company",
        location: defaultLoc || "India",
        description: `${isJob ? "Job" : "Internship"} opportunity at ${company || "this company"}`,
        postingDate: new Date(),
        jobUrl: href.startsWith("http") ? href : `${BASE}${href}`,
      });
    });
    return jobs;
  }

  $cards.each((_i, el) => {
    const $el = $(el);

    // ── Title + URL ───────────────────────────────────────────────────────
    // Prefer href-based matching — more stable than class names that change
    const linkSel = isJob ? "/job-detail/" : "/internship/detail/";
    let $titleLink = $el.find(`a[href*="${linkSel}"]`).first();
    if (!$titleLink.length) {
      $titleLink = $el
        .find("a.view_detail_button, a.job-title-href, h3 a, h2 a")
        .first();
    }
    const title = $titleLink.text().trim();
    const href = $titleLink.attr("href") ?? "";
    if (!title || !href) return;
    const jobUrl = href.startsWith("http") ? href : `${BASE}${href}`;

    // ── Company ───────────────────────────────────────────────────────────
    // Note: avoid re-selecting the title link (it's also an <a> tag)
    const company =
      $el
        .find(
          [
            "a.company-name",
            "a.link_display_like_text",
            "span.company-name",
            "p.company-name",
            "div[class*='company'] a",
            "h4 a",
          ].join(", "),
        )
        .first()
        .text()
        .trim() || "Unknown Company";

    // ── Location ──────────────────────────────────────────────────────────
    // Internshala can show multiple cities "Mumbai | Bangalore"
    const locParts = $el
      .find(
        [
          "span.location_link",
          "a.location-link",
          "div[class*='location'] span",
          "span[class*='location']",
          "div.other_detail_item span.location_link",
        ].join(", "),
      )
      .map((_i, loc) => $(loc).text().trim())
      .get()
      .filter(Boolean);
    const location = locParts.length
      ? locParts.join(", ")
      : defaultLoc || "India";

    // ── Description ───────────────────────────────────────────────────────
    const description =
      $el
        .find(
          [
            "p[class*='description']",
            "div[class*='internship_description']",
            "div[class*='job_description']",
            "p.text-muted",
            "p.internship-other-details-container",
          ].join(", "),
        )
        .first()
        .text()
        .trim() || `${isJob ? "Job" : "Internship"} at ${company}`;

    // ── Date (from status indicator) ──────────────────────────────────────
    const dateText = $el
      .find(
        [
          ".status-info span",
          "div[class*='posted']",
          "span[class*='status']",
          "div.status_tags",
          "span[class*='activelyHiring']",
          "time",
        ].join(", "),
      )
      .first()
      .text()
      .trim();

    jobs.push({
      source: "internshala" as const,
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

// ── Strategy 4: AJAX POST Endpoint ────────────────────────────────────────
// Internshala's XHR pagination handler. Returns an HTML fragment of cards.
// Tried only as last resort when the full HTML page yields 0 results.

async function tryAjax(
  query: string,
  location: string,
  page: number,
  isJob: boolean,
): Promise<DiscoveredJob[]> {
  const endpoint = isJob
    ? `${BASE}/jobs/fetch-jobs-by-ajax/`
    : `${BASE}/internships/fetch-internships/`;

  const body = new URLSearchParams({
    search_type: "by_keyword",
    keyword: query,
    location: location || "india",
    page: String(page),
    session_limit: "12",
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: AJAX_HEADERS,
      body: body.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok || res.headers.get("content-type")?.includes("json")) return [];
    const html = await res.text();
    if (html.length < 200) return []; // suspiciously short → probably an error page
    const jobs = parseDom(html, location, isJob);
    if (jobs.length > 0)
      console.log(
        `[Internshala] AJAX ${isJob ? "jobs" : "internships"} ✓ — ${jobs.length}`,
      );
    return jobs;
  } catch {
    return [];
  }
}

// ── Per-page Fetcher ───────────────────────────────────────────────────────

async function fetchAndParse(
  url: string,
  isJob: boolean,
  defaultLoc: string,
  apiKey: string | undefined,
): Promise<DiscoveredJob[]> {
  const fetchUrl = apiKey ? scraperUrl(url, apiKey) : url;

  const res = await fetch(fetchUrl, {
    headers: PAGE_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();

  // Strategy 1: JSON-LD
  const ldJobs = extractJsonLd(html);
  if (ldJobs.length > 0) return ldJobs;

  // Strategy 2: Window state
  const stateJobs = extractWindowState(html, defaultLoc);
  if (stateJobs.length > 0) return stateJobs;

  // Strategy 3: DOM
  return parseDom(html, defaultLoc, isJob);
}

// ── Main Export ────────────────────────────────────────────────────────────

export async function scrapeInternshalaJobs(
  query: string,
  location: string,
  page = 1,
): Promise<DiscoveredJob[]> {
  const apiKey = process.env.SCRAPER_API_KEY;
  const qSlug = slugify(query);
  const locSlug = slugify(location || "india");
  const pagePart = page > 1 ? `/page-${page}` : "";

  const internshipUrl = `${BASE}/internships/${qSlug}-internship-in-${locSlug}${pagePart}/`;
  const jobUrl = `${BASE}/jobs/${qSlug}-jobs-in-${locSlug}${pagePart}/`;

  const seenUrls = new Set<string>();
  const combined: DiscoveredJob[] = [];

  // Fetch both pages concurrently for speed
  const [internshipsResult, jobsResult] = await Promise.allSettled([
    fetchAndParse(internshipUrl, false, location, apiKey),
    fetchAndParse(jobUrl, true, location, apiKey),
  ]);

  const addUnique = (list: DiscoveredJob[]) => {
    for (const j of list) {
      if (!seenUrls.has(j.jobUrl)) {
        seenUrls.add(j.jobUrl);
        combined.push(j);
      }
    }
  };

  if (internshipsResult.status === "fulfilled") {
    if (internshipsResult.value.length > 0) {
      console.log(
        `[Internshala] Internships page ✓ — ${internshipsResult.value.length}`,
      );
      addUnique(internshipsResult.value);
    }
  } else {
    console.warn(
      "[Internshala] Internships page failed:",
      (internshipsResult.reason as Error).message,
    );
  }

  if (jobsResult.status === "fulfilled") {
    if (jobsResult.value.length > 0) {
      console.log(`[Internshala] Jobs page ✓ — ${jobsResult.value.length}`);
      addUnique(jobsResult.value);
    }
  } else {
    console.warn(
      "[Internshala] Jobs page failed:",
      (jobsResult.reason as Error).message,
    );
  }

  // Strategy 4: AJAX fallback if main pages both returned nothing
  if (combined.length === 0) {
    console.log("[Internshala] Main pages empty — trying AJAX endpoints...");
    const [ajaxIntern, ajaxJobs] = await Promise.allSettled([
      tryAjax(query, location, page, false),
      tryAjax(query, location, page, true),
    ]);
    if (ajaxIntern.status === "fulfilled") addUnique(ajaxIntern.value);
    if (ajaxJobs.status === "fulfilled") addUnique(ajaxJobs.value);
  }

  console.log(`[Internshala] Total unique results: ${combined.length}`);
  return combined;
}
