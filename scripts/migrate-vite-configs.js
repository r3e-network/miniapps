#!/usr/bin/env node
/**
 * Migrates all miniapp vite.config.ts files to use the shared configuration.
 *
 * This script replaces the verbose per-app vite config with a simple import
 * from the shared vite.shared.ts, reducing duplication significantly.
 */

const fs = require("fs");
const path = require("path");

const appsDir = path.join(__dirname, "..", "apps");
const standardConfig = `import { createAppConfig } from "../../vite.shared";

// @ts-expect-error __dirname is provided by Vite at runtime
export default createAppConfig(__dirname);
`;

const apps = fs.readdirSync(appsDir).filter((name) => {
  const appPath = path.join(appsDir, name);
  return fs.statSync(appPath).isDirectory() && fs.existsSync(path.join(appPath, "vite.config.ts"));
});

console.log(`Found ${apps.length} miniapps with vite.config.ts`);

let updated = 0;
let skipped = 0;

for (const app of apps) {
  const configPath = path.join(appsDir, app, "vite.config.ts");
  const current = fs.readFileSync(configPath, "utf-8");

  // Skip if already migrated
  if (current.includes("createAppConfig")) {
    console.log(`  [SKIP] ${app} - already uses shared config`);
    skipped++;
    continue;
  }

  // Check for custom options that need to be preserved
  const hasPublicDir = current.includes("publicDir:");
  const hasCustomOptions = current.includes("css:") || current.includes("define:");

  if (hasCustomOptions) {
    console.log(`  [SKIP] ${app} - has custom options that need manual migration`);
    skipped++;
    continue;
  }

  let newConfig = standardConfig;

  // Preserve publicDir if present
  if (hasPublicDir) {
    const publicDirMatch = current.match(/publicDir:\s*["']([^"']+)["']/);
    if (publicDirMatch) {
      newConfig = `import { createAppConfig } from "../../vite.shared";

// @ts-expect-error __dirname is provided by Vite at runtime
export default createAppConfig(__dirname, {
  build: { publicDir: "${publicDirMatch[1]}" },
});
`;
    }
  }

  fs.writeFileSync(configPath, newConfig);
  console.log(`  [OK] ${app}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
