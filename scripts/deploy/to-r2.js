#!/usr/bin/env node
/**
 * Deploy miniapps to Cloudflare R2
 *
 * Usage:
 *   node scripts/deploy/to-r2.js [environment]
 *
 * Environment:
 *   development | staging | production (default: production)
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration
const ENVIRONMENT = process.argv[2] || process.env.DEPLOY_ENVIRONMENT || 'production';
const PUBLIC_DIR = path.join(__dirname, '../../public');
const CONFIG = loadConfig();

// S3 Client for R2
const s3Client = new S3Client({
  region: process.env.CLOUDFLARE_R2_REGION || 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Load environment-specific configuration
 */
function loadConfig() {
  const configPath = path.join(__dirname, `../../config/environments/${ENVIRONMENT}.json`);

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log(`📋 Loaded configuration for: ${config.name}`);

  return config;
}

/**
 * Get content type based on file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get cache control header based on file type
 */
function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // HTML files - short cache
  if (ext === '.html') {
    return CONFIG.features.caching ? 'public, max-age=0, must-revalidate' : 'no-cache';
  }

  // Static assets - long cache
  if (['.js', '.css', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
    return CONFIG.features.caching ? 'public, max-age=31536000, immutable' : 'no-cache';
  }

  // Images - medium cache
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) {
    return CONFIG.features.caching ? 'public, max-age=86400' : 'no-cache';
  }

  // JSON - short cache for data files
  if (ext === '.json') {
    return 'public, max-age=300';
  }

  return 'public, max-age=3600';
}

/**
 * Check if file should be uploaded
 */
function shouldUpload(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Skip system files
  if (basename.startsWith('.') || basename.endsWith('.map')) {
    return false;
  }

  // Skip source maps unless explicitly enabled
  if (ext === '.map' && process.env.BUILD_SOURCEMAP !== 'true') {
    return false;
  }

  return true;
}

/**
 * Upload a single file to R2
 */
async function uploadFile(localPath, remoteKey) {
  const fileContent = fs.createReadStream(localPath);

  const command = new PutObjectCommand({
    Bucket: CONFIG.r2.bucket,
    Key: remoteKey,
    Body: fileContent,
    ContentType: getContentType(remoteKey),
    CacheControl: getCacheControl(remoteKey),
  });

  await s3Client.send(command);
}

/**
 * Recursively upload directory to R2
 */
async function uploadDirectory(localDir, remotePrefix = '') {
  let uploadedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const walkDirectory = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);
      const remoteKey = relativePath.replace(/\\/g, '/');

      if (entry.isDirectory()) {
        walkDirectory(fullPath, relativePath);
      } else if (entry.isFile()) {
        if (!shouldUpload(fullPath)) {
          skippedCount++;
          continue;
        }

        try {
          process.stdout.write(`\r📤 Uploading ${remoteKey.padEnd(60)} ${uploadedCount + 1} files`);
          uploadFile(fullPath, remoteKey);
          uploadedCount++;
        } catch (error) {
          errors.push({ file: remoteKey, error: error.message });
        }
      }
    }
  };

  walkDirectory(localDir, remotePrefix);

  console.log(); // New line after progress

  return { uploadedCount, skippedCount, errors };
}

/**
 * Clean up old files from R2 bucket
 */
async function cleanupBucket(keepPrefixes = []) {
  console.log('\n🧹 Cleaning up old files...');

  try {
    const command = new ListObjectsV2Command({
      Bucket: CONFIG.r2.bucket,
    });

    const response = await s3Client.send(command);
    const objects = response.Contents || [];

    if (objects.length === 0) {
      console.log('  ✓ No files to clean');
      return;
    }

    // Files to delete (not in keep list)
    const toDelete = objects.filter(obj => {
      const key = obj.Key;

      // Keep files that match our prefixes
      for (const prefix of keepPrefixes) {
        if (key.startsWith(prefix)) {
          return false;
        }
      }

      return true;
    });

    if (toDelete.length === 0) {
      console.log('  ✓ No files to delete');
      return;
    }

    // Delete old files
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: CONFIG.r2.bucket,
      Delete: {
        Objects: toDelete.map(obj => ({ Key: obj.Key })),
        Quiet: false,
      },
    });

    await s3Client.send(deleteCommand);
    console.log(`  ✓ Deleted ${toDelete.length} old files`);
  } catch (error) {
    console.warn(`  ⚠️  Cleanup failed: ${error.message}`);
  }
}

/**
 * Verify deployment by checking key files exist
 */
async function verifyDeployment() {
  console.log('\n✅ Verifying deployment...');

  const keyFiles = [
    'miniapps.json',
    'miniapps/lottery/index.html',
  ];

  for (const key of keyFiles) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: CONFIG.r2.bucket,
        Prefix: key,
        MaxKeys: 1,
      });

      const response = await s3Client.send(command);
      if (response.Contents && response.Contents.length > 0) {
        console.log(`  ✓ ${key}`);
      } else {
        console.log(`  ❌ ${key} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`  ❌ ${key} - ERROR: ${error.message}`);
    }
  }
}

/**
 * Build all miniapps before deployment
 */
async function buildMiniapps() {
  console.log('\n🔨 Building all miniapps...');

  try {
    execSync('node scripts/build/all.js', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
    });
    console.log('  ✓ Build completed');
  } catch (error) {
    console.error('  ❌ Build failed');
    throw error;
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log('🚀 Deploying miniapps to Cloudflare R2');
  console.log(`   Environment: ${ENVIRONMENT}`);
  console.log(`   Bucket: ${CONFIG.r2.bucket}`);
  console.log(`   Endpoint: ${process.env.CLOUDFLARE_R2_ENDPOINT}`);
  console.log('');

  // Step 1: Build all apps
  await buildMiniapps();

  // Step 2: Upload miniapps
  console.log('\n📦 Uploading miniapps...');
  const miniappsDir = path.join(PUBLIC_DIR, 'miniapps');
  const miniappsResult = await uploadDirectory(miniappsDir, 'miniapps/');

  console.log(`  ✓ Uploaded ${miniappsResult.uploadedCount} files`);
  if (miniappsResult.skippedCount > 0) {
    console.log(`  ⊘ Skipped ${miniappsResult.skippedCount} files`);
  }
  if (miniappsResult.errors.length > 0) {
    console.log(`  ⚠️  ${miniappsResult.errors.length} errors:`);
    miniappsResult.errors.slice(0, 5).forEach(err => {
      console.log(`    - ${err.file}: ${err.error}`);
    });
    if (miniappsResult.errors.length > 5) {
      console.log(`    ... and ${miniappsResult.errors.length - 5} more`);
    }
  }

  // Step 3: Upload registry
  console.log('\n📋 Uploading registry...');
  const registryPath = path.join(PUBLIC_DIR, 'data', 'miniapps.json');
  if (fs.existsSync(registryPath)) {
    await uploadFile(registryPath, 'data/miniapps.json');
    console.log('  ✓ Registry uploaded');
  } else {
    console.warn('  ⚠️  Registry not found, skipping...');
  }

  // Step 4: Verify deployment
  await verifyDeployment();

  // Step 5: Print summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Deployment completed successfully!');
  console.log('');
  console.log(`   Bucket: ${CONFIG.r2.bucket}`);
  console.log(`   URL: ${CONFIG.baseURL}${CONFIG.r2.publicPath}`);
  console.log(`   Files uploaded: ${miniappsResult.uploadedCount}`);
  console.log('='.repeat(60));
}

// Run deployment
if (require.main === module) {
  deploy().catch(error => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });
}

module.exports = { deploy, uploadDirectory, uploadFile };
