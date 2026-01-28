#!/usr/bin/env node
/**
 * Register Miniapps to Supabase - Proper Upsert
 *
 * Each miniapp can have multiple chain deployments.
 * Each (app_id, chain_id) combination is a unique row.
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const APPS_DIR = path.join(__dirname, "../../apps");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_NAME = "miniapp_stats";
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL;

/**
 * Get all manifests from apps directory
 */
function getAllManifests() {
  const manifests = [];
  const appDirs = fs.readdirSync(APPS_DIR).filter((dir) => {
    const appPath = path.join(APPS_DIR, dir);
    return fs.statSync(appPath).isDirectory() && !dir.startsWith(".");
  });

  for (const appName of appDirs) {
    const appPath = path.join(APPS_DIR, appName);
    const manifestPath = path.join(appPath, "neo-manifest.json");

    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

      // Add file paths
      const staticDir = path.join(appPath, "static");
      manifest.hasLogo = fs.existsSync(path.join(staticDir, "logo.png"));
      manifest.hasBanner = fs.existsSync(path.join(staticDir, "banner.png"));
      manifest.appDir = appName;

      manifests.push(manifest);
    } catch (e) {
      console.warn(`  ⚠️  Failed to parse manifest for ${appName}: ${e.message}`);
    }
  }

  return manifests;
}

/**
 * Upload asset to Supabase Storage
 */
