# Environment Configuration Guide

## Overview

This document explains how to configure different environments for the miniapps project, including local development, staging, and production.

## Environment Files

### File Hierarchy

Environment variables are loaded in the following order (later files override earlier ones):

1. `.env` - Base configuration (committed to git with example values only)
2. `.env.local` - Local overrides (not committed, gitignored)
3. System environment variables

### File Purposes

| File           | Purpose                     | Committed | Usage                  |
| -------------- | --------------------------- | --------- | ---------------------- |
| `.env`         | Production credentials      | No        | Production deployments |
| `.env.local`   | Local development overrides | No        | Local development      |
| `.env.example` | Template for new developers | Yes       | Reference only         |

## Quick Setup

### For New Developers

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit with your credentials
nano .env.local

# 3. Start development server
pnpm dev
```

### For Production Deployment

```bash
# 1. Set production credentials
cp .env.example .env
nano .env  # Add your production credentials

# 2. Deploy to production
pnpm deploy:prod
```

## Configuration Structure

### 1. Cloudflare R2 Configuration

```env
# R2 endpoint (S3-compatible API)
R2_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com

# R2 access credentials
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key

# Bucket names
R2_BUCKET=miniapps
```

**Where to find these values:**

- R2 Endpoint: Cloudflare Dashboard > R2 > Overview
- Access Keys: Cloudflare Dashboard > R2 > Manage R2 API Tokens
- Bucket Names: Create buckets in R2 dashboard

### 2. Cloudflare API Configuration

```env
# API token for cache operations
CF_API_TOKEN=your_api_token

# Cloudflare account ID
CF_ACCOUNT_ID=your_account_id

# Cloudflare Pages projects (optional)
CF_PAGES_PROJECT=miniappsuction
```

**Where to find these values:**

- API Token: Cloudflare Dashboard > My Profile > API Tokens
- Account ID: Cloudflare Dashboard URL or right sidebar
- Pages Projects: Cloudflare Dashboard > Pages

### 3. Application Configuration

```env
# Public URLs (accessible in browser via NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_CDN_URL=https://your-domain.com
NEXT_PUBLIC_RPC_URL=https://neoxrpc1.blackholelabs.io
NEXT_PUBLIC_NETWORK=neo-n3-mainnet
```

**Where to configure:**

- CDN URL: Your custom domain pointing to R2 bucket
- RPC URL: Neo N3 RPC endpoint (mainnet or testnet)
- Network: `neo-n3-mainnet` or `neo-n3-testnet`

## Environment-Specific Configurations

### Local Development (`.env.local`)

```env
# Use staging bucket for testing
R2_BUCKET=miniapps

# Local development server
DEV_BASE_URL=http://localhost:5173
DEV_PUBLIC_PATH=/miniapps/

# Build options
BUILD_ANALYZE=false
BUILD_SOURCEMAP=true
BUILD_COMPRESS=false

# Registry
REGISTRY_SYNC_ENABLED=true
REGISTRY_ENDPOINT=/data/miniapps.json

# URLs
NEXT_PUBLIC_CDN_URL=http://localhost:5173
NEXT_PUBLIC_RPC_URL=https://neoxrpc1.blackholelabs.io
NEXT_PUBLIC_NETWORK=neo-n3-mainnet
```

**Characteristics:**

- Source maps enabled for debugging
- No compression for faster builds
- Local URLs for testing
- Staging bucket for safe testing

### Staging (`.env` with staging overrides)

```env
# Staging bucket
R2_BUCKET=miniapps

# Staging URLs
NEXT_PUBLIC_CDN_URL=https://meshmini.app

# Build options
BUILD_ANALYZE=false
BUILD_SOURCEMAP=false
BUILD_COMPRESS=true
```

**Characteristics:**

- Production-like configuration
- Staging domain
- Compression enabled
- No source maps
- Medium cache duration

### Production (`.env`)

```env
# Production bucket

# Production URLs
NEXT_PUBLIC_CDN_URL=https://meshmini.app

