#!/bin/bash
# Validate all package.json files are valid JSON

echo "Validating package.json files..."

python3 << 'PYTHON'
import json
import glob
import os

print("Validating package.json files...")
ERRORS = 0

# Validate apps
for f in glob.glob("apps/*/package.json"):
    try:
        with open(f) as file:
            json.load(file)
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON: {f}")
        ERRORS += 1

# Validate shared
try:
    with open("shared/package.json") as f:
        json.load(f)
except:
    print("✗ Invalid JSON: shared/package.json")
    ERRORS += 1

# Validate SDK packages
for f in glob.glob("sdk/packages/*/package.json"):
    try:
        with open(f) as file:
            json.load(file)
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON: {f}")
        ERRORS += 1

if ERRORS == 0:
    print("✓ All package.json files are valid JSON")
else:
    print(f"\nFound {ERRORS} JSON errors")
    exit(1)
PYTHON
