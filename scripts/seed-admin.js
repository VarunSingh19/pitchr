/**
 * One-time script to promote a user to admin by email.
 *
 * Usage:
 *   node scripts/seed-admin.js <email>
 *
 * Example:
 *   node scripts/seed-admin.js admin@example.com
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
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/seed-admin.js <email>");
    process.exit(1);
  }

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("MONGO_URL not set. Add it to .env.local or export it.");
    process.exit(1);
  }

  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    const db = client.db(); // uses DB name from connection string

    const result = await db.collection("users").findOneAndUpdate(
      { email },
      { $set: { role: "admin" } },
      { returnDocument: "after" }
    );

    if (result) {
      console.log(`✅ Successfully promoted ${email} to admin.`);
      console.log(`   Name: ${result.name}`);
      console.log(`   Role: ${result.role}`);
    } else {
      console.error(`❌ No user found with email: ${email}`);
      console.error("   Make sure the user has signed in at least once.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
