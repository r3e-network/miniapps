#!/usr/bin/env node
/**
 * Sync miniapps registry to remote endpoint
 *
 * Usage:
 *   node scripts/deploy/sync-registry.js [environment]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const { loadEnvironmentConfig } = require('../utils/config-loader');

const ENVIRONMENT = process.argv[2] || process.env.DEPLOY_ENVIRONMENT || 'production';
const REGISTRY_PATH = path.join(__dirname, '../../public/data/miniapps.json');

/**
 * Make HTTPS request
 */
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Sync registry to remote endpoint
 */
async function syncRegistry() {
  console.log('🔄 Syncing miniapps registry...');

  // Check if registry file exists
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ Registry file not found. Run build first.');
    process.exit(1);
  }

  // Load registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  // Count apps
  const totalApps = Object.values(registry).reduce((sum, apps) => sum + apps.length, 0);
  console.log(`  📊 Found ${totalApps} apps in registry`);

  // Load config
  const config = loadEnvironmentConfig(ENVIRONMENT);

  // If sync endpoint is configured, upload
  const syncEndpoint = process.env.REGISTRY_ENDPOINT;
  if (!syncEndpoint || syncEndpoint === '/data/miniapps.json') {
    console.log('  ℹ️  No remote sync endpoint configured');
    console.log('  📋 Local registry:', REGISTRY_PATH);
    return;
  }

  try {
    const url = new URL(syncEndpoint, config.baseURL);

    console.log(`  📤 Uploading to ${url.href}`);

    const response = await httpsRequest({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'miniapps-deploy/1.0'
      }
    }, registry);

    console.log('  ✅ Registry synced successfully');
  } catch (error) {
    console.warn(`  ⚠️  Sync failed: ${error.message}`);
    console.log('  📋 Registry file still available locally');
  }
}

/**
 * Verify registry integrity
 */
function verifyRegistry() {
  console.log('\n🔍 Verifying registry integrity...');

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('  ❌ Registry file missing');
    return false;
  }

  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

    // Check structure
    const requiredCategories = ['gaming', 'defi', 'social', 'nft', 'governance', 'utility'];
    let valid = true;

    for (const category of requiredCategories) {
      if (!Array.isArray(registry[category])) {
        console.error(`  ❌ Invalid category: ${category}`);
        valid = false;
      }
    }

    if (valid) {
      const totalApps = Object.values(registry).reduce((sum, apps) => sum + apps.length, 0);
      console.log(`  ✅ Registry valid (${totalApps} apps)`);
    }

    return valid;
  } catch (error) {
    console.error(`  ❌ Registry parse error: ${error.message}`);
    return false;
  }
}

// Run sync
if (require.main === module) {
  (async () => {
    verifyRegistry();
    await syncRegistry();
  })().catch(error => {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  });
}

module.exports = { syncRegistry, verifyRegistry };
