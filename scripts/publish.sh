#!/bin/bash
# Publish miniapps to CDN (R2) and register with platform
# Usage: ./scripts/publish.sh [miniapp-name|all] [environment]
#
# Environment variables (from .env.local):
#   R2_ENDPOINT        - R2 API endpoint
#   R2_ACCESS_KEY_ID   - R2 access key
#   R2_SECRET_ACCESS_KEY - R2 secret key
#   R2_BUCKET_STAGING  - Staging bucket name
#   R2_BUCKET_PRODUCTION - Production bucket name
#   CF_API_TOKEN       - Cloudflare API token
#   CF_ACCOUNT_ID      - Cloudflare account ID
#   NEXT_PUBLIC_CDN_URL - Public CDN URL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
APPS_DIR="$ROOT_DIR/apps"
CDN_DIR="$ROOT_DIR/public/miniapps"

# Load environment from .env.local if exists
if [ -f "$ROOT_DIR/.env.local" ]; then
    set -a
    source "$ROOT_DIR/.env.local"
    set +a
fi

ENVIRONMENT="${2:-staging}"
R2_BUCKET_VAR="R2_BUCKET_${ENVIRONMENT^^}"
R2_BUCKET="${!R2_BUCKET_VAR}"
R2_ENDPOINT="${R2_ENDPOINT:-https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com}"
CDN_URL="${NEXT_PUBLIC_CDN_URL:-https://pub-9520e478cb93416898bc82d2aeb5db3f.r2.dev}"

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Check AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not installed. Will only copy to local CDN."
        return 1
    fi
    
    if [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ]; then
        log_warn "R2 credentials not configured. Will only copy to local CDN."
        return 1
    fi
    
    return 0
}

# Upload to R2 using AWS CLI
upload_to_r2() {
    local local_path="$1"
    local bucket="$2"
    
    if ! check_aws_cli; then
        log_warn "Skipping R2 upload (AWS CLI not configured)"
        return 0
    fi
    
    log_step "Uploading to R2 bucket: $bucket"
    
    aws s3 sync "$local_path" "s3://$bucket/" \
        --endpoint-url="$R2_ENDPOINT" \
        --acl public-read \
        --delete \
        --no-progress
    
    log_info "Uploaded to R2: s3://$bucket/"
}

# Function to publish single miniapp
publish_miniapp() {
    local app_name="$1"
    local app_dir="$APPS_DIR/$app_name"
    
    if [ ! -d "$app_dir" ]; then
        log_error "Miniapp not found: $app_name"
        return 1
    fi
    
    echo ""
    log_info "[$app_name] Starting publish to $ENVIRONMENT..."
    
    # 1. Check neo-manifest.json exists
    if [ ! -f "$app_dir/neo-manifest.json" ]; then
        log_error "[$app_name] Missing neo-manifest.json"
        return 1
    fi
    
    # 2. Validate neo-manifest.json
    echo "  [1/4] Validating manifest..."
    if ! python3 -c "import json; json.load(open('$app_dir/neo-manifest.json'))" 2>/dev/null; then
        log_error "[$app_name] Invalid JSON in neo-manifest.json"
        return 1
    fi
    
    # 3. Build the miniapp
    echo "  [2/4] Building..."
    cd "$app_dir"
    if ! pnpm build > /dev/null 2>&1; then
        log_error "[$app_name] Build failed"
        return 1
    fi
    
    # 4. Copy to local CDN
    echo "  [3/4] Copying to local CDN..."
    local cdn_path="$CDN_DIR/$app_name"
    mkdir -p "$cdn_path"
    rm -rf "$cdn_path"/*
    
    if [ -d "dist/build/h5" ]; then
        cp -r "dist/build/h5"/* "$cdn_path/"
    else
        log_warn "[$app_name] No dist/build/h5 found"
    fi
    
    # 5. Upload to R2 if configured
    if [ -n "$R2_BUCKET" ]; then
        echo "  [4/4] Uploading to R2 CDN..."
        upload_to_r2 "$cdn_path" "$R2_BUCKET"
    fi
    
    # Extract and display registration data
    local manifest=$(cat neo-manifest.json)
    local app_id=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', '$app_name'))")
    local name=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name', '$app_name'))")
    local name_zh=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name_zh', ''))")
    local category=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category', 'other'))")
    local mainnet=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('contracts', {}).get('neo-n3-mainnet', '')[:20]+'...')")
    
    echo ""
    echo "  ╔════════════════════════════════════════╗"
    echo "  ║     Registration Data                  ║"
    echo "  ╠════════════════════════════════════════╣"
    echo "  ║ App ID:      $app_id"
    echo "  ║ Name:        $name / $name_zh"
    echo "  ║ Category:    $category"
    echo "  ║ Contract:    $mainnet"
    echo "  ║ CDN URL:     $CDN_URL/$app_name/"
    echo "  ║ Environment: $ENVIRONMENT"
    echo "  ╚════════════════════════════════════════╝"
    echo ""
    
    log_info "[$app_name] Published successfully!"
    log_info "Access at: $CDN_URL/$app_name/"
}

# List of all miniapps
list_miniapps() {
    ls -d "$APPS_DIR"/*/ | xargs -I {} basename {} | sort
}

# Main logic
case "$1" in
    all)
        log_info "Publishing all miniapps to $ENVIRONMENT..."
        for app in $(list_miniapps); do
            publish_miniapp "$app" || true
        done
        ;;
    list)
        echo "Available miniapps:"
        list_miniapps
        ;;
    --help|-h)
        echo "Neo MiniApps Publisher"
        echo ""
        echo "Usage: $0 [miniapp-name|all|list] [environment]"
        echo ""
        echo "Environments: staging, production"
        echo ""
        echo "Environment variables (.env.local):"
        echo "  R2_ENDPOINT            - R2 API endpoint"
        echo "  R2_ACCESS_KEY_ID       - R2 access key"
        echo "  R2_SECRET_ACCESS_KEY   - R2 secret key"
        echo "  R2_BUCKET_STAGING      - Staging bucket name"
        echo "  R2_BUCKET_PRODUCTION   - Production bucket name"
        echo "  CF_API_TOKEN           - Cloudflare API token"
        echo "  CF_ACCOUNT_ID          - Cloudflare account ID"
        echo "  NEXT_PUBLIC_CDN_URL    - Public CDN URL"
        echo ""
        echo "Examples:"
        echo "  $0 lottery staging     # Publish lottery to staging"
        echo "  $0 all production      # Publish all to production"
        echo "  $0 list                # List all miniapps"
        ;;
    "")
        echo "Error: Miniapp name required"
        echo "Usage: $0 [miniapp-name|all] [environment]"
        echo ""
        echo "Available miniapps:"
        list_miniapps
        exit 1
        ;;
    *)
        publish_miniapp "$1"
        ;;
esac
