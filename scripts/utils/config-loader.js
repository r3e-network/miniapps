/**
 * Configuration Loader
 *
 * Loads environment-specific configuration for builds and deployments.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse .env file
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Load environment variables from multiple sources
 */
function loadEnvVars() {
  const env = process.env.NODE_ENV || process.env.DEPLOY_ENVIRONMENT || 'development';
  const results = {};

  // Priority order (highest to lowest):
  // 1. Process environment variables
  // 2. .env.local
  // 3. .env.[environment]
  // 4. .env

  const envFiles = [
    '.env',
    `.env.${env}`,
    '.env.local'
  ];

  // Load from files
  const fileValues = {};
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    const values = parseEnvFile(filePath);
    Object.assign(fileValues, values);
  }

  // Merge with process.env taking precedence
  return { ...fileValues, ...process.env };
}

/**
 * Load environment configuration
 */
function loadEnvironmentConfig(environment) {
  const env = environment || process.env.DEPLOY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const configPath = path.join(__dirname, `../../config/environments/${env}.json`);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration not found for environment: ${env}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  return {
    name: env,
    ...config
  };
}

/**
 * Get R2 configuration for current environment
 */
function getR2Config() {
  const envVars = loadEnvVars();
  const envConfig = loadEnvironmentConfig();

  return {
    accountId: envVars.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: envVars.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: envVars.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: envVars.CLOUDFLARE_R2_BUCKET || envConfig.r2.bucket,
    endpoint: envVars.CLOUDFLARE_R2_ENDPOINT,
    region: envVars.CLOUDFLARE_R2_REGION || 'auto',
    publicPath: envConfig.r2.publicPath,
    cacheControl: envConfig.r2.cacheControl,
    baseURL: envConfig.baseURL
  };
}

/**
 * Validate required environment variables
 */
function validateEnvVars(required = []) {
  const envVars = loadEnvVars();
  const missing = [];

  for (const key of required) {
    if (!envVars[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

module.exports = {
  parseEnvFile,
  loadEnvVars,
  loadEnvironmentConfig,
  getR2Config,
  validateEnvVars
};
