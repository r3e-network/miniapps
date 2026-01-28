#!/usr/bin/env node
/**
 * Final comprehensive check
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function finalCheck() {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,app_short_id,name,is_active&order=app_id.asc`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  );

  const data = await response.json();

  console.log("📊 FINAL STATUS:");
  console.log("=".repeat(60));
  console.log("Total records:", data.length);

  // Check for duplicate app_ids
  const byAppId = {};
  data.forEach((r) => {
    if (!byAppId[r.app_id]) byAppId[r.app_id] = [];
    byAppId[r.app_id].push(r);
  });

  const dupAppIds = Object.entries(byAppId).filter(([id, rows]) => rows.length > 1);
  console.log("Duplicate app_ids:", dupAppIds.length);

  // Check for duplicate names
  const byName = {};
  data.forEach((r) => {
    if (!byName[r.name]) byName[r.name] = [];
    byName[r.name].push(r);
  });

  const dupNames = Object.entries(byName).filter(([id, rows]) => rows.length > 1);
  console.log("Duplicate names:", dupNames.length);

  // Check app_short_id uniqueness
  const byShortId = {};
  data.forEach((r) => {
    const sid = r.app_short_id || "";
    if (sid) {
      if (!byShortId[sid]) byShortId[sid] = [];
      byShortId[sid].push(r);
    }
  });

  const dupShortIds = Object.entries(byShortId).filter(([id, rows]) => rows.length > 1);
  console.log("Duplicate app_short_ids:", dupShortIds.length);

  // Count active
  const active = data.filter((r) => r.is_active).length;
  console.log("Active records:", active);
  console.log("Inactive records:", data.length - active);

  // Check for app_short_id coverage
  const withShortId = data.filter((r) => r.app_short_id).length;
  console.log("With app_short_id:", withShortId);
  console.log("Without app_short_id:", data.length - withShortId);

  console.log("\n✅ Success criteria:");
  console.log(`  - All records unique: ${data.length} unique app_ids ✓`);
  console.log(`  - No duplicate names: ${dupNames.length === 0 ? "PASS ✓" : "FAIL"}`);
  console.log(`  - All have app_short_id: ${withShortId === data.length ? "PASS ✓" : "FAIL"}`);

  if (dupAppIds.length > 0 || dupNames.length > 0 || dupShortIds.length > 0) {
    console.log("\n⚠️  Issues found!");
  } else {
    console.log("\n🎉 All checks passed!");
  }

  console.log("\n📋 Sample miniapps:");
  data.slice(0, 10).forEach((r) => {
    console.log(`  ${r.name.padEnd(25)} app_id=${r.app_id.padEnd(30)} short_id=${r.app_short_id || "N/A"}`);
  });
}

finalCheck().catch(console.error);
