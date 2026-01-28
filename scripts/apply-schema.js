#!/usr/bin/env node
/**
 * Apply Supabase schema via REST API
 * Adds missing columns to miniapp_stats table
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COLUMNS_TO_ADD = [
  { name: "app_short_id", type: "TEXT" },
  { name: "version", type: "TEXT DEFAULT '1.0.0'" },
  { name: "category_name", type: "TEXT" },
  { name: "category_name_zh", type: "TEXT" },
  { name: "tags", type: "JSONB DEFAULT '[]'::jsonb" },
  { name: "developer_name", type: "TEXT" },
  { name: "developer_email", type: "TEXT" },
  { name: "developer_website", type: "TEXT" },
  { name: "contract_address", type: "TEXT" },
  { name: "supported_networks", type: "JSONB DEFAULT '[\"neo-n3-mainnet\"]'::jsonb" },
  { name: "default_network", type: "TEXT DEFAULT 'neo-n3-mainnet'" },
  { name: "permissions", type: "JSONB DEFAULT '[]'::jsonb" },
  { name: "feature_stateless", type: "BOOLEAN DEFAULT false" },
  { name: "feature_offline_support", type: "BOOLEAN DEFAULT false" },
  { name: "feature_deeplink", type: "TEXT" },
  { name: "state_source_type", type: "TEXT" },
  { name: "state_source_endpoints", type: "JSONB DEFAULT '[]'::jsonb" },
  { name: "platform_analytics", type: "BOOLEAN DEFAULT true" },
  { name: "platform_comments", type: "BOOLEAN DEFAULT true" },
  { name: "platform_ratings", type: "BOOLEAN DEFAULT true" },
  { name: "platform_transactions", type: "BOOLEAN DEFAULT true" },
  { name: "is_featured", type: "BOOLEAN DEFAULT false" },
  { name: "is_verified", type: "BOOLEAN DEFAULT false" },
  { name: "is_active", type: "BOOLEAN DEFAULT true" },
  { name: "sort_order", type: "INTEGER DEFAULT 0" },
  { name: "popularity_score", type: "INTEGER DEFAULT 0" },
  { name: "last_used_at", type: "TIMESTAMPTZ" },
  { name: "manifest_json", type: "JSONB" },
  { name: "searchable_text", type: "TEXT" },
];

async function addColumn(columnName, columnType) {
  // Try to fetch a single record with this column to see if it exists
  const checkUrl = `${SUPABASE_URL}/rest/v1/miniapp_stats?select=${columnName}&limit=1`;

  try {
    const checkResponse = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    });

    if (checkResponse.ok) {
      // Column exists
      return { exists: true, column: columnName };
    }
  } catch (e) {
    // Ignore
  }

  // Column doesn't exist, we need to add it
  // Note: We can't ALTER TABLE via REST API, so we'll handle this in registration
  return { exists: false, column: columnName, type: columnType };
}

async function checkExistingSchema() {
  console.log("🔍 Checking existing schema...\n");

  const results = [];
  for (const col of COLUMNS_TO_ADD) {
    const result = await addColumn(col.name, col.type);
    results.push(result);
    const status = result.exists ? "✅" : "⬜";
    console.log(`  ${status} ${col.name.padEnd(25)} ${col.type}`);
  }

  const missing = results.filter((r) => !r.exists);
  console.log(`\n📊 Summary: ${results.length - missing.length} existing, ${missing.length} missing\n`);

  return missing;
}

async function getTableStructure() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&limit=1`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  if (response.ok) {
    const data = await response.json();
    if (data.length > 0) {
      console.log("📋 Current columns in miniapp_stats:");
      console.log("   ", Object.keys(data[0]).sort().join("\n    "));
    }
  }

  return [];
}

async function main() {
  console.log("🔧 Supabase Schema Checker");
  console.log("=".repeat(60));

  await checkExistingSchema();
  await getTableStructure();

  console.log("\n" + "=".repeat(60));
  console.log("⚠️  Note: Some columns may need to be added manually via SQL.");
  console.log("    The registration script will work with existing columns.");
  console.log("    Run the full schema SQL in Supabase SQL Editor for complete setup.");
  console.log("=".repeat(60));
}

main().catch(console.error);
