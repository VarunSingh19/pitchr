import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dns from "dns";

// Helper to resolve MX records with a 3-second timeout
async function checkDomainMx(domain: string): Promise<{ valid: boolean; unknown?: boolean }> {
  try {
    const mxPromise = dns.promises.resolveMx(domain);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), 3000);
    });

    const records = await Promise.race([mxPromise, timeoutPromise]);
    
    // If records array is empty, domain is considered invalid
    return { valid: records && records.length > 0 };
  } catch (error: any) {
    if (error.message === "TIMEOUT" || error.code === "ENOTFOUND" || error.code === "SERVFAIL" || error.code === "ECONNREFUSED") {
      if (error.code === "ENODATA") {
         // Explicitly no MX records
         return { valid: false };
      }
      // If DNS timeout or temporary failure, we don't definitively mark it invalid.
      // We mark it "unknown" to avoid false positives blocking user.
      if (error.message === "TIMEOUT") {
         return { valid: true, unknown: true };
      }
      return { valid: false };
    }
    return { valid: false };
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emails } = await req.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ invalidEmails: [] });
    }

    // 1. Deduplicate domains
    const domainMap = new Map<string, string[]>(); // domain -> emails[]
    for (const email of emails) {
      if (typeof email !== "string" || !email.includes("@")) continue;
      const domain = email.split("@")[1].toLowerCase();
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(email);
    }

    const uniqueDomains = Array.from(domainMap.keys());
    const invalidEmails: string[] = [];

    // 2. Query each unique domain concurrently
    const results = await Promise.all(
      uniqueDomains.map(async (domain) => {
        const { valid, unknown } = await checkDomainMx(domain);
        return { domain, valid, unknown };
      })
    );

    // 3. Map results back to emails
    for (const result of results) {
      // If invalid (and not just unknown due to timeout), add all emails for this domain to invalid list
      if (!result.valid && !result.unknown) {
        const affectedEmails = domainMap.get(result.domain) || [];
        invalidEmails.push(...affectedEmails);
      }
    }

    return NextResponse.json({ invalidEmails });
  } catch (error) {
    console.error("[leads/verify] Error verifying emails:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
