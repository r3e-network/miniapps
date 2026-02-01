#!/usr/bin/env python3
"""Create neo-manifest.json for missing miniapps"""
import json
import os
from pathlib import Path

APPS_DIR = Path("apps")

def create_manifest(app_dir):
    app_name = app_dir.name
    
    # Determine category from name
    category = "other"
    if any(kw in app_name.lower() for kw in ["lottery", "flip", "gacha", "game", "turtle", "album"]):
        category = "games"
    elif any(kw in app_name.lower() for kw in ["vote", "gov", "council", "trust", "grant", "funding", "policy"]):
        category = "governance"
    elif any(kw in app_name.lower() for kw in ["swap", "convert", "loan", "bank", "vault", "escrow", "sponsor"]):
        category = "finance"
    elif any(kw in app_name.lower() for kw in ["news", "karma", "masquerade", "dao"]):
        category = "social"
    elif any(kw in app_name.lower() for kw in ["ns", "sign", "health", "ticket", "envelope", "capsule", "clock", "tarot"]):
        category = "tools"
    
    manifest = {
        "$schema": "https://schemas.r3e.network/miniapp-manifest/v1.json",
        "id": app_name,
        "name": app_name.replace("-", " ").title(),
        "version": "1.0.0",
        "description": f"{app_name.replace('-', ' ').title()} miniapp on Neo N3",
        "category": category,
        "tags": [category],
        "developer": {
            "name": "R3E Network",
            "email": "dev@r3e.network",
            "website": "https://r3e.network"
        },
        "contracts": {
            "primary": "0x0000000000000000000000000000000000000000"
        },
        "urls": {
            "entry": "/index.html",
            "icon": "/logo.png",
            "banner": "/banner.png"
        },
        "permissions": ["invoke:primary", "read:blockchain"],
        "features": {
            "stateless": True,
            "offlineSupport": False,
            "deeplink": f"neomainapp://{app_name}"
        },
        "stateSource": {
            "type": "smart-contract",
            "chain": "neo-n3-mainnet",
            "endpoints": ["https://neo.coz.io/mainnet"]
        },
        "platform": {
            "analytics": True,
            "comments": True,
            "ratings": True,
            "transactions": True
        },
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-26T00:00:00Z"
    }
    
    manifest_path = app_dir / "neo-manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"  ✓ {app_name}: Created")

def main():
    print("Creating neo-manifest.json for missing apps...\n")
    
    missing = ["charity-vault", "prediction-market", "social-karma", "timestamp-proof"]
    
    for app_name in missing:
        app_dir = APPS_DIR / app_name
        if app_dir.exists():
            create_manifest(app_dir)
        else:
            print(f"  ⚠ {app_name}: Directory not found")

if __name__ == "__main__":
    main()
