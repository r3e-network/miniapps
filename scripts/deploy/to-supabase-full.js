#!/usr/bin/env node
/**
 * Register Miniapps to Supabase - Full Registration
 *
 * This script reads neo-manifest.json from each miniapp and stores
 * comprehensive data in Supabase for listing, sorting, categorizing.
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
 * Convert manifest to database record
 */
function manifestToRecord(manifest) {
  const appId = `miniapp-${manifest.id}`;

  // Build URLs
  const logoUrl = manifest.hasLogo ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${appId}/logo.png` : null;
  const bannerUrl = manifest.hasBanner ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${appId}/banner.png` : null;

  const entryUrl = `${CDN_URL}/miniapps/${manifest.id}/index.html`;

  // Get contract address for default network
  const contractAddress = manifest.contracts?.[manifest.default_network]?.address || null;

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
    // Basic identifiers
    app_id: appId,
    app_short_id: manifest.id,
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

    // Contract and network
    contract_address: contractAddress,
    default_network: manifest.default_network || "neo-n3-mainnet",

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

    // Status
    is_featured: false,
    is_verified: false,
    is_active: true,
    sort_order: 0,
    popularity_score: 0,

    // Stats
    view_count: 0,
    total_unique_users: 0,
    total_transactions: 0,
    rating: 0,
    rating_count: 0,

    // Metadata
    last_used_at: null,
    manifest_json: JSON.stringify(manifest),
    searchable_text: searchableParts,

    // Timestamps
    updated_at: new Date().toISOString(),
  };
}

/**
 * Register a single miniapp
 */
async function registerMiniapp(manifest) {
  const record = manifestToRecord(manifest);

  // Check if exists
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?app_id=eq.${record.app_id}&select=app_id`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  const exists = checkResponse.ok && (await checkResponse.json()).length > 0;

  // Use upsert (merge-duplicates) for both insert and update
  const method = "POST";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
    method,
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Prefer: exists ? "resolution=merge-duplicates" : "return=representation",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Registration failed: ${error}`);
  }

  return record;
}

/**
 * Main registration function
 */
async function registerAll() {
  console.log("📋 Registering miniapps to Supabase (Full Schema)...\n");

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

  let registered = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const manifest of manifests) {
    try {
      process.stdout.write(`📦 ${manifest.name} (${manifest.id})... `);

      // Upload logo
      if (manifest.hasLogo) {
        await uploadAsset(
          path.join(APPS_DIR, manifest.appDir, "static", "logo.png"),
          "miniapps",
          `miniapp-${manifest.id}/logo.png`,
        );
      }

      // Upload banner
      if (manifest.hasBanner) {
        await uploadAsset(
          path.join(APPS_DIR, manifest.appDir, "static", "banner.png"),
          "miniapps",
          `miniapp-${manifest.id}/banner.png`,
        );
      }

      // Register to database
      await registerMiniapp(manifest);

      console.log("✅");
      registered++;
    } catch (error) {
      console.log(`❌`);
      console.error(`   ${error.message}`);
      failed++;
      errors.push({ app: manifest.name, error: error.message });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Registration Summary");
  console.log("=".repeat(60));
  console.log(`✅ Registered/Updated: ${registered}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(({ app, error }) => {
      console.log(`  - ${app}: ${error}`);
    });
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * Get categories summary
 */
async function getCategoriesSummary() {
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

  Object.entries(byCategory).forEach(([cat, info]) => {
    console.log(`  ${info.name.padEnd(20)} (${cat.padEnd(15)}): ${info.count} apps`);
  });
  console.log("");
}

if (require.main === module) {
  registerAll()
    .then(() => getCategoriesSummary())
    .catch((error) => {
      console.error("\n❌ Fatal error:", error.message);
      process.exit(1);
    });
}

module.exports = { registerAll, getAllManifests, manifestToRecord };
