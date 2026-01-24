#!/bin/bash

# Define app directories
APPS_DIR="/home/neo/git/service_layer/miniapps-uniapp/apps"

# Counter
count=0
total=$(ls -d $APPS_DIR/* | wc -l)

echo "Starting build for $total apps..."

for app_path in $APPS_DIR/*; do
  if [ -d "$app_path" ]; then
    app_name=$(basename "$app_path")
    count=$((count + 1))
    
    echo "[$count/$total] Building $app_name..."
    
    # Run build in background to parallelize (groups of 4)
    (
      cd "$app_path" && \
      ../../node_modules/.bin/uni build -p h5 > /dev/null 2>&1
    ) &
    
    # Wait every 4 jobs
    if (( count % 4 == 0 )); then
      wait
    fi
  fi
done

wait
echo "All builds complete!"
