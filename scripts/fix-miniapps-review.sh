#!/bin/bash
# Fix script for miniapps review issues
# This script fixes common issues identified in the comprehensive review

set -e

echo "🔧 MiniApps Review Fix Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/home/neo/git/miniapps/apps"

# Function to create useI18n.ts composable
create_usei18n() {
    local app_dir=$1
    local composable_file="$app_dir/src/composables/useI18n.ts"
    
    if [ ! -f "$composable_file" ]; then
        mkdir -p "$app_dir/src/composables"
        cat > "$composable_file" << 'EOF'
import { createUseI18n } from "@shared/composables/useI18n";
import { messages } from "../locale/messages";

export const useI18n = createUseI18n(messages);
EOF
        echo -e "${GREEN}✓${NC} Created useI18n.ts for $(basename $app_dir)"
    fi
}

# Function to fix import paths
fix_import_paths() {
    local app_dir=$1
    local app_vue="$app_dir/src/App.vue"
    
    if [ -f "$app_vue" ]; then
        # Fix @/shared/utils/theme -> @shared/utils/theme
        sed -i 's|from "@/shared/utils/theme"|from "@shared/utils/theme"|g' "$app_vue"
        sed -i "s|from '@/shared/utils/theme'|from '@shared/utils/theme'|g" "$app_vue"
        echo -e "${GREEN}✓${NC} Fixed import paths in $(basename $app_dir)/App.vue"
    fi
}

# Function to update category in manifest
update_category() {
    local app_dir=$1
    local old_category=$2
    local new_category=$3
    local manifest="$app_dir/neo-manifest.json"
    
    if [ -f "$manifest" ]; then
        sed -i "s|\"category\": \"$old_category\"|\"category\": \"$new_category\"|g" "$manifest"
        echo -e "${GREEN}✓${NC} Updated category in $(basename $app_dir): $old_category -> $new_category"
    fi
}

echo ""
echo "📦 Step 1: Creating missing useI18n.ts composables..."
echo "------------------------------------------------------"

# Apps needing useI18n.ts
APPS_NEEDING_I18N=(
    "neo-gacha"
    "neo-multisig"
    "neo-news-today"
    "neo-ns"
    "ex-files"
    "lottery"
    "hall-of-fame"
)

for app in "${APPS_NEEDING_I18N[@]}"; do
    app_dir="$BASE_DIR/$app"
    if [ -d "$app_dir" ]; then
        create_usei18n "$app_dir"
    else
        echo -e "${YELLOW}⚠${NC} App $app not found"
    fi
done

echo ""
echo "🔀 Step 2: Fixing import paths..."
echo "-----------------------------------"

# Apps with import path issues
APPS_WITH_IMPORT_ISSUES=(
    "time-capsule"
    "unbreakable-vault"
    "ex-files"
    "neo-sign-anything"
)

for app in "${APPS_WITH_IMPORT_ISSUES[@]}"; do
    app_dir="$BASE_DIR/$app"
    if [ -d "$app_dir" ]; then
        fix_import_paths "$app_dir"
    fi
done

echo ""
echo "🏷️  Step 3: Fixing category codes..."
echo "-------------------------------------"

# Fix categories
declare -A CATEGORY_FIXES=(
    ["candidate-vote"]="other:governance"
    ["compound-capsule"]="other:finance"
    ["council-governance"]="other:governance"
    ["doomsday-clock"]="other:games"
    ["flashloan"]="other:finance"
    ["garden-of-neo"]="other:games"
    ["gas-sponsor"]="other:tools"
    ["gov-merc"]="other:governance"
    ["graveyard"]="other:tools"
    ["guardian-policy"]="other:governance"
    ["heritage-trust"]="other:finance"
    ["milestone-escrow"]="other:finance"
    ["neoburger"]="other:finance"
    ["on-chain-tarot"]="other:games"
    ["piggy-bank"]="other:finance"
    ["prediction-market"]="other:finance"
    ["self-loan"]="other:finance"
    ["stream-vault"]="other:finance"
    ["trustanchor"]="other:governance"
    ["unbreakable-vault"]="other:games"
)

