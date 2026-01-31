# SECURITY INCIDENT: Compromised Credentials

**Date**: 2026-01-30
**Severity**: CRITICAL

## Compromised Credentials

The following credentials have been found committed to git history:

### Cloudflare R2
- `R2_ACCESS_KEY_ID=cc77eee149d8f679bc0f751ca346a236`
- `R2_SECRET_ACCESS_KEY=474c781a44136f6e6915dcd0b081956bf982e11dc61dba684b30c56c98b82b09`

### Cloudflare API
- `CF_API_TOKEN=G8bhGmPEGsQH_WVOBAG_6xBFgnsNi8UkhZmcywn3`

### Supabase
- `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `SUPABASE_ACCESS_TOKEN=sbp_790c0c6a3060e1900514d0fa5491ba34f68628ed`

## Required Actions

1. **IMMEDIATE**: Rotate all compromised credentials in Cloudflare Dashboard
2. **IMMEDIATE**: Generate new Supabase service role key
3. **HIGH**: Update deployment pipeline secrets
4. **MEDIUM**: Review git history for any other exposure

## Git History Cleanup

To fully remove credentials from git history:
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env .env.local .env.example' \
  --prune-empty --tag-name-filter cat -- --all
```

Or use GitHub's secret scanning: https://github.com/settings/secret-scanning
