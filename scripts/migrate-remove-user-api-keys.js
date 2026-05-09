/**
 * One-time migration script to remove the deprecated apiKeys field from all users.
 *
 * ⚠️  Run this ONLY after confirming the new SystemApiKey pool is working correctly.
 *
 * Usage:
 *   node scripts/migrate-remove-user-api-keys.js
 *
 * Requires MONGO_URL to be set in .env.local
 */

const { MongoClient } = require("mongodb");
const path = require("path");

// Load .env.local
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
} catch {
  // dotenv may not be installed globally — MONGO_URL must be in env
}

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("MONGO_URL not set. Add it to .env.local or export it.");
    process.exit(1);
  }

  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    const db = client.db(); // uses DB name from connection string

    console.log("🔍 Checking users with apiKeys field...");

    const countBefore = await db
      .collection("users")
      .countDocuments({ apiKeys: { $exists: true } });

    console.log(`   Found ${countBefore} user(s) with apiKeys field.`);

    if (countBefore === 0) {
      console.log("✅ Nothing to migrate — no users have apiKeys.");
      return;
    }

    console.log("🗑️  Removing apiKeys field from all users...");

    const result = await db
      .collection("users")
      .updateMany({}, { $unset: { apiKeys: 1 } });

    console.log(`✅ Migration complete.`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
