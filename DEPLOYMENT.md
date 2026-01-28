# Miniapps Deployment Guide

This guide covers deploying miniapps to Cloudflare R2 CDN.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Cloudflare R2 bucket configured
- Cloudflare API credentials

## Environment Configuration

### 1. Set up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_REGION=auto

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://meshmini.app
CDN_URL=https://meshmini.app

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configure GitHub Secrets

For CI/CD deployment, add these secrets in GitHub repository settings:

- `CLOUDFLARE_R2_ENDPOINT`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CF_API_TOKEN` (for cache purging)
- `CF_ACCOUNT_ID` (for cache purging)

## Local Deployment

### Build All Miniapps

```bash
pnpm build:all
```

### Deploy to R2

```bash
# Development
pnpm deploy:dev

# Staging
pnpm deploy:staging

# Production
pnpm deploy:prod
```

### Deploy with Custom Environment

```bash
DEPLOY_ENVIRONMENT=production pnpm deploy
```

## CI/CD Deployment

The GitHub Actions workflow automatically deploys on:

- **Push to `main` branch** → Production deployment
- **Push to `staging` branch** → Staging deployment
- **Manual trigger** → Choose environment

### Manual Deployment

1. Go to Actions tab in GitHub
2. Select "Build and Deploy to Cloudflare R2"
3. Click "Run workflow"
4. Choose environment
5. Click "Run workflow"

## Project Structure

```
miniapps/
├── config/
│   └── environments/          # Environment configs
│       ├── development.json
│       ├── staging.json
│       └── production.json
├── scripts/
│   ├── build/
│   │   └── all.js            # Build script
│   └── deploy/
│       └── to-r2.js          # R2 deployment
├── deploy/
│   └── cloudflare/
│       └── r2-buckets.json   # R2 bucket configs
├── public/                   # Build output
│   ├── miniapps/             # Built apps
│   └── data/
│       └── miniapps.json     # Registry
└── .env                      # Credentials (not committed)
```

## Environment Configurations

### Production

- Bucket: `miniapps`
- Long cache (1 day for assets)
- Public access

## Troubleshooting

### Build Failures

```bash
# Clean and rebuild
pnpm clean
pnpm build:all
```

### Deployment Failures

Check credentials in `.env`:

```bash
# Verify R2 access
aws s3 ls \
  --endpoint https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com \
  --bucket miniapps
```

### Cache Issues

After deployment, purge Cloudflare cache:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://meshmini.app/miniapps/*"]}'
```

## Registry Endpoints

After deployment, the registry is available at:

- Production: `https://meshmini.app/data/miniapps.json`

## CDN URLs

Each miniapp is accessible at:

```
https://meshmini.app/miniapps/[app-name]/index.html
```

Example:

```
https://meshmini.app/miniapps/lottery/index.html
```

## Monitoring

Check deployment status in:

- GitHub Actions runs
- Cloudflare R2 browser
- Cloudflare Analytics

## Rollback

To rollback to previous version:

1. Revert the commit
2. Push to main
3. CI/CD will automatically redeploy

Or manually:

```bash
git checkout [previous-commit]
pnpm deploy:prod
```

## Security Notes

- Never commit `.env` file
- Use GitHub Secrets for CI/CD
- Rotate R2 access keys regularly
- Enable Cloudflare Access for R2 bucket
