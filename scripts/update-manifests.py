#!/usr/bin/env python3
"""
Update all neo-manifest.json files to include:
- Chinese name and description
- Neo N3 contract addresses
- Default network
"""
import json
import os
from pathlib import Path

APPS_DIR = Path("apps")

# Category mapping with Chinese
CATEGORY_MAP = {
    "games": {"en": "Games", "zh": "游戏"},
    "governance": {"en": "Governance", "zh": "治理"},
    "finance": {"en": "Finance", "zh": "金融"},
    "social": {"en": "Social", "zh": "社交"},
    "tools": {"en": "Tools", "zh": "工具"},
    "other": {"en": "Other", "zh": "其他"},
}

# App name translations (common ones)
NAME_TRANSLATIONS = {
    "lottery": {"en": "Lottery", "zh": "彩票游戏"},
    "coin-flip": {"en": "Coin Flip", "zh": "抛硬币"},
    "neo-swap": {"en": "Neo Swap", "zh": "Neo 兑换"},
    "neo-ns": {"en": "Neo Name Service", "zh": "Neo 域名服务"},
    "neo-gacha": {"en": "Neo Gacha", "zh": "Neo 盲盒"},
    "neo-multisig": {"en": "Neo Multisig", "zh": "Neo 多签钱包"},
    "neo-treasury": {"en": "Neo Treasury", "zh": "Neo 财库"},
    "neo-convert": {"en": "Neo Convert", "zh": "Neo 转换器"},
    "neo-news-today": {"en": "Neo News Today", "zh": "Neo 今日资讯"},
    "neo-sign-anything": {"en": "Neo Sign Anything", "zh": "Neo 签名工具"},
    "piggy-bank": {"en": "Piggy Bank", "zh": "存钱罐"},
    "gas-sponsor": {"en": "Gas Sponsor", "zh": "Gas 赞助商"},
    "wallet-health": {"en": "Wallet Health", "zh": "钱包健康"},
    "event-ticket-pass": {"en": "Event Ticket", "zh": "活动门票"},
    "stream-vault": {"en": "Stream Vault", "zh": "流媒体金库"},
    "soulbound-certificate": {"en": "Soulbound Certificate", "zh": "灵魂绑定证书"},
    "quadratic-funding": {"en": "Quadratic Funding", "zh": "二次方资助"},
    "hall-of-fame": {"en": "Hall of Fame", "zh": "名人堂"},
    "memorial-shrine": {"en": "Memorial Shrine", "zh": "纪念堂"},
    "milestone-escrow": {"en": "Milestone Escrow", "zh": "里程碑托管"},
    "guardian-policy": {"en": "Guardian Policy", "zh": "守护者策略"},
    "time-capsule": {"en": "Time Capsule", "zh": "时间胶囊"},
    "timestamp-proof": {"en": "Timestamp Proof", "zh": "时间戳证明"},
    "forever-album": {"en": "Forever Album", "zh": "永恒相册"},
    "graveyard": {"en": "Graveyard", "zh": "墓地"},
    "burn-league": {"en": "Burn League", "zh": "燃烧联赛"},
    "masquerade-dao": {"en": "Masquerade DAO", "zh": "化妆舞会 DAO"},
    "garden-of-neo": {"en": "Garden of Neo", "zh": "Neo 花园"},
    "flashloan": {"en": "Flash Loan", "zh": "闪电贷"},
    "prediction-market": {"en": "Prediction Market", "zh": "预测市场"},
    "unbreakable-vault": {"en": "Unbreakable Vault", "zh": "无法破碎的金库"},
    "compound-capsule": {"en": "Compound Capsule", "zh": "复利胶囊"},
    "self-loan": {"en": "Self Loan", "zh": "自我借贷"},
    "ex-files": {"en": "Ex Files", "zh": "前任文件"},
    "dev-tipping": {"en": "Developer Tipping", "zh": "开发者打赏"},
    "breakup-contract": {"en": "Breakup Contract", "zh": "分手合约"},
    "doomsday-clock": {"en": "Doomsday Clock", "zh": "末日时钟"},
    "on-chain-tarot": {"en": "On-chain Tarot", "zh": "链上塔罗牌"},
    "red-envelope": {"en": "Red Envelope", "zh": "红包"},
    "turtle-match": {"en": "Turtle Match", "zh": "乌龟匹配"},
    "candidate-vote": {"en": "Candidate Vote", "zh": "候选人投票"},
    "council-governance": {"en": "Council Governance", "zh": "理事会治理"},
    "charity-vault": {"en": "Charity Vault", "zh": "慈善金库"},
    "grant-share": {"en": "Grant Share", "zh": "资助分享"},
    "heritage-trust": {"en": "Heritage Trust", "zh": "遗产信托"},
    "daily-checkin": {"en": "Daily Check-in", "zh": "每日签到"},
    "governance-merchant": {"en": "Governance Merchant", "zh": "治理商家"},
    "explorer": {"en": "Block Explorer", "zh": "区块浏览器"},
    "million-piece-map": {"en": "Million Piece Map", "zh": "百万碎片地图"},
    "social-karma": {"en": "Social Karma", "zh": "社交因果"},
    "trustanchor": {"en": "Trust Anchor", "zh": "信任锚点"},
    "neoburger": {"en": "Neo Burger", "zh": "Neo 汉堡"},
}

