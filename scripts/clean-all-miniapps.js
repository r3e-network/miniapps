#!/usr/bin/env node
/**
 * Proper cleanup: Delete all records and re-register fresh
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function cleanAll() {
  console.log("🧹 Cleaning all miniapp_stats records...\n");

  // Delete all records (must use WHERE clause for safety)
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/miniapp_stats?app_id=neq.placeholder`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (response.ok) {
    console.log("✅ All records deleted");
  } else {
    console.error("❌ Delete failed:", response.status, await response.text());
  }
}

cleanAll().catch(console.error);
