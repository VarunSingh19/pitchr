import type { DiscoveredJob } from "@/lib/types";

// Note: DiscoveredJob interface should be exported in lib/types.ts or declared locally.
// We'll declare it locally to be safe, or import it if it exists.

export async function fetchJobsFromAdzuna(query: string, location: string, page: number = 1): Promise<DiscoveredJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log("[JobDiscovery] Adzuna credentials missing, skipping.");
    return [];
  }

  try {
    // Adzuna pagination: page number is part of the URL path /search/{page}
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&content-type=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Adzuna HTTP error: ${res.status}`);
    
    const data = await res.json();
    return (data.results || []).map((job: any) => ({
      source: "adzuna" as const,
      jobTitle: String(job.title || "").replace(/<\/?[^>]+(>|$)/g, "").trim(), // Strip HTML tags
      companyName: String(job.company?.display_name || "Unknown Company").trim(),
      location: String(job.location?.display_name || location).trim(),
      description: String(job.description || "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      postingDate: job.created ? new Date(job.created) : new Date(),
      jobUrl: String(job.redirect_url || ""),
    }));
  } catch (err) {
    console.error("[JobDiscovery] Error fetching from Adzuna:", err);
    return [];
  }
}

export async function fetchJobsFromJooble(query: string, location: string, page: number = 1): Promise<DiscoveredJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    console.log("[JobDiscovery] Jooble API key missing, skipping.");
    return [];
  }

  try {
    const url = `https://jooble.org/api/${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: query, location, page }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Jooble HTTP error: ${res.status}`);
    const data = await res.json();

    return (data.jobs || []).map((job: any) => ({
      source: "jooble" as const,
      jobTitle: String(job.title || "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      companyName: String(job.company || "Unknown Company").trim(),
      location: String(job.location || location).trim(),
      description: String(job.snippet || "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
      postingDate: job.updated ? new Date(job.updated) : new Date(),
      jobUrl: String(job.link || ""),
    }));
  } catch (err) {
    console.error("[JobDiscovery] Error fetching from Jooble:", err);
    return [];
  }
}

export async function fetchJobsFromIndeedScraper(query: string, location: string, page: number = 1): Promise<DiscoveredJob[]> {
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const isIndia =
    location.toLowerCase().includes("india") ||
    location.toLowerCase().includes("mumbai") ||
    location.toLowerCase().includes("bangalore") ||
    location.toLowerCase().includes("pune") ||
    location.toLowerCase().includes("delhi") ||
    location.toLowerCase().includes("noida") ||
    location.toLowerCase().includes("chennai") ||
    location.toLowerCase().includes("hyderabad");

  const host = isIndia ? "in.indeed.com" : "www.indeed.com";
  // Indeed pagination: &start=0 for page 1, &start=10 for page 2, etc.
  const startOffset = (page - 1) * 10;
  const searchUrl = `https://${host}/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&start=${startOffset}`;

  try {
    const fetchUrl = scraperApiKey
      ? `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(searchUrl)}`
      : searchUrl;

    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`Indeed scraper HTTP error: ${res.status}`);
    const html = await res.text();

    const jobs: DiscoveredJob[] = [];

    // --- Approach 1: Parse Indeed Mosaic JSON Provider Data (Production Grade) ---
    // Indeed stores results in window.mosaic.providerData["mosaic-provider-jobcards"] script.
    const mosaicRegex = /providerData\["mosaic-provider-jobcards"\]\s*=\s*({[\s\S]+?});/m;
    const match = html.match(mosaicRegex);

    if (match && match[1]) {
      try {
        const parsedJson = JSON.parse(match[1]);
        const results = parsedJson.metaData?.mosaicProviderJobCardsModel?.results || parsedJson.results || [];
        
        for (const r of results) {
          if (r.jobkey) {
            jobs.push({
              source: "indeed" as const,
              jobTitle: String(r.title || r.normTitle || "").trim(),
              companyName: String(r.company || r.companyRatingModel?.companyName || "Unknown Company").trim(),
              location: String(r.formattedLocation || r.location || location).trim(),
              description: String(r.snippet || "").replace(/<\/?[^>]+(>|$)/g, "").trim(),
              postingDate: r.createDate ? new Date(r.createDate) : new Date(),
              jobUrl: `https://${host}/viewjob?jk=${r.jobkey}`,
            });
          }
        }
      } catch (jsonErr) {
        console.warn("[IndeedScraper] Mosaic JSON parsing failed, falling back to regex selectors.", jsonErr);
      }
    }

    // --- Approach 2: RegExp DOM Extraction Fallback ---
    if (jobs.length === 0) {
      // Find resultContent cells
      const cellRegex = /<td[^>]*class="[^"]*resultContent[^"]*"[^>]*>([\s\S]+?)<\/td>/g;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(html)) !== null) {
        const cellHtml = cellMatch[1];

        // 1. Extract JobKey & Title
        const titleMatch = cellHtml.match(/href="\/rc\/clk\?jk=([^"&]+)/) || cellHtml.match(/data-jk="([^"]+)"/);
        const textMatch = cellHtml.match(/<span[^>]*title="([^"]+)"/) || cellHtml.match(/aria-label="([^"]+)"/);
        
        if (titleMatch && textMatch) {
          const jk = titleMatch[1];
          const title = textMatch[1].trim();

          // 2. Extract Company
          const companyMatch = cellHtml.match(/data-testid="company-name"[^>]*>([^<]+)/) || cellHtml.match(/class="[^"]*companyName[^"]*"[^>]*>([^<]+)/);
          const company = companyMatch ? companyMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : "Unknown Company";

          // 3. Extract Location
          const locMatch = cellHtml.match(/data-testid="text-location"[^>]*>([^<]+)/) || cellHtml.match(/class="[^"]*companyLocation[^"]*"[^>]*>([^<]+)/);
          const loc = locMatch ? locMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : location;

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
    }

    return jobs;
  } catch (err) {
    console.error("[JobDiscovery] Indeed scraper error:", err);
    return [];
  }
}

export interface PageOffsets {
  adzuna: number;
  jooble: number;
  indeed: number;
}

export async function searchAllJobBoards(
  query: string,
  location: string,
  pageOffsets?: PageOffsets
): Promise<DiscoveredJob[]> {
  const adzunaPage = pageOffsets?.adzuna ?? 1;
  const jooblePage = pageOffsets?.jooble ?? 1;
  const indeedPage = pageOffsets?.indeed ?? 1;

  console.log(
    `[JobDiscovery] Querying pipelines for: "${query}" in "${location}" (pages: adzuna=${adzunaPage}, jooble=${jooblePage}, indeed=${indeedPage})`
  );
  
  // Fetch from all sources in parallel
  const [adzuna, jooble, indeed] = await Promise.all([
    fetchJobsFromAdzuna(query, location, adzunaPage),
    fetchJobsFromJooble(query, location, jooblePage),
    fetchJobsFromIndeedScraper(query, location, indeedPage),
  ]);

  const allJobs = [...indeed, ...jooble, ...adzuna];

  // Remove duplicates by jobUrl
  const seenUrls = new Set<string>();
  const uniqueJobs: DiscoveredJob[] = [];

  for (const job of allJobs) {
    if (job.jobUrl && !seenUrls.has(job.jobUrl)) {
      seenUrls.add(job.jobUrl);
      uniqueJobs.push(job);
    }
  }

  // Cap at 20 results total
  return uniqueJobs.slice(0, 20);
}
