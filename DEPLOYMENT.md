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
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET=miniapps-prod
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
```

### 2. Configure GitHub Secrets

For CI/CD deployment, add these secrets in GitHub repository settings:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_ENDPOINT`
- `CLOUDFLARE_API_TOKEN` (for cache purging)
- `CLOUDFLARE_ZONE_ID` (for cache purging)

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

### Development

- Bucket: `miniapps-dev`
- No caching
- Local testing

### Staging

- Bucket: `miniapps-staging`
- Short cache (30 min)
- Pre-production testing

### Production

- Bucket: `miniapps-prod`
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
  --endpoint https://your_account_id.r2.cloudflarestorage.com \
  --bucket miniapps-prod
```

### Cache Issues

After deployment, purge Cloudflare cache:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://miniapps.yourdomain.com/miniapps/*"]}'
```

## Registry Endpoints

After deployment, the registry is available at:

- Production: `https://miniapps.yourdomain.com/data/miniapps.json`
- Staging: `https://staging-miniapps.yourdomain.com/data/miniapps.json`

## CDN URLs

Each miniapp is accessible at:

```
https://miniapps.yourdomain.com/miniapps/[app-name]/index.html
```

Example:
```
https://miniapps.yourdomain.com/miniapps/lottery/index.html
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
