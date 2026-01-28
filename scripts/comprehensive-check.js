#!/usr/bin/env node
/**
 * Comprehensive check: CDN + Supabase + Consistency
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const APPS_DIR = path.join(__dirname, "../apps");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL;

/**
 * Check 1: Get all miniapps from filesystem
 */
function getLocalMiniapps() {
  const apps = [];
  const dirs = fs.readdirSync(APPS_DIR).filter((dir) => {
    const appPath = path.join(APPS_DIR, dir);
    return fs.statSync(appPath).isDirectory() && !dir.startsWith(".");
  });

  for (const dir of dirs) {
    const appPath = path.join(APPS_DIR, dir);
    const manifestPath = path.join(appPath, "neo-manifest.json");

    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const hasLogo = fs.existsSync(path.join(appPath, "static", "logo.png"));
      const hasBanner = fs.existsSync(path.join(appPath, "static", "banner.png"));

      // Get the built files
      const buildDir = path.join(appPath, "dist/dev");
      const hasIndex = fs.existsSync(path.join(buildDir, "index.html"));

      apps.push({
        folder: dir,
        manifest,
        hasLogo,
        hasBanner,
        hasIndex,
        manifestId: manifest.id,
      });
    } catch (e) {
      console.warn(`  ⚠️  Error reading ${dir}:`, e.message);
    }
  }

  return apps.sort((a, b) => a.folder.localeCompare(b.folder));
}

/**
 * Check 2: Get all registered miniapps from Supabase
 */
