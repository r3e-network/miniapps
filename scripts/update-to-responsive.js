#!/usr/bin/env node
/**
 * Update Miniapps to ResponsiveLayout
 * 
 * This script updates all miniapps to use ResponsiveLayout instead of AppLayout,
 * enabling proper responsive design for both web and mobile views.
 * 
 * Usage: node scripts/update-to-responsive.js
 */

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(__dirname, '../apps');

// Find all miniapp directories
function getMiniapps() {
  return fs.readdirSync(APPS_DIR)
    .filter(dir => {
      const dirPath = path.join(APPS_DIR, dir);
      return fs.statSync(dirPath).isDirectory() && 
             fs.existsSync(path.join(dirPath, 'package.json'));
    })
    .sort();
}

// Check if a file uses AppLayout
function usesAppLayout(content) {
  return content.includes('AppLayout') && !content.includes('ResponsiveLayout');
}

// Update AppLayout to ResponsiveLayout
function updateLayout(content) {
  // Replace imports
  content = content.replace(
    /import\s+{\s*AppLayout\s*}\s+from\s+["']@shared\/components["'];?/g,
    `import { ResponsiveLayout } from "@shared/components";`
  );
  
  // Replace component usage (simple cases)
  content = content.replace(
    /<AppLayout\s+/g,
    '<ResponsiveLayout '
  );
  
  content = content.replace(
    /<\/AppLayout>/g,
    '</ResponsiveLayout>'
  );
  
  // Add desktop-breakpoint prop if not present
  if (!content.includes('desktop-breakpoint')) {
    content = content.replace(
      /<ResponsiveLayout\s+class="theme-/g,
      '<ResponsiveLayout :desktop-breakpoint="1024" class="theme-'
    );
  }
  
  return content;
}

// Update a single file
function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!usesAppLayout(content)) {
    return false; // No update needed
  }
  
  const updated = updateLayout(content);
  fs.writeFileSync(filePath, updated, 'utf-8');
  return true;
}

// Process a miniapp
function processMiniapp(miniappName) {
  const miniappPath = path.join(APPS_DIR, miniappName);
  const srcPath = path.join(miniappPath, 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.log(`  ⚠️  No src directory found`);
    return { updated: false, files: 0 };
  }
  
  let updatedFiles = 0;
  
  // Find all Vue files
  function findVueFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findVueFiles(fullPath));
      } else if (item.endsWith('.vue')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const vueFiles = findVueFiles(srcPath);
  
  for (const file of vueFiles) {
    try {
      if (updateFile(file)) {
        updatedFiles++;
        console.log(`  ✓ Updated: ${path.relative(miniappPath, file)}`);
      }
    } catch (error) {
      console.error(`  ✗ Error updating ${file}: ${error.message}`);
    }
  }
  
  return { updated: updatedFiles > 0, files: updatedFiles };
}

// Main function
function main() {
  console.log('🔄 Updating Miniapps to ResponsiveLayout\n');
  
  const miniapps = getMiniapps();
  console.log(`Found ${miniapps.length} miniapps\n`);
  
  let updatedCount = 0;
  let totalFiles = 0;
  
  for (const miniapp of miniapps) {
    console.log(`Processing: ${miniapp}`);
    const result = processMiniapp(miniapp);
    
    if (result.updated) {
      updatedCount++;
      totalFiles += result.files;
    } else if (result.files === 0) {
      console.log(`  ℹ️  Already using ResponsiveLayout or no AppLayout found`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Updated ${updatedCount}/${miniapps.length} miniapps`);
  console.log(`📄 Modified ${totalFiles} files`);
  console.log('='.repeat(50));
}

main();
