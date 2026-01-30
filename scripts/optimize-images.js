#!/usr/bin/env node
/**
 * Image Optimization Script
 *
 * Optimizes large images in mini-apps for better performance.
 * Run this script before deployment to compress images.
 *
 * Requirements:
 * - npm install -g sharp
 * - or apt install optipng pngquant
 *
 * Usage: node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MINIAPPS_TO_OPTIMIZE = [
  { name: 'coin-flip', maxSizeKB: 200 },
  { name: 'neo-swap', maxSizeKB: 200 },
];

const RECOMMENDED_TOOLS = [
  { name: 'sharp', install: 'npm install -g sharp', description: 'High-performance Node.js image processing' },
  { name: 'optipng', install: 'apt install optipng', description: 'PNG lossless compression' },
  { name: 'pngquant', install: 'apt install pngquant', description: 'PNG lossy compression (25-70% smaller)' },
  { name: 'cwebp', install: 'apt install webp', description: 'WebP format conversion' },
];

function getFileSizeKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch {
    return 0;
  }
}

function findLargeImages(appDir, thresholdKB = 200) {
  const largeImages = [];
  const extensions = ['.png', '.jpg', '.jpeg', '.gif'];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.includes(path.extname(item).toLowerCase())) {
        const sizeKB = getFileSizeKB(fullPath);
        if (sizeKB > thresholdKB) {
          largeImages.push({
            path: fullPath,
            sizeKB: Math.round(sizeKB),
            relativePath: path.relative(appDir, fullPath),
          });
        }
      }
    }
  }

  scanDir(appDir);
  return largeImages.sort((a, b) => b.sizeKB - a.sizeKB);
}

function generateReport() {
  console.log('\n📊 Image Optimization Report\n');
  console.log('='.repeat(60));

  for (const app of MINIAPPS_TO_OPTIMIZE) {
    const appDir = path.join(__dirname, '..', 'apps', app.name);
    const largeImages = findLargeImages(appDir, app.maxSizeKB);

    console.log(`\n🎮 ${app.name} (max: ${app.maxSizeKB}KB)\n`);

    if (largeImages.length === 0) {
      console.log('  ✅ No oversized images found');
    } else {
      let totalSize = 0;
      for (const img of largeImages) {
        console.log(`  ⚠️  ${img.relativePath}`);
        console.log(`     Size: ${img.sizeKB}KB`);
        totalSize += img.sizeKB;
      }
      console.log(`\n  Total: ${totalSize}KB`);
      console.log(`  Potential savings: ~${Math.round(totalSize * 0.6)}KB (60% with WebP)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🔧 Recommended Tools:\n');

  for (const tool of RECOMMENDED_TOOLS) {
    console.log(`  ${tool.name.padEnd(12)} - ${tool.install}`);
    console.log(`                 ${tool.description}\n`);
  }

  console.log('\n🚀 Quick Start:\n');
  console.log('  # Install sharp');
  console.log('  npm install -g sharp\n');

  console.log('  # Convert PNG to WebP (best compression)');
  console.log('  for f in *.png; do cwebp -q 85 "$f" -o "${f%.png}.webp"; done\n');

  console.log('  # Or use optipng for lossless optimization');
  console.log('  find . -name "*.png" -exec optipng -o7 {} \\;\n');
}

// Only run if called directly
if (require.main === module) {
  generateReport();
}

module.exports = { findLargeImages, getFileSizeKB, generateReport };
