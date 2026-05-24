import { NextResponse } from "next/server";

const icons = [
  { name: "indeed", url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/indeed.svg" },
  { name: "glassdoor", url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/glassdoor.svg" },
  { name: "linkedin", url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/linkedin.svg" },
  { name: "ziprecruiter", url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/ziprecruiter.svg" },
  { name: "wellfound", url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/wellfound.svg" }
];

export async function GET() {
  const results: Record<string, string> = {};
  
  for (const icon of icons) {
    try {
      const res = await fetch(icon.url);
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/d="([^"]+)"/);
        if (match) {
          results[icon.name] = match[1];
        } else {
          results[icon.name] = "path-not-found";
        }
      } else {
        results[icon.name] = `status-${res.status}`;
      }
    } catch (err: any) {
      results[icon.name] = `error-${err.message}`;
    }
  }
  
  return NextResponse.json(results);
}
