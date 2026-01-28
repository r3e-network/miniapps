#!/usr/bin/env node
/**
 * Verify miniapp registration
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function verify() {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,app_short_id,name,category,tags&order=name.asc&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  );

  const data = await response.json();

  console.log("📊 Final Verification:");
  console.log("=".repeat(60));
  console.log("Total records shown:", data.length);

  // Group by app_short_id
  const byShortId = {};
  data.forEach((r) => {
    const shortId = r.app_short_id || r.app_id;
    if (!byShortId[shortId]) byShortId[shortId] = [];
    byShortId[shortId].push(r);
  });

  const duplicates = Object.entries(byShortId).filter(([id, rows]) => rows.length > 1);

  console.log("Unique app_short_id:", Object.keys(byShortId).length);
  console.log("Duplicates found:", duplicates.length);

  if (duplicates.length > 0) {
    console.log("\n⚠️  Duplicates (need cleanup):");
    duplicates.slice(0, 5).forEach(([shortId, rows]) => {
      console.log(`  ${shortId}:`);
      rows.forEach((r) => {
        const date = r.updated_at || r.created_at || "";
        const shortDate = date.substring(0, 10);
        console.log(`    ${r.app_id} - ${shortDate}`);
      });
    });
  } else {
    console.log("\n✅ No duplicates!");
  }

  console.log("\n📋 Sample data:");
  data.slice(0, 8).forEach((r) => {
    let tags = [];
    try {
      tags = JSON.parse(r.tags || "[]");
    } catch (e) {}
    console.log(`  ${r.name}`);
    console.log(`    app_id: ${r.app_id}`);
    console.log(`    app_short_id: ${r.app_short_id || "N/A"}`);
    console.log(`    category: ${r.category}`);
    console.log(`    tags: [${tags.join(", ")}]`);
    console.log("");
  });

  // Count by category
  const byCategory = {};
  data.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  });
  console.log("📊 By category:");
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
}

verify().catch(console.error);
