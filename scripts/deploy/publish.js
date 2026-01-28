#!/usr/bin/env node
/**
 * Publish Miniapps to Platform
 *
 * Complete local deployment workflow:
 * 1. Build miniapp(s)
 * 2. Upload to Cloudflare R2
 * 3. Register with platform
 *
 * Usage:
 *   node scripts/deploy/publish.js [app-names...]
 *
 * Examples:
 *   node scripts/deploy/publish.js              # Publish all
 *   node scripts/deploy/publish.js lottery       # Single app
 *   node scripts/deploy/publish.js lottery red-envelope  # Multiple apps
 *
 * Environment:
 *   NODE_ENV=production | staging (default: production)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const ENVIRONMENT = process.env.NODE_ENV || process.env.DEPLOY_ENVIRONMENT || "production";
const APPS_DIR = path.join(__dirname, "../../apps");
const BUILD_OUTPUT_DIR = path.join(__dirname, "../../public/miniapps");

// Import deployment functions
const { uploadDirectory, uploadFile } = require("./to-r2.js");
const { registerMiniapp, reportActivity } = require("./register.js");

/**
 * Get miniapp manifest from neo-manifest.json or defaults
 */
function getMiniappManifest(appName, buildDir) {
  const manifestPath = path.join(APPS_DIR, appName, "neo-manifest.json");
  const pkgPath = path.join(APPS_DIR, appName, "package.json");

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

  // Load custom manifest if exists
  if (fs.existsSync(manifestPath)) {
    try {
      const customManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifest = { ...manifest, ...customManifest };
    } catch (e) {
      console.warn(`  ⚠️  Failed to load neo-manifest.json: ${e.message}`);
    }
  }

  // Load version from package.json
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.version) {
        manifest.version = pkg.version;
      }
      if (pkg.description) {
        manifest.description = pkg.description;
      }
    } catch (e) {
      console.warn(`  ⚠️  Failed to load package.json: ${e.message}`);
    }
  }

  // Add build timestamp
  manifest.built_at = new Date().toISOString();
  manifest.environment = ENVIRONMENT;

  // Add CDN URL
  const baseURL = process.env.CDN_URL || `https://miniapps.example.com`;
  manifest.cdn_url = `${baseURL}/miniapps/${appName}/`;
  manifest.entry_url = `${baseURL}/miniapps/${appName}/index.html`;

  return manifest;
}

/**
 * Build a single miniapp
 */
