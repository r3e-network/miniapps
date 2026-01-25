#!/usr/bin/env python3
"""
Update all neo-manifest.json files to follow the unified schema
"""
import json
import os
from pathlib import Path

APPS_DIR = Path("apps")

# Category mapping from old to new
CATEGORY_MAP = {
    "gaming": "games",
    "game": "games",
    "finance": "finance",
    "social": "social",
    "tool": "tools",
    "tools": "tools",
    "other": "other",
    "gambling": "games",
}

def get_app_name(app_dir):
    return app_dir.name

def update_manifest(app_dir):
    manifest_path = app_dir / "neo-manifest.json"
    if not manifest_path.exists():
        print(f"  ⚠ {app_dir.name}: No neo-manifest.json")
        return False
    
    app_name = get_app_name(app_dir)
    
    try:
        with open(manifest_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ✗ {app_name}: Invalid JSON - {e}")
        return False
    
    # Check if already has new schema
    if "$schema" in data and "stateSource" in data:
        print(f"  ✓ {app_name}: Already up to date")
        return True
    
    # Build new manifest
    new_manifest = {
        "$schema": "https://schemas.r3e.network/miniapp-manifest/v1.json",
        "id": data.get("id", data.get("app_id", app_name)),
        "name": data.get("name", app_name),
        "version": data.get("version", "1.0.0"),
        "description": data.get("description", data.get("description_zh", "")),
        "category": CATEGORY_MAP.get(data.get("category", "other"), "other"),
        "tags": data.get("tags", data.get("tag", [])),
        
        "developer": {
            "name": data.get("developer", {}).get("name", "R3E Network") if isinstance(data.get("developer"), dict) else "R3E Network",
            "email": data.get("developer", {}).get("email", "dev@r3e.network") if isinstance(data.get("developer"), dict) else "dev@r3e.network",
            "website": data.get("developer", {}).get("website", "https://r3e.network") if isinstance(data.get("developer"), dict) else "https://r3e.network"
        },
        
        "contracts": {
            "primary": data.get("contracts", {}).get("neo-n3-mainnet", {}).get("address", 
                     data.get("contracts", {}).get("primary", "0x0000000000000000000000000000000000000000"))
        },
        
        "urls": {
            "entry": data.get("entry_url", data.get("urls", {}).get("entry", "/index.html")),
            "icon": data.get("icon", data.get("urls", {}).get("icon", "/logo.png")),
            "banner": data.get("banner", data.get("urls", {}).get("banner", "/banner.png"))
        },
        
        "permissions": [
            "invoke:primary",
            "read:blockchain"
        ],
        
        "features": {
            "stateless": True,
            "offlineSupport": False,
            "deeplink": f"neomainapp://{app_name}"
        },
        
        "stateSource": {
            "type": "smart-contract",
            "chain": "neo-n3-mainnet",
            "endpoints": ["https://neoxrpc1.blackholelabs.io"]
        },
        
        "platform": {
            "analytics": True,
            "comments": True,
            "ratings": True,
            "transactions": True
        },
        
        "createdAt": data.get("createdAt", "2026-01-01T00:00:00Z"),
        "updatedAt": "2026-01-26T00:00:00Z"
    }
    
    # Write updated manifest
    with open(manifest_path, "w") as f:
        json.dump(new_manifest, f, indent=2)
    
    print(f"  ✓ {app_name}: Updated")
    return True

def main():
    print("Updating all neo-manifest.json files...\n")
    
    updated = 0
    skipped = 0
    
    for app_dir in sorted(APPS_DIR.iterdir()):
        if app_dir.is_dir():
            if update_manifest(app_dir):
                updated += 1
            else:
                skipped += 1
    
    print(f"\nSummary: {updated} updated, {skipped} skipped")

if __name__ == "__main__":
    main()
