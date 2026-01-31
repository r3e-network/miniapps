# Deployment Workflow Guide

This document provides a comprehensive guide for deploying miniapps to Cloudflare R2 CDN, including environment setup, build processes, and deployment procedures.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Project Structure](#project-structure)
4. [Local Development](#local-development)
5. [Staging Deployment](#staging-deployment)
6. [Production Deployment](#production-deployment)
7. [CI/CD Automation](#cicd-automation)
8. [Troubleshooting](#troubleshooting)

## Quick Start

For immediate deployment to production:

```bash
# 1. Install dependencies
pnpm install

# 2. Build all miniapps
pnpm build:all

# 3. Deploy to production
pnpm deploy:prod
```

## Environment Setup

### 1. Environment Files

The project uses three environment files:

- `.env` - Production credentials (do not commit)
- `.env.local` - Local development overrides (do not commit)
- `.env.example` - Template for new developers

### 2. Configuration Setup

Copy the example file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_REGION=auto

# Cloudflare API Configuration
CF_API_TOKEN=your_api_token
CF_ACCOUNT_ID=your_account_id

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://meshmini.app
CDN_URL=https://meshmini.app

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application URLs
NEXT_PUBLIC_RPC_URL=https://neoxrpc1.blackholelabs.io
NEXT_PUBLIC_NETWORK=neo-n3-mainnet
```

### 3. Obtaining Cloudflare Credentials

#### R2 Access Keys

1. Go to Cloudflare Dashboard > R2 > Overview
2. Click "Manage R2 API Tokens"
3. Create an API token with R2 read/write permissions
4. Save the Access Key ID and Secret Access Key

#### Cloudflare API Token

1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Create a custom token with:
   - Zone > Cache > Purge permissions
   - Zone > DNS > Edit permissions (optional)
3. Save the token

#### Account ID

Found in the Cloudflare Dashboard URL or on the right side of any page.

## Project Structure

```
miniapps/
├── .env                          # Production credentials (not committed)
├── .env.local                    # Local development overrides (not committed)
├── .env.example                  # Environment template
├── config/
│   └── environments/             # Environment-specific configurations
│       ├── development.json      # Local development settings
│       ├── staging.json          # Staging environment settings
│       └── production.json       # Production environment settings
├── scripts/
│   ├── build/
│   │   └── all.js               # Build script for all miniapps
│   └── deploy/
│       ├── to-r2.js             # R2 deployment script
│       ├── sync-registry.js     # Registry synchronization
│       └── verify.js            # Deployment verification
├── deploy/
│   └── cloudflare/
│       └── r2-buckets.json      # R2 bucket configurations
├── public/                       # Build output directory
│   ├── miniapps/                # Built miniapp bundles
│   └── data/
│       └── miniapps.json        # App registry
└── apps/                        # Miniapp source code
```

## Local Development

### Setting Up Local Environment

1. Create `.env` from example:

```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:

```env
CLOUDFLARE_R2_ENDPOINT=https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET=miniapps

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://meshmini.app
CDN_URL=https://meshmini.app

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Running Local Development Server

```bash
# Start development server
pnpm dev

# Or for a specific app
cd apps/your-app
pnpm dev
```

### Local Build Testing

```bash
# Build all apps
pnpm build:all

# Test deployment
pnpm deploy:prod
```

## Production Deployment

Production deployment should be done via CI/CD, but manual deployment is possible.

### Manual Production Deployment

```bash
# Deploy to production
pnpm deploy:prod

# Or explicitly set environment
DEPLOY_ENVIRONMENT=production pnpm deploy
```

### Production Configuration

Located in `/config/environments/production.json`:

### Production URL Structure

After deployment, apps are accessible at:

```
https://meshmini.app/miniapps/[app-name]/index.html
```

Example:

```
https://meshmini.app/miniapps/lottery/index.html
```

## CI/CD Automation

### GitHub Actions Workflow

The project includes automated deployment via GitHub Actions:

- **Push to `main` branch** → Production deployment
- **Pull request to `main`** → Preview build
- **Manual trigger** → Deploy on demand

### Setting Up GitHub Secrets

Add these secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

```
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CF_API_TOKEN
CF_ACCOUNT_ID
```

### Manual Workflow Trigger

1. Go to Actions tab in GitHub
2. Select "Build and Deploy to Cloudflare R2"
3. Click "Run workflow"
4. Choose branch and environment
5. Click "Run workflow"

## Troubleshooting

### Build Failures

**Problem**: Build fails with errors

**Solution**:

```bash
# Clean build artifacts
pnpm clean

# Clear node_modules cache
rm -rf node_modules/.cache

# Rebuild
pnpm build:all
```

### Deployment Failures

**Problem**: Deployment fails with authentication errors

**Solution**:

```bash
# Verify credentials in .env
cat .env | grep R2_

# Test R2 connection
aws s3 ls \
  --endpoint https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com \
  --bucket miniapps
```

**Problem**: Deployment fails with timeout

**Solution**:

```bash
# Check network connectivity
ping r2.cloudflarestorage.com

# Try with increased timeout
DEPLOY_TIMEOUT=300000 pnpm deploy:prod
```

### Cache Issues

**Problem**: Changes not visible after deployment

**Solution**:

```bash
# Purge Cloudflare cache
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://meshmini.app/miniapps/*"]}'
```

### Environment Variables Not Loading

**Problem**: `undefined` values for environment variables

**Solution**:

```bash
# Verify .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Restart development server
pnpm dev
```

### Registry Not Updating

**Problem**: New apps not appearing in registry

**Solution**:

```bash
# Regenerate registry
pnpm registry:generate

# Sync registry to R2
pnpm registry:sync

# Verify registry
curl https://meshmini.app/data/miniapps.json
```

## Best Practices

1. **Always test on staging first** before deploying to production
2. **Keep `.env` files private** - never commit them to version control
3. **Use semantic versioning** for miniapp releases
4. **Monitor deployment logs** in GitHub Actions
5. **Verify deployment** by checking key URLs after deployment
6. **Keep API tokens secure** - rotate them regularly
7. **Document any custom configurations** for your team

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - Development workflow
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [README.md](./README.md) - Project overview

## Support

For deployment issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Cloudflare R2 dashboard
4. Contact the dev team for assistance
