# Production Deployment Checklist

## Pre-Deployment Checks

### 1. Environment Verification
- [ ] `.env` file exists and is configured for target environment
- [ ] Environment variables loaded: `CLOUDFLARE_R2_*`, `SUPABASE_*`, `CF_API_*`
- [ ] All required secrets are set in GitHub Actions (if using CI/CD)
- [ ] `DEPLOY_ENVIRONMENT` set correctly (`development` | `staging` | `production`)

### 2. Codebase Status
- [ ] All changes committed to version control
- [ ] Branch is protected (main requires review for production)
- [ ] No untracked files that should be committed
- [ ] Latest changes pulled from remote

### 3. Smart Contract Readiness (if applicable)
- [ ] Contract code updated and tested
- [ ] Contract compiled: `pnpm contracts:build`
- [ ] Contract tests passing: `pnpm contracts:test`
- [ ] Mainnet addresses documented in `contracts-info/`
- [ ] Testnet deployment verified before mainnet

### 4. Dependencies
- [ ] Dependencies installed: `pnpm install`
- [ ] Lock file up to date (`pnpm-lock.yaml`)
- [ ] No pending security advisories

---

## Build Verification Steps

### 1. Build Execution
```bash
pnpm build:all
```
- [ ] All miniapps build successfully
- [ ] No TypeScript errors
- [ ] No ESLint violations
- [ ] Build output exists in `public/miniapps/`

### 2. Build Artifacts Validation
- [ ] `public/miniapps.json` generated with all apps
- [ ] Each miniapp has `index.html` and required assets
- [ ] `neo-manifest.json` present for each app
- [ ] Static assets (logos, banners) deployed

### 3. Local Preview (Optional but Recommended)
```bash
pnpm preview
```
- [ ] Test key miniapps locally before deployment

---

## Security Checklist

### 1. Secrets Management
- [ ] `.env` file NOT committed to git
- [ ] No hardcoded private keys or API secrets in source
- [ ] Environment variables used for all credentials
- [ ] GitHub Secrets configured for CI/CD

### 2. Access Control
- [ ] R2 bucket access limited to deployment service account
- [ ] Supabase service role key NOT exposed to client
- [ ] Cloudflare API token has minimal required permissions

### 3. Code Security
- [ ] `neo-manifest.json` permissions reviewed
- [ ] No debug code or console logs in production builds
- [ ] CSP headers configured in CDN (if applicable)

### 4. Contract Security (if applicable)
- [ ] Smart contract audit completed (for mainnet)
- [ ] No reentrancy vulnerabilities
- [ ] Access control checks implemented
- [ ] Emergency pause mechanism available

---

## Deployment Steps

### 1. Deploy to Cloudflare R2 CDN
```bash
# For production
pnpm deploy:prod

# Or manually
node scripts/deploy/upload-built.js production
```

- [ ] R2 bucket connection verified
- [ ] All files uploaded successfully
- [ ] Public access enabled on bucket

### 2. Sync to Supabase Registry
```bash
node scripts/deploy/to-supabase-upsert.js
```

- [ ] Supabase connection established
- [ ] Miniapp metadata upserted
- [ ] Contract addresses updated (if changed)

### 3. Cache Purge (Cloudflare)
```bash
# Via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://meshmini.app/miniapps/*","https://meshmini.app/data/*"]}'
```

- [ ] CDN cache purged
- [ ] New content served

### 4. Smart Contract Deployment (if applicable)
```bash
# Deploy to testnet first
pnpm contracts:deploy --network testnet

# Verify, then mainnet
pnpm contracts:deploy --network mainnet
```

- [ ] Contract deployed to target network
- [ ] Contract address saved to config
- [ ] Contract verified on explorer

---

## Post-Deployment Verification

### 1. CDN Accessibility
```bash
# Verify registry
curl -I https://meshmini.app/data/miniapps.json

# Verify specific apps
curl -I https://meshmini.app/miniapps/lottery/index.html
curl -I https://meshmini.app/miniapps/coin-flip/index.html
```

- [ ] Registry endpoint returns 200
- [ ] Sample miniapps load correctly
- [ ] All miniapps accessible via CDN

### 2. Functional Testing
- [ ] Wallet connection works
- [ ] Payment flow functional (testnet only)
- [ ] Contract interactions working (if applicable)

### 3. Registry Consistency
```bash
node scripts/deploy/verify.js
```

- [ ] CDN and Supabase data consistent
- [ ] All miniapp metadata correct

### 4. Monitoring Setup
- [ ] Cloudflare Analytics dashboard configured
- [ ] R2 storage metrics monitored
- [ ] GitHub Actions deployment logs reviewed

---

## Rollback Procedures

### 1. Rollback via Git Revert (Recommended)
```bash
# Find the last good commit
git log --oneline -10

# Revert to previous version
git revert HEAD
git push origin main
```

- [ ] CI/CD triggers automatic redeploy
- [ ] Previous version deployed to CDN

### 2. Manual Rollback (Emergency)
```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild and redeploy
pnpm build:all
pnpm deploy:prod

# Return to main branch
git checkout main
```

### 3. R2 Version Rollback (If Available)
- [ ] R2 bucket versioning enabled
- [ ] Previous version object restored via Cloudflare dashboard

### 4. Supabase Rollback
```bash
# Restore from backup or previous data
node scripts/deploy/to-supabase.js --restore-from backup.json
```

### 5. Contract Rollback (If Upgradeable)
```bash
# If using proxy pattern
pnpm contracts:upgrade --network mainnet --contract <contract-name>
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_R2_ENDPOINT` | Yes | R2 storage endpoint URL |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Yes | R2 API access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Yes | R2 API secret key |
| `CLOUDFLARE_R2_BUCKET` | Yes | Bucket name (e.g., `miniapps`) |
| `CLOUDFLARE_R2_REGION` | Yes | Region (usually `auto`) |
| `NEXT_PUBLIC_CDN_URL` | Yes | Production CDN base URL |
| `CDN_URL` | Yes | CDN URL for scripts |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key |
| `CF_API_TOKEN` | Yes | Cloudflare API token for cache purge |
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `NEXT_PUBLIC_RPC_URL` | Yes | Neo N3 RPC endpoint |
| `NEXT_PUBLIC_NETWORK` | Yes | Network name (`neo-n3-mainnet` or `neo-n3-testnet`) |

---

## Quick Commands Reference

```bash
# Full deployment pipeline
pnpm build:all && pnpm deploy:prod

# Staging deployment
pnpm build:all && pnpm deploy:staging

# Development deployment
pnpm build:all && pnpm deploy:dev

# Contract deployment
pnpm contracts:build && pnpm contracts:deploy --network mainnet

# Verify deployment
node scripts/deploy/verify.js

# Regenerate registry
node scripts/auto-discover-miniapps.js
```

---

## Emergency Contacts

- **Cloudflare Support**: https://dash.cloudflare.com/support
- **Neo N3 Network Status**: https://status.neo.org
- **Supabase Status**: https://status.supabase.com

---

*Last Updated: 2024-01-30*