for app in "${!CATEGORY_FIXES[@]}"; do
    app_dir="$BASE_DIR/$app"
    if [ -d "$app_dir" ]; then
        IFS=':' read -r old_cat new_cat <<< "${CATEGORY_FIXES[$app]}"
        update_category "$app_dir" "$old_cat" "$new_cat"
    fi
done

echo ""
echo "📝 Step 4: Creating missing tsconfig.json..."
echo "---------------------------------------------"

# Create tsconfig.json for trustanchor
TRUSTANCHOR_DIR="$BASE_DIR/trustanchor"
if [ -d "$TRUSTANCHOR_DIR" ] && [ ! -f "$TRUSTANCHOR_DIR/tsconfig.json" ]; then
    cat > "$TRUSTANCHOR_DIR/tsconfig.json" << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../shared/*"]
    },
    "types": ["miniprogram-api-typings", "vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
EOF
    echo -e "${GREEN}✓${NC} Created tsconfig.json for trustanchor"
fi

echo ""
echo "📄 Step 5: Creating missing README.zh-CN.md files..."
echo "----------------------------------------------------"

# Function to create basic README.zh-CN.md
create_chinese_readme() {
    local app_dir=$1
    local app_name=$(basename "$app_dir")
    local readme_file="$app_dir/README.zh-CN.md"
    
    if [ ! -f "$readme_file" ] && [ -f "$app_dir/README.md" ]; then
        # Extract English name from manifest
        local manifest="$app_dir/neo-manifest.json"
        local name_zh=""
        if [ -f "$manifest" ]; then
            name_zh=$(grep -o '"name_zh": "[^"]*"' "$manifest" | cut -d'"' -f4)
        fi
        
        if [ -z "$name_zh" ]; then
            name_zh="$app_name"
        fi
        
        cat > "$readme_file" << EOF
# \${name_zh}

> 本文档为自动生成的中文 README，请根据实际应用更新内容。

## 功能

- 功能 1
- 功能 2
- 功能 3

## 使用方法

1. 打开应用
2. 连接钱包
3. 开始使用

## 开发

\`\`\`bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev:h5

# 构建
pnpm build
\`\`\`

## 合约地址

- Neo N3 主网: TBD
- Neo N3 测试网: TBD

## 许可证

MIT
EOF
        echo -e "${GREEN}✓${NC} Created README.zh-CN.md for $app_name"
    fi
}

# Apps needing README.zh-CN.md
APPS_NEEDING_README=(
    "grant-share"
    "prediction-market"
    "social-karma"
    "timestamp-proof"
    "trustanchor"
)

for app in "${APPS_NEEDING_README[@]}"; do
    app_dir="$BASE_DIR/$app"
    if [ -d "$app_dir" ]; then
        create_chinese_readme "$app_dir"
    fi
done

echo ""
echo "🧹 Step 6: Adding missing 'computed' imports..."
echo "-----------------------------------------------"

# Add computed import to files that use it
add_computed_import() {
    local file=$1
    if [ -f "$file" ]; then
        # Check if file uses computed but doesn't import it
        if grep -q "computed<" "$file" && ! grep -q "import.*computed.*from" "$file"; then
            # Add computed to imports from vue
            sed -i 's/import { ref,/import { ref, computed,/' "$file"
            echo -e "${GREEN}✓${NC} Added computed import to $(basename $(dirname $(dirname $file)))/$(basename $file)"
        fi
    fi
}

# Check specific apps known to have this issue
APPS_NEEDING_COMPUTED=(
    "explorer/src/pages/index/index.vue"
    "flashloan/src/pages/index/index.vue"
    "lottery/src/pages/index/index.vue"
    "council-governance/src/pages/index/index.vue"
)

for rel_path in "${APPS_NEEDING_COMPUTED[@]}"; do
    add_computed_import "$BASE_DIR/$rel_path"
done

echo ""
echo "✅ Fix script completed!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. Review the changes made"
echo "2. Build affected miniapps to verify fixes"
echo "3. Manually address contract deployment issues"
echo ""