async function getSupabaseMiniapps() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&order=name.asc`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch from Supabase");
    return [];
  }

  return response.json();
}

/**
 * Check 3: Verify CDN accessibility
 */
async function checkCDNAccess(miniapp) {
  // CDN folder name uses shortId (without "miniapp-" prefix)
  const folderName = miniapp.manifestId.startsWith("miniapp-")
    ? miniapp.manifestId.replace("miniapp-", "")
    : miniapp.manifestId;
  const url = `${CDN_URL}/miniapps/${folderName}/index.html`;

  try {
    const response = await fetch(url, { method: "HEAD", timeout: 5000 });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Main verification
 */
async function main() {
  console.log("🔍 Comprehensive Miniapp Verification");
  console.log("=".repeat(70));
  console.log("");

  // Check 1: Local apps
  console.log("📂 Step 1: Scanning local miniapps...");
  const localApps = getLocalMiniapps();
  console.log(`   Found ${localApps.length} miniapps in apps/ directory\n`);

  // Check 2: Supabase registration
  console.log("🗄️  Step 2: Checking Supabase registration...");
  const supabaseApps = await getSupabaseMiniapps();
  console.log(`   Found ${supabaseApps.length} registered records\n`);

  // Compare - use short_id (without "miniapp-" prefix) for comparison
  const localShortIds = new Set(
    localApps.map((a) => {
      // Strip "miniapp-" prefix if present
      return a.manifestId.startsWith("miniapp-") ? a.manifestId.replace("miniapp-", "") : a.manifestId;
    }),
  );
  const registeredShortIds = new Set();

  supabaseApps.forEach((r) => {
    if (r.app_short_id) registeredShortIds.add(r.app_short_id);
    else registeredShortIds.add(r.app_id.replace("miniapp-", ""));
  });

  // Find missing registrations
  const missing = localApps.filter((a) => {
    const shortId = a.manifestId.startsWith("miniapp-") ? a.manifestId.replace("miniapp-", "") : a.manifestId;
    return !registeredShortIds.has(shortId);
  });

  if (missing.length > 0) {
    console.log("⚠️  Miniapps NOT registered in Supabase:");
    missing.forEach((a) => {
      console.log(`   - ${a.folder} (id: ${a.manifestId})`);
    });
    console.log("");
  } else {
    console.log("✅ All local miniapps are registered in Supabase\n");
  }

  // Check 3: CDN accessibility
  console.log("🌐 Step 3: Checking CDN accessibility...");
  let cdnAccessible = 0;
  const cdnIssues = [];

  for (const app of localApps) {
    const accessible = await checkCDNAccess(app);
    if (accessible) {
      cdnAccessible++;
    } else {
      cdnIssues.push(app);
    }
  }

  console.log(`   CDN accessible: ${cdnAccessible}/${localApps.length}`);
  if (cdnIssues.length > 0) {
    console.log("⚠️  Miniapps NOT on CDN:");
    cdnIssues.slice(0, 5).forEach((a) => {
      console.log(`   - ${a.folder}`);
    });
    if (cdnIssues.length > 5) {
      console.log(`   ... and ${cdnIssues.length - 5} more`);
    }
  } else {
    console.log("✅ All miniapps accessible on CDN\n");
  }

  // Check 4: Verify entry URLs match
  console.log("🔗 Step 4: Verifying entry URL consistency...");
  let urlIssues = [];

  for (const sb of supabaseApps) {
    if (!sb.entry_url) {
      urlIssues.push({ name: sb.name, issue: "No entry_url" });
      continue;
    }

    const expectedPath = sb.app_short_id || sb.app_id.replace("miniapp-", "");
    const expectedUrl = `${CDN_URL}/miniapps/${expectedPath}/index.html`;

    if (sb.entry_url !== expectedUrl) {
      urlIssues.push({
        name: sb.name,
        app_id: sb.app_id,
        current: sb.entry_url,
        expected: expectedUrl,
      });
    }
  }

  if (urlIssues.length > 0) {
    console.log(`⚠️  Found ${urlIssues.length} entry URL mismatches:`);
    urlIssues.slice(0, 3).forEach((i) => {
      console.log(`   - ${i.name}:`);
      console.log(`     current: ${i.current}`);
      console.log(`     expected: ${i.expected}`);
    });
    console.log("");
  } else {
    console.log("✅ All entry URLs are consistent\n");
  }

  // Check 5: Verify manifest.json storage
  console.log("📄 Step 5: Verifying manifest_json storage...");
  let manifestIssues = [];

  for (const sb of supabaseApps) {
    if (!sb.manifest_json) {
      manifestIssues.push({ name: sb.name, issue: "No manifest_json" });
      continue;
    }

    try {
      const manifest = JSON.parse(sb.manifest_json);
      // Basic validation
      if (!manifest.id || !manifest.name) {
        manifestIssues.push({ name: sb.name, issue: "Invalid manifest" });
      }
    } catch (e) {
      manifestIssues.push({ name: sb.name, issue: "Invalid JSON" });
    }
  }

  if (manifestIssues.length > 0) {
    console.log(`⚠️  Found ${manifestIssues.length} manifest issues:`);
    manifestIssues.forEach((i) => {
      console.log(`   - ${i.name}: ${i.issue}`);
    });
    console.log("");
  } else {
    console.log("✅ All manifests stored correctly\n");
  }

  // Final summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Local miniapps:     ${localApps.length}`);
  console.log(`Supabase records:   ${supabaseApps.length}`);
  console.log(`Missing from DB:     ${missing.length}`);
  console.log(`Not on CDN:         ${cdnIssues.length}`);
  console.log(`URL mismatches:     ${urlIssues.length}`);
  console.log(`Manifest issues:     ${manifestIssues.length}`);
  console.log("");

  // Overall status
  const totalIssues = missing.length + cdnIssues.length + urlIssues.length + manifestIssues.length;
  if (totalIssues === 0) {
    console.log("🎉 ALL CHECKS PASSED! Everything is consistent.");
  } else {
    console.log(`⚠️  Found ${totalIssues} issues that need attention.`);
    console.log("");
    console.log('Run "pnpm register:full" to re-register all miniapps.');
  }
  console.log("=".repeat(70));

  // Show categories breakdown
  const byCategory = {};
  supabaseApps.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  });
  console.log("\n📊 By category:");
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} ${count} apps`);
    });
}

main().catch(console.error);
