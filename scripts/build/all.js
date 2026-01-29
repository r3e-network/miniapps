#!/usr/bin/env node
/**
 * Build all miniapps (Node.js version)
 *
 * Replaces the bash-based build-all.sh with a more robust Node.js implementation.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const APPS_DIR = path.join(__dirname, "../../apps");
const OUTPUT_DIR = path.join(__dirname, "../../public/miniapps");
const ANALYZE = process.env.BUILD_ANALYZE === "true";

/**
 * Build a single miniapp
 */
function buildApp(appName, appPath) {
  const packageJsonPath = path.join(appPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return { success: true, skipped: true, reason: "no package.json" };
  }

  const originalDir = process.cwd();

  try {
    process.chdir(appPath);

    // Install dependencies if needed
    if (!fs.existsSync("node_modules")) {
      console.log(`  📦 Installing dependencies for ${appName}`);
      execSync("pnpm install --silent", {
        stdio: ANALYZE ? "inherit" : "pipe",
        timeout: 120000,
      });
    }

    // Try different build commands
    const buildCommands = ["pnpm build:h5", "pnpm build", "npm run build:h5", "npm run build"];

    let buildSuccess = false;
    for (const cmd of buildCommands) {
      try {
        execSync(cmd, {
          stdio: ANALYZE ? "inherit" : "pipe",
          timeout: 180000,
        });
        buildSuccess = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!buildSuccess) {
      return { success: false, error: "All build commands failed" };
    }

    // Check build output
    const buildDir = path.join(appPath, "dist/build/h5");
    if (!fs.existsSync(buildDir)) {
      return { success: false, error: "Build output not found" };
    }

    // Use folder name as output folder name (consistent with registry)
    const outputFolderName = appName;
    const manifestPath = path.join(appPath, "neo-manifest.json");

    // Copy to output directory
    const outputAppDir = path.join(OUTPUT_DIR, outputFolderName);

    if (fs.existsSync(outputAppDir)) {
      fs.rmSync(outputAppDir, { recursive: true });
    }

    fs.mkdirSync(outputAppDir, { recursive: true });
    fs.cpSync(buildDir, outputAppDir, { recursive: true });

    // Copy static assets if missing (from src/static or public)
    const appStaticDir = path.join(outputAppDir, "static");
    fs.mkdirSync(appStaticDir, { recursive: true });

    const staticDirs = [path.join(appPath, "src/static"), path.join(appPath, "public")];
    
    for (const staticDir of staticDirs) {
      if (fs.existsSync(staticDir)) {
        ["logo.png", "banner.png"].forEach((asset) => {
          const src = path.join(staticDir, asset);
          const dest = path.join(appStaticDir, asset);
          if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.copyFileSync(src, dest);
          }
        });
      }
    }

    // Copy manifest if exists (manifestPath already declared above)
    if (fs.existsSync(manifestPath)) {
      fs.copyFileSync(manifestPath, path.join(outputAppDir, "neo-manifest.json"));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    process.chdir(originalDir);
  }
}

/**
 * Build all miniapps
 */
function buildAllApps() {
  console.log("🔨 Building all uni-app MiniApps...\n");

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const appDirs = fs.readdirSync(APPS_DIR);
  const results = {
    built: [],
    failed: [],
    skipped: [],
  };

  for (const appDir of appDirs) {
    const appPath = path.join(APPS_DIR, appDir);

    // Skip non-directories and hidden folders
    if (!fs.statSync(appPath).isDirectory() || appDir.startsWith(".")) {
      continue;
    }

    console.log(`📦 Building ${appDir}...`);

    const result = buildApp(appDir, appPath);

    if (result.success) {
      if (result.skipped) {
        console.log(`  ⊘ Skipped: ${result.reason}\n`);
        results.skipped.push({ app: appDir, reason: result.reason });
      } else {
        console.log(`  ✅ Success\n`);
        results.built.push(appDir);
      }
    } else {
      console.log(`  ❌ Failed: ${result.error}\n`);
      results.failed.push({ app: appDir, error: result.error });
    }
  }

  // Generate registry
  console.log("📝 Generating app registry...");
  try {
    execSync("node scripts/auto-discover-miniapps.js", {
      cwd: path.join(__dirname, "../.."),
      stdio: ANALYZE ? "inherit" : "pipe",
    });
    console.log("  ✅ Registry generated\n");
  } catch (error) {
    console.warn("  ⚠️  Registry generation failed\n");
  }

  // Print summary
  console.log("=".repeat(60));
  console.log(`Built: ${results.built.length} apps`);
  console.log(`Failed: ${results.failed.length} apps`);
  console.log(`Skipped: ${results.skipped.length} apps`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log("=".repeat(60));

  if (results.failed.length > 0) {
    console.log("\n❌ Failed apps:");
    results.failed.forEach(({ app, error }) => {
      console.log(`  - ${app}: ${error}`);
    });
    process.exit(1);
  }

  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--analyze") || args.includes("-a")) {
    process.env.BUILD_ANALYZE = "true";
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node scripts/build/all.js [options]

Options:
  --analyze, -a    Show detailed build output
  --help, -h       Show this help message

Examples:
  node scripts/build/all.js
  node scripts/build/all.js --analyze
    `);
    process.exit(0);
  }

  buildAllApps();
}

module.exports = { buildAllApps, buildApp };
