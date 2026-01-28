#!/usr/bin/env node
/**
 * List all tables in Supabase public schema
 */

const fetch = require("node-fetch");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function listTables() {
  console.log("🔍 Fetching table list from Supabase...\n");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    console.error("❌ Failed to fetch schema:", response.status);
    return;
  }

  const schema = await response.json();

  // Extract table names from paths
  const tables = Object.keys(schema.paths || {})
    .filter((path) => path.startsWith("/") && path !== "/" && !path.includes("{"))
    .map((path) => path.substring(1))
    .sort();

  console.log("📋 Supabase Tables in public schema:");
  console.log("=".repeat(60));
  tables.forEach((table, i) => {
    console.log(`  ${(i + 1).toString().padStart(3)}. ${table}`);
  });
  console.log("=".repeat(60));
  console.log(`Total: ${tables.length} tables\n`);
}

listTables().catch(console.error);
