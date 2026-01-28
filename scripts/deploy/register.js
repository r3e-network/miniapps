#!/usr/bin/env node
/**
 * Register Miniapps with Platform
 *
 * Registers miniapps with the central platform using their neo-manifest.json
 * The platform tracks user activity, transactions, comments, scores, etc.
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const APPS_DIR = path.join(__dirname, "../../apps");
const PLATFORM_API = process.env.PLATFORM_API_URL || "https://platform.example.com/api";
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY || "";

/**
 * Get all miniapp manifests
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

    let manifest = {
      app_id: `miniapp-${appName}`,
      name: appName,
      name_zh: appName,
      description: "",
      description_zh: "",
      icon: `/miniapps/${appName}/static/logo.png`,
      banner: `/miniapps/${appName}/static/banner.png`,
      entry_url: `/miniapps/${appName}/index.html`,
      category: "utility",
      status: "active",
      version: "1.0.0",
    };

    // Load custom manifest
    if (fs.existsSync(manifestPath)) {
      try {
        const customManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        manifest = { ...manifest, ...customManifest };
      } catch (e) {
        console.warn(`⚠️  Failed to load manifest for ${appName}: ${e.message}`);
      }
    }

    // Check if built
    const publicDir = path.join(__dirname, "../../public/miniapps", appName);
    if (fs.existsSync(publicDir)) {
      const indexHtml = path.join(publicDir, "index.html");
      if (fs.existsSync(indexHtml)) {
        manifest.status = "active";
        manifest.built_at = new Date().toISOString();
      } else {
        manifest.status = "inactive";
      }
    } else {
      manifest.status = "inactive";
    }

    manifests.push(manifest);
  }

  return manifests;
}

/**
 * Register single miniapp with platform
 */
async function registerMiniapp(manifest) {
  if (!PLATFORM_API_KEY) {
    console.warn("⚠️  No PLATFORM_API_KEY configured, skipping registration");
    return null;
  }

  try {
    const response = await fetch(`${PLATFORM_API}/miniapps/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PLATFORM_API_KEY}`,
      },
      body: JSON.stringify({
        manifest: manifest,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Registered ${manifest.app_id}: ${result.id || result.platform_url}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to register ${manifest.app_id}: ${error.message}`);
    return null;
  }
}

/**
 * Register all miniapps
 */
async function registerAll() {
  console.log("📡 Registering miniapps with platform...\n");

  const manifests = getAllManifests();
  console.log(`Found ${manifests.length} miniapps\n`);

  let registered = 0;
  let failed = 0;

  for (const manifest of manifests) {
    const result = await registerMiniapp(manifest);
    if (result) {
      registered++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Registration Summary:`);
  console.log(`✅ Registered: ${registered}`);
  console.log(`❌ Failed: ${failed}`);
}

/**
 * Update miniapp status on platform
 */
async function updateStatus(appId, status) {
  if (!PLATFORM_API_KEY) {
    throw new Error("No PLATFORM_API_KEY configured");
  }

  const response = await fetch(`${PLATFORM_API}/miniapps/${appId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PLATFORM_API_KEY}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Report user activity to platform
 */
async function reportActivity(appId, activity) {
  if (!PLATFORM_API_KEY) {
    console.warn("⚠️  No PLATFORM_API_KEY configured, skipping activity report");
    return null;
  }

  try {
    const response = await fetch(`${PLATFORM_API}/miniapps/${appId}/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PLATFORM_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: appId,
        activity: activity.type, // 'view', 'transaction', 'comment', 'score', etc.
        data: activity.data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`⚠️  Failed to report activity: ${error.message}`);
    return null;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node scripts/deploy/register.js [command] [options]

Commands:
  (none)           Register all miniapps
  status <app-id>   Update miniapp status

Options:
  --help, -h       Show this help message

Examples:
  node scripts/deploy/register.js
  node scripts/deploy/register.js status miniapp-lottery active
    `);
    process.exit(0);
  }

  (async () => {
    if (args[0] === "status") {
      const appId = args[1];
      const status = args[2] || "active";
      await updateStatus(appId, status);
      console.log(`✅ Updated ${appId} status to ${status}`);
    } else {
      await registerAll();
    }
  })().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

module.exports = { registerMiniapp, registerAll, updateStatus, reportActivity };