def update_manifest(app_dir):
    manifest_path = app_dir / "neo-manifest.json"
    if not manifest_path.exists():
        print(f"  ⚠ {app_dir.name}: No neo-manifest.json")
        return False
    
    app_name = app_dir.name
    
    try:
        with open(manifest_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ✗ {app_name}: Invalid JSON - {e}")
        return False
    
    # Get name translations
    name_info = NAME_TRANSLATIONS.get(app_name, {"en": app_name.replace("-", " ").title(), "zh": app_name.replace("-", " ").title()})
    
    # Get category info
    cat = data.get("category", "other")
    cat_info = CATEGORY_MAP.get(cat, {"en": cat.title(), "zh": cat.title()})
    
    # Build new manifest with all fields
    new_manifest = {
        "$schema": "https://schemas.r3e.network/miniapp-manifest/v1.json",
        
        # Basic info
        "id": data.get("id", app_name),
        "name": name_info["en"],
        "name_zh": name_info["zh"],
        "version": data.get("version", "1.0.0"),
        
        # Description (support both languages)
        "description": data.get("description", f"{name_info['en']} miniapp on Neo N3"),
        "description_zh": data.get("description_zh", f"{name_info['zh']} - Neo N3 去中心化应用"),
        
        # Category
        "category": cat,
        "category_name": cat_info["en"],
        "category_name_zh": cat_info["zh"],
        
        # Tags
        "tags": data.get("tags", [cat, "neo-n3"]),
        
        # Developer
        "developer": {
            "name": data.get("developer", {}).get("name", "R3E Network") if isinstance(data.get("developer"), dict) else "R3E Network",
            "email": data.get("developer", {}).get("email", "dev@r3e.network") if isinstance(data.get("developer"), dict) else "dev@r3e.network",
            "website": data.get("developer", {}).get("website", "https://r3e.network") if isinstance(data.get("developer"), dict) else "https://r3e.network"
        },
        
        # Contracts (Neo N3 only)
        "contracts": {
            "neo-n3-mainnet": {
                "address": data.get("contracts", {}).get("neo-n3-mainnet", {}).get(
                    "address",
                    data.get("contracts", {}).get("primary", "0x0000000000000000000000000000000000000000")
                )
            },
            "neo-n3-testnet": {
                "address": data.get("contracts", {}).get("neo-n3-testnet", {}).get("address", "")
            }
        },

        # Default network
        "default_network": "neo-n3-mainnet",
        
        # URLs
        "urls": {
            "entry": data.get("entry_url", data.get("urls", {}).get("entry", "/index.html")),
            "icon": data.get("icon", data.get("urls", {}).get("icon", "/logo.png")),
            "banner": data.get("banner", data.get("urls", {}).get("banner", "/banner.png"))
        },
        
        # Permissions
        "permissions": data.get("permissions", ["invoke:primary", "read:blockchain"]),
        
        # Features
        "features": {
            "stateless": data.get("features", {}).get("stateless", True),
            "offlineSupport": data.get("features", {}).get("offlineSupport", False),
            "deeplink": data.get("features", {}).get("deeplink", f"neomainapp://{app_name}")
        },
        
        # State source
        "stateSource": {
            "type": data.get("stateSource", {}).get("type", "smart-contract"),
            "chain": data.get("stateSource", {}).get("chain", "neo-n3-mainnet"),
            "endpoints": data.get("stateSource", {}).get("endpoints", ["https://mainnet1.neo.coz.io:443"])
        },
        
        # Platform tracking
        "platform": {
            "analytics": data.get("platform", {}).get("analytics", True),
            "comments": data.get("platform", {}).get("comments", True),
            "ratings": data.get("platform", {}).get("ratings", True),
            "transactions": data.get("platform", {}).get("transactions", True)
        },
        
        # Timestamps
        "createdAt": data.get("createdAt", "2026-01-01T00:00:00Z"),
        "updatedAt": "2026-01-26T12:00:00Z"
    }
    
    # Write updated manifest
    with open(manifest_path, "w") as f:
        json.dump(new_manifest, f, indent=2, ensure_ascii=False)
    
    print(f"  ✓ {app_name}: Updated")
    return True

def main():
    print("Updating all neo-manifest.json files with extended schema...\n")
    
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
