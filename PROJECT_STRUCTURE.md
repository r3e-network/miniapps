# Project Structure Overview

This document provides a comprehensive overview of the miniapps project structure, including all key directories, files, and their purposes.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Directory Structure](#directory-structure)
3. [Key Files](#key-files)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Workflow](#deployment-workflow)
6. [Development Workflow](#development-workflow)

## Quick Reference

```
miniapps/
├── apps/                      # Miniapp source code
├── config/                    # Configuration files
├── scripts/                   # Build and deployment scripts
├── deploy/                    # Deployment configurations
├── docs/                      # Documentation
├── public/                    # Build output
├── .env                       # Production credentials (not committed)
├── .env.local                 # Local development overrides (not committed)
├── .env.example               # Environment template
└── package.json               # Project dependencies and scripts
```

## Directory Structure

### `/apps` - Miniapp Source Code

Contains all miniapp projects.

```
apps/
├── lottery/                   # Lottery miniapp
��── tarot/                     # Tarot reading miniapp
├── nft-drops/                 # NFT drops miniapp
└── [other-apps]/              # Additional miniapps
```

### `/config` - Configuration Files

Environment-specific and application configurations.

```
config/
└── environments/
    ├── development.json       # Local development settings
    ├── staging.json           # Staging environment settings
    └── production.json        # Production environment settings
```

### `/scripts` - Build and Deployment Scripts

Automation scripts for building, deploying, and managing miniapps.

```
scripts/
├── build/
│   └── all.js                # Build all miniapps
├── deploy/
│   ├── to-r2.js              # Deploy to Cloudflare R2
│   ├── sync-registry.js      # Sync registry to R2
│   └── verify.js             # Verify deployment
├── verify-env.js             # Verify environment configuration
├── auto-discover-miniapps.js # Auto-discover miniapps
└── [other-scripts]/          # Additional utility scripts
```

### `/deploy` - Deployment Configurations

Deployment-specific configuration files.

```
deploy/
└── cloudflare/
    └── r2-buckets.json       # R2 bucket configurations
```

### `/docs` - Documentation

Project documentation and guides.

```
docs/
├── README.md                 # Documentation index
├── ENVIRONMENT_SETUP.md      # Environment configuration guide
├── ARCHITECTURE_MODERNIZATION.md
├── FRAMEWORK_SUMMARY.md
├── MIGRATION_GUIDE.md
├── MINIAPP_GUIDE.md
├── PLATFORM_INTEGRATION.md
└── STATELESS_MINIAPPS.md
```

### `/public` - Build Output

Compiled and built files ready for deployment.

```
public/
├── miniapps/                 # Built miniapp bundles
│   ├── lottery/
│   ├── tarot/
│   └── [other-apps]/
└── data/
    └── miniapps.json         # App registry
```

## Key Files

### Environment Files

| File           | Purpose                     | Committed |
| -------------- | --------------------------- | --------- |
| `.env`         | Production credentials      | No        |
| `.env.local`   | Local development overrides | No        |
| `.env.example` | Environment template        | Yes       |

**Important**: Never commit `.env` or `.env.local` to version control.

### Configuration Files

| File                     | Purpose                       |
| ------------------------ | ----------------------------- |
| `package.json`           | Dependencies and scripts      |
| `pnpm-workspace.yaml`    | PNPM workspace configuration  |
| `turbo.json`             | Turborepo configuration       |
| `tsconfig.base.json`     | Base TypeScript configuration |
| `.gitignore`             | Git ignore patterns           |
| `.eslintrc.framework.js` | ESLint configuration          |

### Documentation Files

| File                      | Purpose                   |
| ------------------------- | ------------------------- |
| `README.md`               | Project overview          |
| `ARCHITECTURE.md`         | System architecture       |
| `DEPLOYMENT.md`           | Deployment reference      |
| `DEPLOYMENT_WORKFLOW.md`  | Deployment workflow guide |
| `DEVELOPMENT.md`          | Development guide         |
| `DEVELOPMENT_WORKFLOW.md` | Day-to-day development    |
| `QUICK_REFERENCE.md`      | Common commands           |
| `STANDARDS.md`            | Coding standards          |

## Environment Configuration

### Environment Variables

Required variables:

- `R2_ENDPOINT` - Cloudflare R2 endpoint URL
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_STAGING` - Staging bucket name
- `R2_BUCKET_PRODUCTION` - Production bucket name
- `CF_API_TOKEN` - Cloudflare API token
- `CF_ACCOUNT_ID` - Cloudflare account ID

Optional variables:

- `CF_PAGES_PROJECT_STAGING` - Cloudflare Pages staging project
- `CF_PAGES_PROJECT_PRODUCTION` - Cloudflare Pages production project
- `NEXT_PUBLIC_CDN_URL` - CDN URL for deployed apps
- `NEXT_PUBLIC_RPC_URL` - Neo N3 RPC endpoint
- `NEXT_PUBLIC_NETWORK` - Neo network identifier

### Environment Configs

JSON configurations in `/config/environments/`:

**development.json**:

- Local development settings
- No caching
- Source maps enabled

**staging.json**:

- Staging environment
- Medium cache duration
- Production-like settings

**production.json**:

- Production environment
- Long cache duration
- Optimized settings

## Deployment Workflow

### Quick Deploy Commands

```bash
# Verify environment configuration
pnpm verify:env

# Build all miniapps
pnpm build:all

# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:prod
```

### Deployment Process

1. **Environment Verification**
   - Run `pnpm verify:env` to check configuration
   - Fix any issues reported

2. **Build**
   - Run `pnpm build:all` to build all miniapps
   - Output goes to `/public/miniapps/`

3. **Deploy**
   - Run `pnpm deploy:staging` for staging
   - Run `pnpm deploy:prod` for production
   - Files are uploaded to Cloudflare R2

4. **Verify**
   - Check deployment URLs
   - Verify registry is updated
   - Test miniapps

## Development Workflow

### Common Commands

```bash
# Start development server
pnpm dev

# Build specific app
pnpm --filter <app-name> build

# Run tests
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

### Adding a New Miniapp

1. Create app in `/apps/your-app/`
2. Add to `pnpm-workspace.yaml` if needed
3. Configure build settings
4. Add to registry in `scripts/auto-discover-miniapps.js`
5. Test locally with `pnpm dev`
6. Deploy to staging with `pnpm deploy:staging`

### Updating an Existing Miniapp

1. Make changes to app in `/apps/your-app/`
2. Test locally with `pnpm dev`
3. Build with `pnpm build:all`
4. Deploy to staging with `pnpm deploy:staging`
5. Test on staging
6. Deploy to production with `pnpm deploy:prod`

## File Naming Conventions

- **Configs**: `*.config.js` or `*.config.ts`
- **Scripts**: `*.js` in `/scripts/`
- **Docs**: `*.md` with uppercase names
- **Apps**: kebab-case in `/apps/`
- **Components**: PascalCase for Vue components

## Best Practices

1. **Environment Management**
   - Use `.env.local` for local development
   - Never commit sensitive credentials
   - Verify environment before deploying

2. **Development**
   - Test on staging before production
   - Keep documentation up to date
   - Follow coding standards in `STANDARDS.md`

3. **Deployment**
   - Always run `verify:env` before deploying
   - Use semantic versioning
   - Monitor deployment logs

4. **Documentation**
   - Update docs when changing features
   - Include examples in guides
   - Keep README.md current

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
pnpm clean
pnpm build:all
```

### Environment Issues

```bash
# Verify environment
pnpm verify:env
```

### Deployment Issues

```bash
# Check credentials
cat .env | grep R2_

# Test R2 connection
aws s3 ls --endpoint $R2_ENDPOINT --bucket $R2_BUCKET_PRODUCTION
```

## Additional Resources

- [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) - Detailed environment configuration
- [Deployment Workflow Guide](./DEPLOYMENT_WORKFLOW.md) - Complete deployment guide
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md) - Day-to-day development
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Standards](./STANDARDS.md) - Coding standards

## Support

For issues or questions:

1. Check documentation in `/docs/`
2. Run `pnpm verify:env` to check configuration
3. Review deployment logs
4. Contact the development team
