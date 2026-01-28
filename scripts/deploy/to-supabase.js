#!/usr/bin/env node
/**
 * Register Miniapps to Supabase
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const APPS_DIR = path.join(__dirname, "../../apps");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_NAME = "miniapp_stats";

function getAllManifests() {
  const manifests = [];
  const appDirs = fs.readdirSync(APPS_DIR).filter((dir) => {
    const appPath = path.join(APPS_DIR, dir);
    return fs.statSync(appPath).isDirectory() && !dir.startsWith(".");
  });

  for (const appName of appDirs) {
    const appPath = path.join(APPS_DIR, appName);
    const manifestPath = path.join(appPath, "neo-manifest.json");
    const pkgPath = path.join(appPath, "package.json");

    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    let manifest = {
      app_id: `miniapp-${appName}`,
      name: appName,
      name_zh: appName,
      description: "",
      description_zh: "",
      category: "utility",
      version: "1.0.0",
      status: "active",
    };

    try {
      const customManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifest = { ...manifest, ...customManifest };
    } catch (e) {
      // Use defaults
    }

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.version) manifest.version = pkg.version;
      } catch (e) {
        // Ignore
      }
    }

    const staticDir = path.join(appPath, "static");
    const logoPath = path.join(staticDir, "logo.png");
    const bannerPath = path.join(staticDir, "banner.png");

    manifest.hasLogo = fs.existsSync(logoPath);
    manifest.hasBanner = fs.existsSync(bannerPath);
    manifest.logoPath = manifest.hasLogo ? logoPath : null;
    manifest.bannerPath = manifest.hasBanner ? bannerPath : null;

    manifests.push(manifest);
  }

  return manifests;
}

async function uploadFile(filePath, bucket, fileName) {
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

async function registerMiniapp(manifest) {
  const logoUrl = manifest.hasLogo
    ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${manifest.app_id}/logo.png`
    : null;
  const bannerUrl = manifest.hasBanner
    ? `${SUPABASE_URL}/storage/v1/object/public/miniapps/${manifest.app_id}/banner.png`
    : null;

  // Use columns that exist in the table
  const miniappData = {
    app_id: manifest.app_id,
    name: manifest.name,
    name_zh: manifest.name_zh || manifest.name,
    description: manifest.description || "",
    description_zh: manifest.description_zh || manifest.description || "",
    category: manifest.category || "utility",
    logo_url: logoUrl,
    banner_url: bannerUrl,
    version: manifest.version,
    status: manifest.status || "active",
    entry_url: `https://meshmini.app/miniapps/${manifest.app_id.replace("miniapp-", "")}/index.html`,
    view_count: 0,
    total_unique_users: 0,
    total_transactions: 0,
    rating: 0,
    rating_count: 0,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(miniappData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Registration failed: ${error}`);
  }

  return miniappData;
}

async function registerAll() {
  console.log("📋 Registering miniapps to Supabase...\n");

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
  console.log("");

  const manifests = getAllManifests();
  console.log(`Found ${manifests.length} miniapps\n`);

  let registered = 0;
  let failed = 0;
  const errors = [];

  for (const manifest of manifests) {
    try {
      process.stdout.write(`📦 ${manifest.name} (${manifest.app_id})... `);

      // Upload logo
      if (manifest.hasLogo) {
        await uploadFile(manifest.logoPath, "miniapps", `${manifest.app_id}/logo.png`);
      }

      // Upload banner
      if (manifest.hasBanner) {
        await uploadFile(manifest.bannerPath, "miniapps", `${manifest.app_id}/banner.png`);
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
  console.log(`✅ Registered: ${registered}`);
  console.log(`❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(({ app, error }) => {
      console.log(`  - ${app}: ${error}`);
    });
  }

  console.log("\n" + "=".repeat(60));
}

if (require.main === module) {
  registerAll().catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = { registerAll, getAllManifests };