async function uploadAsset(filePath, bucket, fileName) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath);

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/octet-stream",
    },
    body: fileContent,
  });

  if (!response.ok && response.status !== 409) {
    const error = await response.text();
    console.warn(`    Upload warning: ${error}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

/**
 * Convert manifest to database record for a specific chain
 */
function manifestToRecord(manifest, chainId) {
  // Handle inconsistent manifest.id format
  // Some manifests already have "miniapp-" prefix, some don't
  let appId;
  if (manifest.id.startsWith("miniapp-")) {
    // Already has prefix, use as-is
    appId = manifest.id;
  } else {
    // No prefix, add it
    appId = `miniapp-${manifest.id}`;
  }

  // app_short_id should always be without miniapp- prefix for consistency
  const appShortId = appId.startsWith("miniapp-") ? appId.replace("miniapp-", "") : appId;

  // Build URLs - CDN uses appShortId (without "miniapp-" prefix) for folder names
  const logoUrl = manifest.hasLogo ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${appId}/logo.png` : null;
  const bannerUrl = manifest.hasBanner ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${appId}/banner.png` : null;

  const entryUrl = `${CDN_URL}/miniapps/${appShortId}/index.html`;

  // Get contract address for this specific chain
  const contractAddress = manifest.contracts?.[chainId] || null;

  // Build searchable text
  const searchableParts = [
    manifest.name,
    manifest.name_zh,
    manifest.description,
    manifest.description_zh,
    manifest.developer?.name,
    ...(manifest.tags || []),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    // Primary identifiers
    app_id: appId,
    chain_id: chainId,
    app_short_id: appShortId,

    // Basic info
    name: manifest.name,
    name_zh: manifest.name_zh || manifest.name,
    description: manifest.description || "",
    description_zh: manifest.description_zh || manifest.description || "",
    version: manifest.version || "1.0.0",

    // Category and tags
    category: manifest.category || "utility",
    category_name: manifest.category_name,
    category_name_zh: manifest.category_name_zh,
    tags: JSON.stringify(manifest.tags || []),

    // Developer info
    developer_name: manifest.developer?.name,
    developer_email: manifest.developer?.email,
    developer_website: manifest.developer?.website,

    // URLs
    logo_url: logoUrl,
    banner_url: bannerUrl,
    entry_url: entryUrl,

    // Contract and network (specific to this chain)
    contract_address: contractAddress,
    contract_hash: contractAddress, // For backward compatibility
    supported_networks: JSON.stringify(manifest.supported_networks || [chainId]),
    default_network: manifest.default_network || chainId,

    // Permissions
    permissions: JSON.stringify(manifest.permissions || []),

    // Features
    feature_stateless: manifest.features?.stateless || false,
    feature_offline_support: manifest.features?.offlineSupport || false,
    feature_deeplink: manifest.features?.deeplink || null,

    // State source
    state_source_type: manifest.state_source?.type,
    state_source_endpoints: JSON.stringify(manifest.state_source?.endpoints || []),

    // Platform features
    platform_analytics: manifest.platform?.analytics !== false,
    platform_comments: manifest.platform?.comments !== false,
    platform_ratings: manifest.platform?.ratings !== false,
    platform_transactions: manifest.platform?.transactions !== false,

    // Status (preserve existing values if updating)
    // is_featured: false,
    // is_verified: false,
    is_active: true,

    // Metadata
    manifest_json: JSON.stringify(manifest),
    searchable_text: searchableParts,

    // Timestamp
    updated_at: new Date().toISOString(),
  };
}

/**
 * Register or update a miniapp for a specific chain
 */
async function upsertMiniapp(manifest, chainId) {
  const record = manifestToRecord(manifest, chainId);

  // Check if exists
  const checkResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?app_id=eq.${record.app_id}&chain_id=eq.${chainId}&select=id`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    },
  );

  const exists = checkResponse.ok && (await checkResponse.json()).length > 0;

  if (exists) {
    // UPDATE existing record (PATCH)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?app_id=eq.${record.app_id}&chain_id=eq.${chainId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify(record),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${error}`);
    }
    return { action: "updated", record };
  } else {
    // INSERT new record (POST)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Prefer: "return=representation",
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Insert failed: ${error}`);
    }
    return { action: "inserted", record };
  }
}

/**
 * Main registration function
 */
async function registerAll() {
  console.log("📋 Registering miniapps to Supabase (Per-Chain Upsert)...\n");

  if (!SUPABASE_URL) {
    console.error("❌ SUPABASE_URL not set");
    process.exit(1);
  }

  if (!SUPABASE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(1);
  }

  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Table: ${TABLE_NAME}`);
  console.log(`   CDN: ${CDN_URL}`);
  console.log("");

  const manifests = getAllManifests();
  console.log(`Found ${manifests.length} miniapps\n`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const manifest of manifests) {
    const supportedNetworks = manifest.supported_networks || ["neo-n3-mainnet"];
    const appName = manifest.name;

    // Determine the correct app_id for this manifest
    const app_id_for_path = manifest.id.startsWith("miniapp-") ? manifest.id : `miniapp-${manifest.id}`;

    for (const chainId of supportedNetworks) {
      try {
        const chainLabel = chainId.replace("neo-n3-", "");
        process.stdout.write(`📦 ${appName} (${chainLabel})... `);

        // Upload assets (only once per app, not per chain)
        if (chainId === supportedNetworks[0]) {
          if (manifest.hasLogo) {
            await uploadAsset(
              path.join(APPS_DIR, manifest.appDir, "static", "logo.png"),
              "miniapps",
              `${app_id_for_path}/logo.png`,
            );
          }
          if (manifest.hasBanner) {
            await uploadAsset(
              path.join(APPS_DIR, manifest.appDir, "static", "banner.png"),
              "miniapps",
              `${app_id_for_path}/banner.png`,
            );
          }
        }

        // Register to database (per chain)
        const result = await upsertMiniapp(manifest, chainId);

        if (result.action === "updated") {
          console.log("✏️  (updated)");
          updated++;
        } else {
          console.log("✅ (inserted)");
          inserted++;
        }
      } catch (error) {
        console.log(`❌`);
        console.error(`   ${error.message}`);
        failed++;
        errors.push({ app: appName, chain: chainId, error: error.message });
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Registration Summary");
  console.log("=".repeat(60));
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`✏️  Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(({ app, chain, error }) => {
      console.log(`  - ${app} (${chain}): ${error}`);
    });
  }

  console.log("\n" + "=".repeat(60));

  // Show categories summary
  await showCategoriesSummary();
}

/**
 * Show categories summary
 */
async function showCategoriesSummary() {
  console.log("\n📊 Categories Summary:\n");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=category,category_name,name&order=category.asc`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    },
  );

  if (!response.ok) {
    console.error("Failed to fetch categories");
    return;
  }

  const data = await response.json();

  // Group by category
  const byCategory = {};
  data.forEach((row) => {
    const cat = row.category || "uncategorized";
    if (!byCategory[cat]) {
      byCategory[cat] = {
        name: row.category_name || cat,
        count: 0,
        apps: [],
      };
    }
    byCategory[cat].count++;
    byCategory[cat].apps.push(row.name);
  });

  Object.entries(byCategory)
    .sort(([, a], [, b]) => b.count - a.count)
    .forEach(([cat, info]) => {
      console.log(`  ${info.name.padEnd(20)} (${cat.padEnd(15)}): ${info.count} apps`);
    });
  console.log("");
}

if (require.main === module) {
  registerAll().catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = { registerAll, getAllManifests, manifestToRecord };
