#!/usr/bin/env node
/**
 * Migrates miniapp imports from @/shared/ to @shared/
 * and removes per-app shared directories.
 *
 * This consolidates all shared code into the root shared/ directory,
 * eliminating massive code duplication across 41 miniapps.
 */

const fs = require("fs");
const path = require("path");

const appsDir = path.join(__dirname, "..", "apps");
const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  console.log("DRY RUN MODE - no files will be modified\n");
}

// Find all Vue and TS files in apps/*/src
function findSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, and the shared directories (we'll delete those)
      if (!["node_modules", "dist", ".git"].includes(entry.name)) {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.name.endsWith(".vue") || entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Update imports in a file
function updateImports(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  // Pattern to match @/shared/ imports (both from inside src/shared and from pages)
  const patterns = [
    // @/shared/components -> @shared/components
    { from: /@\/shared\//g, to: "@shared/" },
    // ../../../../../shared/ -> @shared/ (re-export stubs)
    { from: /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g, to: "@shared/" },
  ];

  let updated = content;
  let changed = false;

  for (const pattern of patterns) {
    if (pattern.from.test(updated)) {
      updated = updated.replace(pattern.from, pattern.to);
      changed = true;
    }
  }

  if (changed) {
    if (!dryRun) {
      fs.writeFileSync(filePath, updated);
    }
    return true;
  }
  return false;
}

// Remove a directory recursively
function removeDir(dir) {
  if (!fs.existsSync(dir)) return false;
  if (!dryRun) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return true;
}

// Main migration
const apps = fs.readdirSync(appsDir).filter((name) => {
  const appPath = path.join(appsDir, name);
  return fs.statSync(appPath).isDirectory() && fs.existsSync(path.join(appPath, "src"));
});

console.log(`Found ${apps.length} miniapps to migrate\n`);

let filesUpdated = 0;
let dirsRemoved = 0;

for (const app of apps) {
  const appSrcDir = path.join(appsDir, app, "src");
  const appSharedDir = path.join(appSrcDir, "shared");

  // First update all imports in source files (except shared dir itself)
  const srcFiles = findSourceFiles(appSrcDir).filter(
    (f) => !f.includes(path.join("src", "shared"))
  );

  let appFilesUpdated = 0;
  for (const file of srcFiles) {
    if (updateImports(file)) {
      appFilesUpdated++;
      filesUpdated++;
    }
  }

  // Then remove the per-app shared directory
  let sharedRemoved = false;
  if (fs.existsSync(appSharedDir)) {
    sharedRemoved = removeDir(appSharedDir);
    if (sharedRemoved) dirsRemoved++;
  }

  if (appFilesUpdated > 0 || sharedRemoved) {
    console.log(`  [${app}] ${appFilesUpdated} files updated${sharedRemoved ? ", shared/ removed" : ""}`);
  }
}

console.log(`\nMigration complete:`);
console.log(`  - ${filesUpdated} files updated`);
console.log(`  - ${dirsRemoved} shared directories removed`);

if (dryRun) {
  console.log("\nRun without --dry-run to apply changes");
}
