# Platform CDN Integration Guide

This document explains how a platform can discover and load miniapps from the Cloudflare R2 CDN.

## Overview

The miniapp system uses a **CDN-first architecture** where:

- Miniapps are hosted on Cloudflare R2 with public access
- Platform discovers apps via `miniapps.json` registry
- Apps are loaded in isolated iframes
- Communication happens via PostMessage API

## CDN Structure

### Base URL

```
https://meshmini.app
```

### Miniapp URL Pattern

```
{CDN_BASE_URL}/miniapps/{app-name}/index.html
```

### Registry URL

```
{CDN_BASE_URL}/data/miniapps.json
```

### Example URLs

| Resource     | URL                                                   |
| ------------ | ----------------------------------------------------- |
| Registry     | https://meshmini.app/data/miniapps.json               |
| Lottery App  | https://meshmini.app/miniapps/lottery/index.html      |
| Red Envelope | https://meshmini.app/miniapps/red-envelope/index.html |

---

## Discovery Protocol

### Step 1: Fetch Registry

```typescript
interface MiniappInfo {
    app_id: string; // e.g., "miniapp-lottery"
    name: string; // e.g., "Lottery"
    name_zh: string; // Chinese name
    description: string;
    entry_url: string; // CDN entry point
    icon: string; // Icon URL
    banner: string; // Banner URL
    category: string; // e.g., "game", "utility", "defi"
    version: string;
    status: "active" | "inactive";
}

async function fetchMiniappRegistry(): Promise<{
    [category: string]: MiniappInfo[];
}> {
    const response = await fetch("https://meshmini.app/data/miniapps.json");
    return await response.json();
}
```

---

## Loading Miniapps

### Iframe Integration

```typescript
class MiniappLoader {
    load(app: MiniappInfo, container: HTMLElement): Promise<void> {
        const iframe = document.createElement("iframe");
        iframe.src = this.getCdnUrl(app.entry_url);
        iframe.style.cssText =
            "width:100%;height:100%;border:none;background:#fff";

        container.innerHTML = "";
        container.appendChild(iframe);

        return new Promise((resolve) => {
            iframe.onload = () => {
                this.setupMessaging(iframe);
                resolve();
            };
        });
    }

    private getCdnUrl(path: string): string {
        const baseUrl = "https://meshmini.app";
        return path.startsWith("http") ? path : baseUrl + path;
    }

    private setupMessaging(iframe: HTMLIFrameElement) {
        // Send init context
        iframe.contentWindow?.postMessage(
            {
                type: "init",
                data: {
                    platform: { version: "1.0.0" },
                    user: this.getUserContext(),
                    wallet: this.getWalletContext(),
                },
            },
            "*",
        );

        // Listen for messages
        window.addEventListener("message", (event) => {
            if (event.source !== iframe.contentWindow) return;
            this.handleMessage(event.data);
        });
    }
}
```

---

## Communication Protocol

### Platform -> Miniapp

```typescript
// Initialization
{ type: 'init', data: { platform, user, wallet } }

// Theme change
{ type: 'theme-change', data: { theme: 'dark' | 'light' } }

// Wallet connected
{ type: 'wallet-connected', data: { address, network } }
```

### Miniapp -> Platform

```typescript
// Ready state
{ type: 'ready', data: { app_id, version } }

// Wallet request
{ type: 'wallet-request', data: { method: 'invokeScript', params } }

// Activity tracking
{ type: 'activity', data: { type: 'view|transaction|score', data } }

// Error
{ type: 'error', data: { code, message } }
```

---

## Activity Tracking

```typescript
class ActivityTracker {
    async track(params: {
        app_id: string;
        user_id: string;
        type: "view" | "transaction" | "score" | "comment" | "share";
        data: any;
    }) {
        await fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...params,
                timestamp: Date.now(),
            }),
        });
    }

    async getLeaderboard(appId: string, limit = 100) {
        const response = await fetch(
            `/api/apps/${appId}/leaderboard?limit=${limit}`,
        );
        return response.json();
    }
}
```

---

## Security Considerations

### 1. Origin Validation

```typescript
const ALLOWED_ORIGINS = ["https://meshmini.app"];

function validateOrigin(origin: string): boolean {
    return ALLOWED_ORIGINS.includes(origin);
}
```

### 2. Sandbox Iframe

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
```

### 3. Message Validation

```typescript
function validateMessage(message: any): boolean {
    return typeof message === "object" && typeof message.type === "string";
}
```

---

## Complete Integration Example

```typescript
// 1. Fetch registry
const registry = await fetchMiniappRegistry();

// 2. Get app info
const apps = registry["game"] || [];
const lottery = apps.find((app) => app.app_id === "miniapp-lottery");

// 3. Load app
const loader = new MiniappLoader();
await loader.load(lottery, document.getElementById("app-container"));

// 4. Track activity
const tracker = new ActivityTracker();
await tracker.track({
    app_id: lottery.app_id,
    user_id: currentUser.id,
    type: "view",
    data: { timestamp: Date.now() },
});
```

---

## Quick Reference

| Resource     | URL                                             |
| ------------ | ----------------------------------------------- |
| Registry     | https://meshmini.app/data/miniapps.json         |
| App Template | https://meshmini.app/miniapps/{name}/index.html |

### Available Categories

- game (lottery, coin-flip, neo-gacha...)
- defi (prediction-market, neo-swap, flashloan...)
- social (red-envelope, social-karma, dev-tipping...)
- utility (timestamp-proof, explorer, neo-ns...)
