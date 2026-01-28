#!/usr/bin/env node
/**
 * Clean up duplicate entries in miniapp_stats table
 *
 * This script removes old records (2025-12-31) that lack the 'name' field
 * and use outdated naming conventions (snake_case/camelCase).
 * The newer records (2026-01-25) have complete metadata and use kebab-case.
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const fetch = require("node-fetch");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get records that will be deleted (dry run)
 */
async function getDuplicatesToDelete() {
  console.log("🔍 Finding records to delete (dry run)...\n");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,name,chain_id,created_at,updated_at&order=created_at.desc`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    },
  );

  if (!response.ok) {
    console.error("❌ Query failed:", response.status, response.statusText);
    return [];
  }

  const data = await response.json();

  // Filter records without name field (old duplicates)
  const toDelete = data.filter((row) => !row.name || row.name === "");

  console.log(`📊 Analysis:`);
  console.log(`   Total records: ${data.length}`);
  console.log(`   Records with name: ${data.filter((r) => r.name).length}`);
  console.log(`   Records without name (to delete): ${toDelete.length}\n`);

  if (toDelete.length > 0) {
    console.log(`📋 Records to delete:\n`);
    toDelete.forEach((row, i) => {
      const created = row.created_at ? row.created_at.split("T")[0] : "(no date)";
      console.log(`  ${(i + 1).toString().padStart(3)}. ${row.app_id.padEnd(35)} created=${created}`);
    });
  }

  return toDelete;
}

/**
 * Delete old duplicate records
 */
async function deleteDuplicates(recordsToDelete) {
  if (recordsToDelete.length === 0) {
    console.log("\n✅ No records to delete");
    return;
  }

  console.log(`\n⚠️  About to delete ${recordsToDelete.length} records`);
  console.log("This operation cannot be undone!\n");

  // Delete records by app_id and created_at combination
  let deleted = 0;
  let failed = 0;

  for (const record of recordsToDelete) {
    try {
      // URL encode the timestamp for safe URL usage
      const encodedTimestamp = encodeURIComponent(record.created_at);
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_stats?app_id=eq.${record.app_id}&created_at=eq.${encodedTimestamp}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apikey: SUPABASE_KEY,
          },
        },
      );

      if (response.ok) {
        console.log(`  ✅ Deleted: ${record.app_id}`);
        deleted++;
      } else {
        console.log(`  ❌ Failed: ${record.app_id} - ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${record.app_id} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Delete Summary:`);
  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   ❌ Failed: ${failed}`);
}

/**
 * Verify cleanup was successful
 */
async function verifyCleanup() {
  console.log("\n🔍 Verifying cleanup...\n");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,name,created_at&order=created_at.desc`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    },
  );

  if (!response.ok) {
    console.error("❌ Verification failed");
    return;
  }

  const data = await response.json();

  const withName = data.filter((r) => r.name);
  const withoutName = data.filter((r) => !r.name);

  console.log(`📊 Current state:`);
  console.log(`   Total records: ${data.length}`);
  console.log(`   With name: ${withName.length}`);
  console.log(`   Without name: ${withoutName.length}`);

  if (withoutName.length === 0) {
    console.log("\n✅ Cleanup successful! All remaining records have names.");
  } else {
    console.log(`\n⚠️  Still have ${withoutName.length} records without name`);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");

  console.log("🧹 Supabase Duplicate Cleanup Tool");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "EXECUTE (will delete!)"}`);
  console.log("=".repeat(60) + "\n");

  // Step 1: Find duplicates
  const toDelete = await getDuplicatesToDelete();

  if (dryRun) {
    console.log("\n💡 To execute deletion, run: node scripts/cleanup-supabase-duplicates.js --execute");
    return;
  }

  // Step 2: Delete duplicates
  await deleteDuplicates(toDelete);

  // Step 3: Verify
  await verifyCleanup();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Cleanup complete");
  console.log("=".repeat(60));
}

main().catch(console.error);
