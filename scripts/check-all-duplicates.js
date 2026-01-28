#!/usr/bin/env node
/**
 * Comprehensive duplicate checker for all Supabase tables
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const fetch = require("node-fetch");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Tables to check for duplicates
const TABLES_TO_CHECK = [
  // Miniapp-related tables
  "miniapp_registry",
  "miniapp_stats",
  "miniapp_stats_summary",
  "miniapp_internal",
  "miniapp_contracts",
  "miniapp_approvals",
  "miniapp_submissions",
  "miniapp_versions",

  // Account-related tables
  "accounts",
  "pool_accounts",
  "multichain_accounts",
  "linked_neo_accounts",
  "neohub_accounts",

  // Balance-related tables
  "account_balances",
  "pool_account_balances",
];

async function getTableRowCount(tableName) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      Prefer: "count=exact",
    },
  });

  const count = response.headers.get("content-range");
  if (count) {
    const match = count.match(/\/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

async function getTableSample(tableName, limit = 100) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&order=created_at.desc&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function checkMiniappRegistryDuplicates() {
  console.log("\n📋 Checking miniapp_registry...");

  const data = await getTableSample("miniapp_registry", 200);
  if (!data) {
    console.log("  ❌ Failed to query table");
    return;
  }

  console.log(`  📊 Total records: ${data.length}`);

  // Group by app_id or name
  const byAppId = {};
  const byName = {};

  data.forEach((row) => {
    if (row.app_id) {
      if (!byAppId[row.app_id]) byAppId[row.app_id] = [];
      byAppId[row.app_id].push(row);
    }
    if (row.name) {
      if (!byName[row.name]) byName[row.name] = [];
      byName[row.name].push(row);
    }
  });

  const dupByAppId = Object.entries(byAppId).filter(([id, rows]) => rows.length > 1);
  const dupByName = Object.entries(byName).filter(([id, rows]) => rows.length > 1);

  if (dupByAppId.length > 0) {
    console.log(`  ⚠️  Found ${dupByAppId.length} duplicate app_ids`);
    dupByAppId.slice(0, 5).forEach(([id, rows]) => {
      console.log(`    - ${id}: ${rows.length} entries`);
    });
  }

  if (dupByName.length > 0) {
    console.log(`  ⚠️  Found ${dupByName.length} duplicate names`);
    dupByName.slice(0, 5).forEach(([id, rows]) => {
      console.log(`    - ${id}: ${rows.length} entries`);
    });
  }

  if (dupByAppId.length === 0 && dupByName.length === 0) {
    console.log("  ✅ No duplicates found");
  }

  return { total: data.length, dupByAppId: dupByAppId.length, dupByName: dupByName.length };
}

async function checkMiniappStatsDuplicates() {
  console.log("\n📋 Checking miniapp_stats...");

  const data = await getTableSample("miniapp_stats", 200);
  if (!data) {
    console.log("  ❌ Failed to query table");
    return;
  }

  console.log(`  📊 Total records: ${data.length}`);

  // Group by app_id
  const byAppId = {};
  data.forEach((row) => {
    if (row.app_id) {
      if (!byAppId[row.app_id]) byAppId[row.app_id] = [];
      byAppId[row.app_id].push(row);
    }
  });

  const duplicates = Object.entries(byAppId).filter(([id, rows]) => rows.length > 1);

  if (duplicates.length > 0) {
    console.log(`  ⚠️  Found ${duplicates.length} duplicate app_ids`);
    duplicates.slice(0, 5).forEach(([id, rows]) => {
      const hasName = rows.some((r) => r.name);
      const noName = rows.filter((r) => !r.name).length;
      console.log(`    - ${id}: ${rows.length} entries (with_name: ${hasName ? "yes" : "no"}, no_name: ${noName})`);
    });
  } else {
    console.log("  ✅ No duplicates found");
  }

  return { total: data.length, duplicates: duplicates.length };
}

async function checkMiniappInternalDuplicates() {
  console.log("\n📋 Checking miniapp_internal...");

  const data = await getTableSample("miniapp_internal", 200);
  if (!data) {
    console.log("  ❌ Failed to query table");
    return;
  }

  console.log(`  📊 Total records: ${data.length}`);

  // Group by app_id or git_url
  const byAppId = {};
  const byGitUrl = {};

  data.forEach((row) => {
    if (row.app_id) {
      if (!byAppId[row.app_id]) byAppId[row.app_id] = [];
      byAppId[row.app_id].push(row);
    }
    if (row.git_url) {
      if (!byGitUrl[row.git_url]) byGitUrl[row.git_url] = [];
      byGitUrl[row.git_url].push(row);
    }
  });

  const dupByAppId = Object.entries(byAppId).filter(([id, rows]) => rows.length > 1);
  const dupByGitUrl = Object.entries(byGitUrl).filter(([id, rows]) => rows.length > 1);

  if (dupByAppId.length > 0) {
    console.log(`  ⚠️  Found ${dupByAppId.length} duplicate app_ids`);
  }

  if (dupByGitUrl.length > 0) {
    console.log(`  ⚠️  Found ${dupByGitUrl.length} duplicate git_urls`);
    dupByGitUrl.slice(0, 5).forEach(([url, rows]) => {
      console.log(`    - ${url}: ${rows.length} entries`);
    });
  }

  if (dupByAppId.length === 0 && dupByGitUrl.length === 0) {
    console.log("  ✅ No duplicates found");
  }

  return { total: data.length, dupByAppId: dupByAppId.length, dupByGitUrl: dupByGitUrl.length };
}

async function checkAccountsDuplicates() {
  console.log("\n📋 Checking accounts-related tables...");

  const accountTables = ["accounts", "pool_accounts", "multichain_accounts"];

  for (const table of accountTables) {
    const data = await getTableSample(table, 50);
    if (!data) {
      console.log(`  ⚠️  ${table}: Failed to query`);
      continue;
    }

    console.log(`  📊 ${table}: ${data.length} records`);

    // Try to find duplicate accounts
    const byAddress = {};
    data.forEach((row) => {
      const addr = row.address || row.account_address || row.wallet_address;
      if (addr) {
        if (!byAddress[addr]) byAddress[addr] = [];
        byAddress[addr].push(row);
      }
    });

    const dupAddresses = Object.entries(byAddress).filter(([id, rows]) => rows.length > 1);
    if (dupAddresses.length > 0) {
      console.log(`    ⚠️  Found ${dupAddresses.length} duplicate addresses`);
    }
  }
}

async function checkBalanceDuplicates() {
  console.log("\n📋 Checking balance-related tables...");

  const balanceTables = ["account_balances", "pool_account_balances"];

  for (const table of balanceTables) {
    const data = await getTableSample(table, 50);
    if (!data) {
      console.log(`  ⚠️  ${table}: Failed to query`);
      continue;
    }

    console.log(`  📊 ${table}: ${data.length} records`);

    // Group by account_address
    const byAddress = {};
    data.forEach((row) => {
      const addr = row.account_address || row.address;
      if (addr) {
        if (!byAddress[addr]) byAddress[addr] = [];
        byAddress[addr].push(row);
      }
    });

    const dupAddresses = Object.entries(byAddress).filter(([id, rows]) => rows.length > 1);
    if (dupAddresses.length > 0) {
      console.log(`    ⚠️  Found ${dupAddresses.length} addresses with multiple entries`);
    }
  }
}

async function checkTableOverlaps() {
  console.log("\n📋 Checking for table overlaps...");

  // Check if miniapp_registry and miniapp_stats have overlapping data
  const registryData = await getTableSample("miniapp_registry", 100);
  const statsData = await getTableSample("miniapp_stats", 100);

  if (registryData && statsData) {
    const registryApps = new Set(registryData.map((r) => r.app_id).filter(Boolean));
    const statsApps = new Set(statsData.map((r) => r.app_id).filter(Boolean));

    const overlap = [...registryApps].filter((app) => statsApps.has(app));

    console.log(`  📊 miniapp_registry: ${registryApps.size} unique apps`);
    console.log(`  📊 miniapp_stats: ${statsApps.size} unique apps`);
    console.log(`  🔗 Overlap: ${overlap.length} apps in both tables`);

    if (overlap.length > 0) {
      console.log(`    ⚠️  Sample overlapping apps: ${overlap.slice(0, 5).join(", ")}`);
    }
  }

  // Check accounts tables overlap
  const accountsData = await getTableSample("accounts", 50);
  const poolAccountsData = await getTableSample("pool_accounts", 50);

  if (accountsData && poolAccountsData) {
    const accountsAddresses = new Set(accountsData.map((r) => r.address || r.account_address).filter(Boolean));
    const poolAddresses = new Set(poolAccountsData.map((r) => r.address || r.account_address).filter(Boolean));

    const overlap = [...accountsAddresses].filter((addr) => poolAddresses.has(addr));

    console.log(`  📊 accounts: ${accountsAddresses.size} unique addresses`);
    console.log(`  📊 pool_accounts: ${poolAddresses.size} unique addresses`);
    console.log(`  🔗 Overlap: ${overlap.length} addresses in both tables`);
  }
}

async function main() {
  console.log("🔍 Comprehensive Duplicate Check for Supabase Tables");
  console.log("=".repeat(60));

  await checkMiniappRegistryDuplicates();
  await checkMiniappStatsDuplicates();
  await checkMiniappInternalDuplicates();
  await checkAccountsDuplicates();
  await checkBalanceDuplicates();
  await checkTableOverlaps();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Duplicate check complete");
  console.log("=".repeat(60));
}

main().catch(console.error);
