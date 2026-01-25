#!/usr/bin/env node
/**
 * Deployment Verification Tool
 *
 * Verifies that a deployment was successful by checking
 * that expected files exist and are accessible.
 */

const fs = require('fs');
const path = require('path');
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { loadEnvironmentConfig } = require('../utils/config-loader');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const ENVIRONMENT = process.argv[2] || process.env.DEPLOY_ENVIRONMENT || 'production';

/**
 * Create S3 client
 */
function createS3Client() {
  const config = loadEnvironmentConfig(ENVIRONMENT);

  return new S3Client({
    region: process.env.CLOUDFLARE_R2_REGION || 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Check if a file exists in R2
 */
async function fileExists(s3Client, bucket, key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * List objects in bucket with prefix
 */
async function listObjects(s3Client, bucket, prefix) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 1000,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

/**
 * Verify deployment
 */
async function verifyDeployment() {
  console.log('🔍 Verifying deployment...\n');

  const config = loadEnvironmentConfig(ENVIRONMENT);
  const s3Client = createS3Client();

  // Key files to check
  const keyFiles = [
    'data/miniapps.json',
    'miniapps/lottery/index.html',
    'miniapps/red-envelope/index.html',
  ];

  // Check key files
  console.log('📋 Checking key files:');
  let allFound = true;

  for (const key of keyFiles) {
    const exists = await fileExists(s3Client, config.r2.bucket, key);

    if (exists) {
      console.log(`  ✅ ${key}`);
    } else {
      console.log(`  ❌ ${key} - NOT FOUND`);
      allFound = false;
    }
  }

  // Count deployed apps
  console.log('\n📊 Counting deployed apps:');
  const apps = await listObjects(s3Client, config.r2.bucket, 'miniapps/');
  const appNames = new Set();

  for (const obj of apps) {
    const match = obj.Key.match(/^miniapps\/([^\/]+)\//);
    if (match) {
      appNames.add(match[1]);
    }
  }

  console.log(`  📦 Found ${appNames.size} miniapps`);

  // List apps
  if (appNames.size > 0) {
    console.log('\n📝 Deployed apps:');
    const sortedApps = Array.from(appNames).sort();
    sortedApps.forEach(app => {
      console.log(`  - ${app}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allFound) {
    console.log('✅ Deployment verification successful!');
    console.log(`   Bucket: ${config.r2.bucket}`);
    console.log(`   Apps: ${appNames.size}`);
    console.log(`   URL: ${config.baseURL}${config.r2.publicPath}`);
  } else {
    console.log('❌ Deployment verification failed!');
    console.log('   Some key files are missing.');
  }
  console.log('='.repeat(60));

  return allFound;
}

// Run verification
if (require.main === module) {
  verifyDeployment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyDeployment, fileExists, listObjects };