# Build options
BUILD_ANALYZE=false
BUILD_SOURCEMAP=false
BUILD_COMPRESS=true
```

**Characteristics:**

- Production bucket
- Custom domain
- Compression enabled
- No source maps
- Long cache duration for assets

## JSON Configuration Files

In addition to environment variables, JSON files in `/config/environments/` provide additional configuration:

### `/config/environments/development.json`

```json
{
    "name": "development",
    "baseURL": "http://localhost:3000",
    "r2": {
        "bucket": "miniapps-dev",
        "domain": "dev-miniapps.localhost:3000",
        "publicPath": "/miniapps/",
        "cacheControl": "no-cache"
    },
    "features": {
        "analytics": false,
        "caching": false,
        "versioning": false,
        "compression": false
    }
}
```

### `/config/environments/staging.json`

```json
{
    "name": "staging",
    "baseURL": "https://meshmini.app",
    "r2": {
        "bucket": "miniapps",
        "domain": "meshmini.app",
        "publicPath": "/miniapps/",
        "cacheControl": "public, max-age=1800"
    },
    "features": {
        "analytics": true,
        "caching": true,
        "versioning": true,
        "compression": true
    }
}
```

### `/config/environments/production.json`

```json
{
    "name": "production",
    "baseURL": "https://meshmini.app",
    "r2": {
        "bucket": "miniapps",
        "domain": "meshmini.app",
        "publicPath": "/miniapps/",
        "cacheControl": "public, max-age=31536000, immutable"
    },
    "features": {
        "analytics": true,
        "caching": true,
        "versioning": true,
        "compression": true
    }
}
```

## Security Best Practices

### 1. Never Commit Sensitive Data

```bash
# Add to .gitignore
.env
.env.local
.env.production
```

### 2. Use Different Credentials

- **Local Development**: Use limited-scope tokens
- **Staging**: Use staging-specific credentials
- **Production**: Use production-specific credentials

### 3. Rotate Keys Regularly

```bash
# Cloudflare R2 API tokens should be rotated every 90 days
# Cloudflare API tokens should be rotated every 90 days
```

### 4. Limit Token Permissions

- R2 tokens: Only grant bucket access needed
- API tokens: Only grant specific permissions needed

## Validation

### Test Your Configuration

```bash
# 1. Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.R2_ENDPOINT)"

# 2. Test R2 connection
aws s3 ls \
  --endpoint $R2_ENDPOINT \
  --bucket $R2_BUCKET_PRODUCTION

# 3. Verify Cloudflare API token
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

### Validate Before Deployment

```bash
# 1. Check environment
pnpm deploy --dry-run

# 2. Build with analysis
pnpm build:analyze

# 3. Deploy to staging first
pnpm deploy:staging

# 4. Verify staging deployment
curl https://meshmini.app/data/miniapps.json

# 5. Then deploy to production
pnpm deploy:prod
```

## Troubleshooting

### Environment Variables Not Loading

**Symptom**: `undefined` values

**Solutions**:

```bash
# Check file exists
ls -la .env

# Check permissions
chmod 600 .env

# Verify syntax (no spaces around =)
cat .env

# Restart processes
pnpm dev
```

### Incorrect Credentials

**Symptom**: Authentication errors

**Solutions**:

```bash
# Verify credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Test connection
aws s3 ls \
  --endpoint $R2_ENDPOINT \
  --bucket $R2_BUCKET_PRODUCTION
```

### Wrong Bucket

**Symptom**: Files not found

**Solutions**:

```bash
# List buckets
aws s3 ls \
  --endpoint $R2_ENDPOINT

# Verify bucket name
echo $R2_BUCKET_PRODUCTION
```

## CI/CD Configuration

### GitHub Secrets

Add these in GitHub repository settings:

```
R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_STAGING
R2_BUCKET_PRODUCTION
CF_API_TOKEN
CF_ACCOUNT_ID
```

### Environment-Specific Secrets

You can also create environment-specific secrets:

- `R2_ENDPOINT` (all environments)
- `R2_BUCKET_STAGING` (staging environment)
- `R2_BUCKET_PRODUCTION` (production environment)

## Next Steps

1. Set up your local environment with `.env.local`
2. Test the build process locally
3. Deploy to staging for testing
4. Configure GitHub Actions for CI/CD
5. Deploy to production

For more information, see:

- [DEPLOYMENT_WORKFLOW.md](../DEPLOYMENT_WORKFLOW.md) - Complete deployment guide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment reference
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
