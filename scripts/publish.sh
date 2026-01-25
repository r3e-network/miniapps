#!/bin/bash
# Publish miniapps to CDN and register with platform
# Usage: ./scripts/publish.sh [miniapp-name|all] [environment]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
APPS_DIR="$ROOT_DIR/apps"
CDN_DIR="$ROOT_DIR/public/miniapps"

ENVIRONMENT="${2:-staging}"
R2_BUCKET="R2_BUCKET_${ENVIRONMENT^^}"
R2_ENDPOINT="${R2_ENDPOINT:-https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com}"

echo "============================================"
echo "Neo MiniApps Publisher"
echo "============================================"
echo "Environment: $ENVIRONMENT"
echo "Bucket: ${!R2_BUCKET}"
echo ""

# Function to publish single miniapp
publish_miniapp() {
    local app_name="$1"
    local app_dir="$APPS_DIR/$app_name"
    
    if [ ! -d "$app_dir" ]; then
        echo "✗ Miniapp not found: $app_name"
        return 1
    fi
    
    echo "[$app_name] Starting publish..."
    
    # 1. Check neo-manifest.json exists
    if [ ! -f "$app_dir/neo-manifest.json" ]; then
        echo "✗ [$app_name] Missing neo-manifest.json"
        return 1
    fi
    
    # 2. Build the miniapp
    echo "  [1/4] Building..."
    cd "$app_dir"
    pnpm build > /dev/null 2>&1 || {
        echo "✗ [$app_name] Build failed"
        return 1
    }
    
    # 3. Validate neo-manifest.json
    echo "  [2/4] Validating manifest..."
    python3 -c "import json; json.load(open('neo-manifest.json'))" || {
        echo "✗ [$app_name] Invalid JSON in neo-manifest.json"
        return 1
    }
    
    # 4. Upload to R2 CDN
    echo "  [3/4] Uploading to CDN..."
    local cdn_path="$CDN_DIR/$app_name"
    mkdir -p "$cdn_path"
    rm -rf "$cdn_path"/*
    cp -r "dist/build/h5"/* "$cdn_path/"
    
    # Sync to R2
    aws s3 sync "$cdn_path/" "s3://${!R2_BUCKET}/$app_name" \
        --endpoint-url="$R2_ENDPOINT" \
        --acl public-read \
        --delete 2>/dev/null || {
        echo "⚠ [$app_name] R2 upload failed (using local CDN)"
    }
    
    # 5. Extract manifest data for registration
    echo "  [4/4] Preparing registration..."
    local manifest=$(cat neo-manifest.json)
    local app_id=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id', '$app_name'))")
    local name=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name', '$app_name'))")
    local description=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('description', ''))")
    local category=$(echo "$manifest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('category', 'other'))")
    
    # Output registration data (to be sent to platform)
    cat << REGEOF
{
  "appId": "$app_id",
  "name": "$name",
  "description": "$description",
  "category": "$category",
  "cdnUrl": "https://cdn.yourdomain.com/$app_name/",
  "version": "1.0.0",
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT"
}
REGEOF
    
    echo "✓ [$app_name] Published successfully"
}

# List of all miniapps
list_miniapps() {
    ls -d "$APPS_DIR"/*/ | xargs -I {} basename {}
}

# Main logic
case "$1" in
    all)
        echo "Publishing all miniapps..."
        for app in $(list_miniapps); do
            publish_miniapp "$app"
        done
        ;;
    list)
        echo "Available miniapps:"
        list_miniapps
        ;;
    --help|-h)
        echo "Usage: $0 [miniapp-name|all|list] [environment]"
        echo ""
        echo "Examples:"
        echo "  $0 lottery staging     # Publish lottery to staging"
        echo "  $0 all production      # Publish all to production"
        echo "  $0 list                # List all miniapps"
        ;;
    "")
        echo "Error: Miniapp name required"
        echo "Usage: $0 [miniapp-name|all] [environment]"
        exit 1
        ;;
    *)
        publish_miniapp "$1"
        ;;
esac
