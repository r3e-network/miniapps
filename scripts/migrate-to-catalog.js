#!/usr/bin/env node
/**
 * Migrate miniapp package.json files to use pnpm catalog
 *
 * This script:
 * 1. Reads each miniapp's package.json
 * 2. Replaces common dependency versions with "catalog:" references
 * 3. Writes the simplified package.json back
 *
 * Run: node scripts/migrate-to-catalog.js
 */
const fs = require("fs");
const path = require("path");

const APPS_DIR = path.join(__dirname, "../apps");

// Dependencies that should use catalog (version will be replaced with "catalog:")
const CATALOG_DEPS = new Set([
  // Core uni-app
  "@dcloudio/uni-app",
  "@dcloudio/uni-components",
  "@dcloudio/uni-h5",
  "@dcloudio/uni-cli-shared",
  "@dcloudio/vite-plugin-uni",
  // Build tools
  "vue",
  "vite",
  "typescript",
  "sass",
  "terser",
  // Crypto (if present)
  "@cityofzion/neon-core",
  "@noble/curves",
  "@noble/hashes",
]);

function processPackageJson(appPath) {
  const pkgPath = path.join(appPath, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  let modified = false;

  // Process dependencies
  for (const depType of ["dependencies", "devDependencies"]) {
    if (!pkg[depType]) continue;

    for (const [name, version] of Object.entries(pkg[depType])) {
      if (CATALOG_DEPS.has(name) && version !== "catalog:") {
        pkg[depType][name] = "catalog:";
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`✅ Migrated: ${path.basename(appPath)}`);
    return true;
  }

  console.log(`⏭️  Skipped: ${path.basename(appPath)} (already migrated or no catalog deps)`);
  return false;
}

function main() {
  console.log("🔄 Migrating miniapps to pnpm catalog...\n");

  const apps = fs.readdirSync(APPS_DIR).filter((name) => {
    const appPath = path.join(APPS_DIR, name);
    return fs.statSync(appPath).isDirectory() && fs.existsSync(path.join(appPath, "package.json"));
  });

  let migrated = 0;
  for (const app of apps) {
    if (processPackageJson(path.join(APPS_DIR, app))) {
      migrated++;
    }
  }

  console.log(`\n📦 Migration complete: ${migrated}/${apps.length} apps migrated`);
  console.log('⚠️  Run "pnpm install" to update lockfile');
}

main();