async function buildMiniapp(appName) {
  const appPath = path.join(APPS_DIR, appName);
  console.log(`\n🔨 Building ${appName}...`);

  // Check if app directory exists
  if (!fs.existsSync(appPath)) {
    throw new Error(`App directory not found: ${appName}`);
  }

  // Check for package.json
  const pkgPath = path.join(appPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found for: ${appName}`);
  }

  // Install dependencies if needed
  const nodeModulesPath = path.join(appPath, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`  📦 Installing dependencies...`);
    try {
      execSync("pnpm install --silent", { cwd: appPath, stdio: "pipe" });
    } catch (e) {
      console.warn(`  ⚠️  Dependency installation had issues, continuing...`);
    }
  }

  // Try to build
  const buildCommands = ["pnpm build:h5", "pnpm build"];
  let buildSuccess = false;
  let lastError = null;

  for (const cmd of buildCommands) {
    try {
      console.log(`  🏗️  Running ${cmd}...`);
      execSync(cmd, { cwd: appPath, stdio: "pipe" });
      buildSuccess = true;
      break;
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  if (!buildSuccess) {
    throw new Error(`Build failed: ${lastError?.message || "Unknown error"}`);
  }

  // Find build output
  const possibleOutputDirs = [
    path.join(appPath, "dist/build/h5"),
    path.join(appPath, "dist"),
    path.join(appPath, "build"),
  ];

  let buildDir = null;
  for (const dir of possibleOutputDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, "index.html"))) {
      buildDir = dir;
      break;
    }
  }

  if (!buildDir) {
    throw new Error("Build output not found (no index.html)");
  }

  // Copy to output directory
  const outputDir = path.join(BUILD_OUTPUT_DIR, appName);
  fs.mkdirSync(path.dirname(outputDir), { recursive: true });

  // Remove existing output
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // Copy build output
  fs.cpSync(buildDir, outputDir, { recursive: true });

  console.log(`  ✅ Built to ${outputDir}`);

  return {
    appName,
    outputDir,
    buildDir,
  };
}

/**
 * Upload miniapp to R2
 */
async function uploadToR2(appName, outputDir) {
  console.log(`\n📤 Uploading ${appName} to R2...`);

  const remotePrefix = `miniapps/${appName}/`;

  try {
    // Use uploadDirectory from to-r2.js
    const { uploadDirectory } = require("./to-r2.js");
    const result = await uploadDirectory(outputDir, remotePrefix);

    console.log(`  ✅ Uploaded ${result.uploadedCount} files`);
    if (result.skippedCount > 0) {
      console.log(`  ⊘ Skipped ${result.skippedCount} files`);
    }

    if (result.errors.length > 0) {
      console.warn(`  ⚠️  ${result.errors.length} errors occurred`);
      result.errors.slice(0, 3).forEach((err) => {
        console.warn(`    - ${err.file}: ${err.error}`);
      });
    }

    const baseURL = process.env.CDN_URL || `https://miniapps.example.com`;
    return `${baseURL}/miniapps/${appName}/`;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Register miniapp with platform
 */
async function registerWithPlatform(manifest) {
  console.log(`\n📋 Registering ${manifest.app_id} with platform...`);

  try {
    const result = await registerMiniapp(manifest);
    if (result) {
      console.log(`  ✅ Registered: ${result.id || manifest.app_id}`);
      return result;
    } else {
      console.warn(`  ⚠️  Registration returned no result`);
      return null;
    }
  } catch (error) {
    console.warn(`  ⚠️  Registration failed: ${error.message}`);
    return null;
  }
}

/**
 * Publish a single miniapp
 */
async function publishMiniapp(appName) {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(60));
  console.log(`🚀 Publishing: ${appName}`);
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Build
    const buildResult = await buildMiniapp(appName);

    // Step 2: Get manifest
    const manifest = getMiniappManifest(appName, buildResult.outputDir);
    console.log(`\n📄 Manifest: ${manifest.name} v${manifest.version}`);

    // Step 3: Upload to R2
    const cdnUrl = await uploadToR2(appName, buildResult.outputDir);
    manifest.cdn_url = cdnUrl;

    // Step 4: Register with platform
    await registerWithPlatform(manifest);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ ${appName} published successfully in ${duration}s`);
    console.log("   " + "-".repeat(56));

    return {
      success: true,
      appName,
      manifest,
      duration,
    };
  } catch (error) {
    console.error(`\n❌ Failed to publish ${appName}: ${error.message}`);
    console.error("   " + "-".repeat(56));

    return {
      success: false,
      appName,
      error: error.message,
    };
  }
}

/**
 * Get all available miniapps
 */
function getAllMiniapps() {
  const dirs = fs.readdirSync(APPS_DIR).filter((dir) => {
    const appPath = path.join(APPS_DIR, dir);
    return fs.statSync(appPath).isDirectory() && !dir.startsWith(".");
  });

  return dirs.sort();
}

/**
 * Main publish function
 */
async function publish() {
  const args = process.argv.slice(2);

  // Filter out environment flags
  const appNames = args.filter((arg) => !arg.startsWith("--"));

  let appsToPublish = appNames;

  // If no apps specified, publish all
  if (appsToPublish.length === 0) {
    appsToPublish = getAllMiniapps();
    console.log(`\n📦 Publishing all miniapps (${appsToPublish.length} apps)`);
  }

  console.log(`\n🎯 Environment: ${ENVIRONMENT}`);
  console.log(`🌐 CDN: ${process.env.CDN_URL || "https://miniapps.example.com"}`);
  console.log(`📦 Apps: ${appsToPublish.join(", ")}`);

  // Publish each app
  const results = [];

  for (const appName of appsToPublish) {
    const result = await publishMiniapp(appName);
    results.push(result);
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 PUBLISH SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✅ Published: ${successful.length}/${results.length}`);

  if (successful.length > 0) {
    successful.forEach((r) => {
      console.log(`   ✓ ${r.appName} (${r.duration}s)`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach((r) => {
      console.log(`   ✗ ${r.appName}: ${r.error}`);
    });
  }

  console.log("\n" + "=".repeat(60));

  // Exit with error if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// Run publish
if (require.main === module) {
  publish().catch((error) => {
    console.error("\n❌ Publish failed:", error.message);
    process.exit(1);
  });
}

module.exports = { publishMiniapp, publish, getMiniappManifest };
