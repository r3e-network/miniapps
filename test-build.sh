#!/bin/bash
set -e

echo "Testing build for charity-vault..."
cd /home/neo/git/miniapps/apps/charity-vault

# Check if dependencies are installed
echo "Checking node_modules..."
ls -la node_modules/@neo/ 2>&1 | head -10 || echo "No @neo directory found"

# Try running build
echo "Running build..."
pnpm run build 2>&1 | head -100

echo "Build completed with exit code: $?"
