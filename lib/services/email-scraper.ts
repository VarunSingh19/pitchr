import dns from "dns";

// A list of junk files/placeholders to filter out from regex matches
const JUNK_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|css|js|webp|pdf|woff|woff2|ico)$/i,
  /^(email|yourname|name|example|domain|user|test|info)@(example|domain|test)\.com$/i,
  /^support@bootstrap\.com$/i,
];

/**
 * Syntax validation and DNS MX record check for verification.
 */
export async function verifyEmail(email: string): Promise<boolean> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (err) {
    // MX lookup failure means domain might not have email setup
    return false;
  }
}

/**
 * Extract emails from a block of HTML text.
 */
function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/g;
  const matches = html.match(emailRegex) || [];
  
  const uniqueEmails = new Set<string>();
  for (const match of matches) {
    const email = match.toLowerCase().trim();
    const isJunk = JUNK_PATTERNS.some((pattern) => pattern.test(email));
    if (!isJunk && email.length < 80) {
      uniqueEmails.add(email);
    }
  }

  return Array.from(uniqueEmails);
}

/**
 * Scrapes a website's home page and contact page to harvest email addresses.
 */
export async function scrapeEmailsFromWebsite(
  websiteUrl: string
): Promise<{ emails: string[]; source: string | null }> {
  if (!websiteUrl) return { emails: [], source: null };

  let targetUrl = websiteUrl;
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    // 1. Fetch home page
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`Home page returned status: ${res.status}`);
    const html = await res.text();

    let emails = extractEmails(html);
    if (emails.length > 0) {
      return { emails, source: targetUrl };
    }

    // 2. Fallback: Search for contact/about/careers links on the homepage
    const linkRegex = /href="([^"]*?(?:contact|about|career|hiring|team)[^"]*?)"/gi;
    let linkMatch;
    const secondaryUrls = new Set<string>();

    while ((linkMatch = linkRegex.exec(html)) !== null) {
      let href = linkMatch[1];
      if (href.startsWith("/")) {
        try {
          const parsedBase = new URL(targetUrl);
          href = `${parsedBase.protocol}//${parsedBase.host}${href}`;
        } catch {
          continue;
        }
      }
      if (href.startsWith("http")) {
        secondaryUrls.add(href);
      }
    }

    // Try at most two contact/about pages to keep the execution time low
    const urlsToTry = Array.from(secondaryUrls).slice(0, 2);
    for (const subUrl of urlsToTry) {
      try {
        const subRes = await fetch(subUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (subRes.ok) {
          const subHtml = await subRes.text();
          const subEmails = extractEmails(subHtml);
          if (subEmails.length > 0) {
            return { emails: subEmails, source: subUrl };
          }
        }
      } catch {
        // ignore errors on secondary pages
      }
    }

    return { emails: [], source: null };
  } catch (err) {
    console.error(`[EmailScraper] Error scraping "${targetUrl}":`, err);
    return { emails: [], source: null };
  }
}
