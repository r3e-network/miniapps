#!/bin/bash
# Publish miniapps to CDN and register with platform
# Usage: ./scripts/publish.sh [miniapp-name|all] [environment]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
APPS_DIR="$ROOT_DIR/apps"
CDN_DIR="$ROOT_DIR/public/miniapps"

ENVIRONMENT="${2:-staging}"
R2_BUCKET_VAR="R2_BUCKET_${ENVIRONMENT^^}"
R2_BUCKET="${!R2_BUCKET_VAR}"

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to publish single miniapp
publish_miniapp() {
    local app_name="$1"
    local app_dir="$APPS_DIR/$app_name"
    
    if [ ! -d "$app_dir" ]; then
        log_error "Miniapp not found: $app_name"
        return 1
    fi
    
    echo ""
    log_info "[$app_name] Starting publish..."
    
    # 1. Check neo-manifest.json exists
    if [ ! -f "$app_dir/neo-manifest.json" ]; then
        log_error "[$app_name] Missing neo-manifest.json"
        return 1
    fi
    
    # 2. Validate neo-manifest.json
    echo "  [1/3] Validating manifest..."
    if ! python3 -c "import json; json.load(open('$app_dir/neo-manifest.json'))" 2>/dev/null; then
        log_error "[$app_name] Invalid JSON in neo-manifest.json"
        return 1
    fi
    
    # 3. Build the miniapp
    echo "  [2/3] Building..."
    cd "$app_dir"
    if ! pnpm build > /dev/null 2>&1; then
        log_error "[$app_name] Build failed"
        return 1
    fi
    
    # 4. Copy to local CDN
    echo "  [3/3] Copying to CDN..."
    local cdn_path="$CDN_DIR/$app_name"
    mkdir -p "$cdn_path"
    rm -rf "$cdn_path"/*
    
    if [ -d "dist/build/h5" ]; then
        cp -r "dist/build/h5"/* "$cdn_path/"
    else
        log_warn "[$app_name] No dist/build/h5 found, skipping copy"
    fi
    
    # Extract and display registration data
    local manifest=$(cat neo-manifest.json)
    local app_id=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', '$app_name'))")
    local name=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name', '$app_name'))")
    local category=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category', 'other'))")
    
    echo ""
    echo "  === Registration Data ==="
    echo "  App ID:     $app_id"
    echo "  Name:       $name"
    echo "  Category:   $category"
    echo "  CDN URL:    https://cdn.yourdomain.com/$app_name/"
    echo "  Environment: $ENVIRONMENT"
    echo ""
    
    log_info "[$app_name] Published successfully!"
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
