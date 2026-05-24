import { searchAllJobBoards } from "../lib/services/job-discovery";
import dotenv from "dotenv";
import path from "path";

// Load local environment files
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function run() {
  console.log("Checking keys in process.env:");
  console.log("ADZUNA_APP_ID:", process.env.ADZUNA_APP_ID ? "present" : "missing");
  console.log("ADZUNA_APP_KEY:", process.env.ADZUNA_APP_KEY ? "present" : "missing");
  console.log("JOOBLE_API_KEY:", process.env.JOOBLE_API_KEY ? "present" : "missing");
  console.log("SCRAPER_API_KEY:", process.env.SCRAPER_API_KEY ? "present" : "missing");

  console.log("\nStarting search query for: 'Full stack developer' in 'Mumbai'...");
  try {
    const results = await searchAllJobBoards("Full stack developer", "Mumbai");
    console.log(`\nSearch finished. Found ${results.length} total unique results.`);
    results.forEach((job, idx) => {
      console.log(`[${idx + 1}] ${job.companyName} - ${job.jobTitle} (${job.source})`);
      console.log(`    URL: ${job.jobUrl}`);
    });
  } catch (err) {
    console.error("Search failed with error:", err);
  }
}

run();
