import { URL } from "url";

const SOCIAL_AND_JOB_DOMAINS = [
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "duckduckgo.com",
  "google.com",
  "instagram.com",
  "wikipedia.org",
  "youtube.com",
  "github.com",
  "crunchbase.com",
  "naukri.com",
  "adzuna.com",
  "jooble.org",
  "jooble.com",
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
];

function extractDomain(urlStr: string): string | null {
  try {
    let cleanUrl = urlStr;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "http://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.substring(4);
    }
    return host;
  } catch (err) {
    return null;
  }
}

function isValidCorporateDomain(domain: string): boolean {
  if (!domain || !domain.includes(".")) return false;
  return !SOCIAL_AND_JOB_DOMAINS.some(
    (black) => domain === black || domain.endsWith("." + black)
  );
}

export async function resolveDomain(companyName: string): Promise<string | null> {
  const cleanName = companyName.trim();
  if (!cleanName) return null;

  console.log(`[DomainResolver] Resolving domain for: "${cleanName}"`);

  // 1. Clearbit Autocomplete API
  try {
    const clearbitUrl = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(
      cleanName
    )}`;
    const res = await fetch(clearbitUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const suggestions = await res.json();
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        for (const item of suggestions) {
          const domain = extractDomain(item.domain);
          if (domain && isValidCorporateDomain(domain)) {
            console.log(`[DomainResolver] Clearbit matched: ${domain} for "${cleanName}"`);
            return `https://${domain}`;
          }
        }
      }
    }
  } catch (err) {
    console.error(`[DomainResolver] Clearbit error for "${cleanName}":`, err);
  }

  // 2. DuckDuckGo Search Fallback
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      cleanName + " official website"
    )}`;
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    const fetchUrl = scraperApiKey
      ? `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(
          searchUrl
        )}`
      : searchUrl;

    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();
      const uddgRegex = /uddg=([^&"']+)/g;
      let match;

      while ((match = uddgRegex.exec(html)) !== null) {
        try {
          const decodedUrl = decodeURIComponent(match[1]);
          const domain = extractDomain(decodedUrl);
          if (domain && isValidCorporateDomain(domain)) {
            const resolvedUrl = `https://${domain}`;
            console.log(`[DomainResolver] DDG matched: ${resolvedUrl} from ${decodedUrl}`);
            return resolvedUrl;
          }
        } catch {
          // ignore URL parsing/decoding errors
        }
      }
    }
  } catch (err) {
    console.error(`[DomainResolver] DuckDuckGo fallback error for "${cleanName}":`, err);
  }

  return null;
}
