/**
 * Email Scraper — Harvests contact emails from company websites.
 *
 * Fetch strategy (per URL):
 *   1. Direct fetch (fast, free) — works for most publicly accessible sites.
 *   2. ScraperAPI fallback       — used when the direct fetch gets a non-2xx
 *      response or a network error. Many corporate/startup sites block
 *      datacenter IPs; routing through ScraperAPI residential proxies
 *      dramatically improves the email discovery hit rate.
 *
 * Pipeline per domain:
 *   a. Fetch homepage → regex extract emails
 *   b. If none found: scan for contact/about/careers href links
 *   c. Fetch up to 2 secondary pages → regex extract emails
 *   d. Verify each found email via DNS MX lookup
 */

import dns from "dns";

// Patterns to reject common placeholder/junk email-like strings in HTML
const JUNK_PATTERNS = [
  // Asset paths that look like emails
  /\.(png|jpg|jpeg|gif|svg|css|js|webp|pdf|woff|woff2|ico)$/i,
  // Placeholder emails
  /^(email|yourname|name|example|domain|user|test|info)@(example|domain|test)\.com$/i,
  /^support@bootstrap\.com$/i,
  // No-reply / automated senders
  /noreply|no-reply|donotreply/i,
  // Known SaaS infra domains (never a hiring contact)
  /sentry\.io|datadog\.com|sendgrid\.net|mailchimp\.com/i,
  // Hex-hash local parts — obfuscated tracking pixels, gov notification systems, CDN tokens
  // e.g. 605a7baede84c3a1@user.govdelivery.com, ab12cd34ef56gh78@bounce.example.com
  /^[a-f0-9]{16,}@/i,
  // System / legal / non-HR account prefixes — never the hiring team inbox
  /^(privacy|security|legal|abuse|postmaster|webmaster|bounce|daemon|mailer-daemon|unsubscribe|hostmaster|spam|alert|alerts|notify|notification|notifications|billing|invoice|invoices|payment|payments|order|orders|shop|sales@salesforce)@/i,
  // Local part is pure digits (auto-generated IDs)
  /^\d+@/,
];

// ── Helpers ────────────────────────────────────────────────────────────────

function scraperApiUrl(target: string): string | null {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return null;
  return `https://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(target)}`;
}

/**
 * Fetch a URL with automatic ScraperAPI fallback.
 * Returns the response text, or null if both attempts fail.
 */
async function fetchWithFallback(
  url: string,
  timeoutMs: number
): Promise<{ text: string; resolvedUrl: string } | null> {
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // Attempt 1: direct fetch
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      return { text: await res.text(), resolvedUrl: url };
    }
    // Non-2xx but reachable — try ScraperAPI before giving up
    console.log(`[EmailScraper] Direct fetch got ${res.status} for ${url}, trying ScraperAPI...`);
  } catch {
    // Network error (connection refused, timeout, DNS failure) — try ScraperAPI
    console.log(`[EmailScraper] Direct fetch failed for ${url}, trying ScraperAPI...`);
  }

  // Attempt 2: ScraperAPI residential proxy fallback
  const proxyUrl = scraperApiUrl(url);
  if (!proxyUrl) return null; // No key configured — can't fallback

  try {
    const res = await fetch(proxyUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(timeoutMs + 4_000), // ScraperAPI is a bit slower
    });
    if (res.ok) {
      return { text: await res.text(), resolvedUrl: url };
    }
  } catch {
    // ScraperAPI also failed — nothing more we can do
  }

  return null;
}

// ── Email Extraction ───────────────────────────────────────────────────────

function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g;
  const matches    = html.match(emailRegex) ?? [];
  const unique     = new Set<string>();

  for (const raw of matches) {
    const email = raw.toLowerCase().trim();
    if (email.length >= 80) continue;
    if (JUNK_PATTERNS.some((p) => p.test(email))) continue;
    unique.add(email);
  }

  return Array.from(unique);
}

// ── DNS MX Verification ────────────────────────────────────────────────────

export async function verifyEmail(email: string): Promise<boolean> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const mx = await dns.promises.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

// ── Main Scraper ───────────────────────────────────────────────────────────

export async function scrapeEmailsFromWebsite(
  websiteUrl: string
): Promise<{ emails: string[]; source: string | null }> {
  if (!websiteUrl) return { emails: [], source: null };

  let targetUrl = websiteUrl;
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  // Step 1: Homepage
  const homeResult = await fetchWithFallback(targetUrl, 6_000);
  if (homeResult) {
    const emails = extractEmails(homeResult.text);
    if (emails.length > 0) {
      return { emails, source: homeResult.resolvedUrl };
    }

    // Step 2: Scan homepage HTML for contact/about/careers sub-pages
    const linkRegex = /href="([^"]*?(?:contact|about|career|hiring|team)[^"]*?)"/gi;
    let linkMatch: RegExpExecArray | null;
    const secondaryUrls = new Set<string>();

    while ((linkMatch = linkRegex.exec(homeResult.text)) !== null) {
      let href = linkMatch[1];
      if (href.startsWith("/")) {
        try {
          const base = new URL(targetUrl);
          href = `${base.protocol}//${base.host}${href}`;
        } catch {
          continue;
        }
      }
      if (href.startsWith("http")) secondaryUrls.add(href);
    }

    // Step 3: Fetch up to 2 secondary pages
    const urlsToTry = Array.from(secondaryUrls).slice(0, 2);
    for (const subUrl of urlsToTry) {
      const subResult = await fetchWithFallback(subUrl, 4_000);
      if (subResult) {
        const subEmails = extractEmails(subResult.text);
        if (subEmails.length > 0) {
          return { emails: subEmails, source: subResult.resolvedUrl };
        }
      }
    }
  }

  return { emails: [], source: null };
}
