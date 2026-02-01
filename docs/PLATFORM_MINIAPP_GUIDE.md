# Miniapp Platform Integration Guide

Complete guide for platforms to integrate, load, and interact with NEO miniapps.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [CDN Integration](#cdn-integration)
4. [Supabase API](#supabase-api)
5. [Loading Miniapps](#loading-miniapps)
6. [PostMessage Communication](#postmessage-communication)
7. [Security Best Practices](#security-best-practices)
8. [Examples](#examples)

---

## Overview

NEO miniapps are standalone web applications hosted on Cloudflare R2 CDN with metadata stored in Supabase. Each miniapp:

- **Hosted at**: `https://meshmini.app/miniapps/{appShortId}/index.html`
- **Metadata**: Stored in Supabase `miniapp_stats` table
- **Communication**: Via `window.postMessage` API
- **Isolation**: Loaded in iframe with controlled permissions

### Quick Start

```html
<!-- Load a miniapp -->
<iframe
    src="https://meshmini.app/miniapps/explorer/index.html"
    id="miniapp-frame"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
>
</iframe>
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Platform (Your App)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Discovery   │  │    Auth      │  │  State Mgmt      │  │
│  │   Service    │  │   Service    │  │     Service      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                   │            │
└─────────┼──────────────────┼───────────────────┼────────��───┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Supabase      │  │      CDN        │  │   Miniapp       │
│   (Metadata)    │  │  (Hosted Apps)  │  │   (iframe)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Components

1. **Supabase**: Miniapp metadata, categories, search, statistics
2. **CDN**: Hosted miniapp files (HTML, JS, CSS, assets)
3. **Platform Integration**: Your app that loads and manages miniapps
4. **Miniapp**: Standalone web app with defined PostMessage API

---

## CDN Integration

### Base URL

```
https://meshmini.app
```

### CDN Structure

```
/miniapps/
  ├── {appShortId}/
  │   ├── index.html          # Entry point
  │   ├── neo-manifest.json   # App metadata
  │   └── static/
  │       ├── *.js
  │       ├── *.css
  │       ├── logo.png
  │       └── banner.png
```

### Loading from CDN

#### Method 1: Direct iframe (Simple)

```javascript
const loadMiniapp = (appShortId) => {
    const url = `https://meshmini.app/miniapps/${appShortId}/index.html`;

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.sandbox =
        "allow-scripts allow-same-origin allow-forms allow-popups allow-modals";
    iframe.id = `miniapp-${appShortId}`;

    document.getElementById("miniapp-container").appendChild(iframe);

    return iframe;
};
```

#### Method 2: With Initial Config (Advanced)

```javascript
const loadMiniappWithConfig = async (
    appShortId,
    initialConfig,
    containerId = "miniapp-container",
) => {
    const url = `https://meshmini.app/miniapps/${appShortId}/index.html`;
    const targetOrigin = new URL(url).origin;
    const iframe = document.createElement("iframe");

    iframe.src = url;
    iframe.id = `miniapp-${appShortId}`;
    iframe.title = appShortId;
    iframe.sandbox =
        "allow-scripts allow-same-origin allow-forms allow-popups allow-modals";

    // Setup message listener before loading
    const messageHandler = (event) => {
        if (event.origin !== targetOrigin) return;
        if (event.source !== iframe.contentWindow) return;

        if (event.data?.type === "miniapp_ready") {
            // Miniapp is ready, send initial config
            iframe.contentWindow?.postMessage(
                {
                    type: "miniapp_config",
                    config: initialConfig,
                },
                targetOrigin,
            );

            // Remove this listener after init
            window.removeEventListener("message", messageHandler);
        }
    };

    window.addEventListener("message", messageHandler);

    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    container.appendChild(iframe);

    return iframe;
};
```

> Tip: For layout-aware miniapps, add `layout=web|mobile` to the entry URL and
> mirror the same value in `miniapp_config.layout`. Wallet hosts should use
> `layout=mobile`.

---

## Supabase API

### Base Configuration

```javascript
const SUPABASE_CONFIG = {
    url: "https://dmonstzalbldzzdbbcdj.supabase.co",
    // Use anonymous key for client-side operations
    anonKey: "your-anon-key-here", // Get from Supabase settings
    table: "miniapp_stats",
};
```

> Note: Enforce RLS so the anon key is read-only. Route any writes or counters
> through your platform backend or Supabase RPC functions.

### API Endpoints

#### 1. List All Miniapps

```javascript
const listAllMiniapps = async () => {
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?select=*&order=name.asc`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Failed to fetch miniapps");
    return response.json();
};
```

#### 2. Get Miniapp by ID

```javascript
const getMiniappById = async (appId) => {
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?app_id=eq.${appId}&select=*`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Miniapp not found");
    const data = await response.json();
    return data[0];
};
```

#### 3. Search Miniapps

```javascript
const searchMiniapps = async (query) => {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?select=*&searchable_text=ilike.*${encodedQuery}*`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Search failed");
    return response.json();
};
```

#### 4. Filter by Category

```javascript
const getMiniappsByCategory = async (category) => {
    const encodedCategory = encodeURIComponent(category);
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?category=eq.${encodedCategory}&select=*&order=name.asc`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Failed to filter by category");
    return response.json();
};
```

#### 5. Get Featured Miniapps

```javascript
const getFeaturedMiniapps = async () => {
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?is_featured=eq.true&select=*&order=name.asc`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Failed to fetch featured miniapps");
    return response.json();
};
```

#### 6. Get Miniapp Statistics

```javascript
const getMiniappStats = async (appId) => {
    const response = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/miniapp_stats?app_id=eq.${appId}&select=view_count,usage_count,last_accessed_at`,
        {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            },
        },
    );

    if (!response.ok) throw new Error("Failed to fetch statistics");
    const data = await response.json();
    return data[0];
};
```

### Response Schema

```typescript
interface Miniapp {
    // Identifiers
    app_id: string; // e.g., "miniapp-explorer"
    app_short_id: string; // e.g., "explorer"
    chain_id: string; // e.g., "neo-n3-mainnet"

    // Basic Info
    name: string;
    name_zh: string;
    description: string;
    description_zh: string;
    version: string;

    // Categorization
    category: string; // e.g., "social", "games", "finance"
    category_name: string;
    category_name_zh: string;
    tags: string[]; // JSON array

    // Developer
    developer_name: string;
    developer_email: string;
    developer_website: string;

    // URLs
    logo_url: string;
    banner_url: string;
    entry_url: string; // CDN URL

    // Contract
    contract_address: string;
    contracts: Record<string, { address: string | null; active: boolean }>;
    default_network: string;

    // Features
    feature_stateless: boolean;
    feature_offline_support: boolean;
    feature_deeplink: string | null;

    // Platform Features
    platform_analytics: boolean;
    platform_comments: boolean;
    platform_ratings: boolean;
    platform_transactions: boolean;

    // State Source
    state_source_type: string | null;
    state_source_endpoints: string[];

    // Status
    is_featured: boolean;
    is_verified: boolean;
    is_active: boolean;

    // Statistics
    view_count: number;
    usage_count: number;
    last_accessed_at: string;

    // Metadata
    manifest_json: string; // Full manifest as JSON
    searchable_text: string; // For full-text search
    created_at: string;
    updated_at: string;
}

interface MiniAppSDKConfig {
    appId: string;
    contractAddress?: string | null;
    chainId?: string | null;
    contracts?: Record<string, any>;
    defaultNetwork?: string;
    layout?: "web" | "mobile";
    debug?: boolean;
}
```

---

## Loading Miniapps

### Complete Loading Service

```typescript
class MiniappLoader {
    private supabaseUrl: string;
    private anonKey: string;
    private cdnUrl: string;
    private platformApiUrl?: string;
    private loadedApps: Map<string, HTMLIFrameElement>;

    constructor(config: {
        supabaseUrl: string;
        anonKey: string;
        cdnUrl: string;
        platformApiUrl?: string;
    }) {
        this.supabaseUrl = config.supabaseUrl;
        this.anonKey = config.anonKey;
        this.cdnUrl = config.cdnUrl;
        this.platformApiUrl = config.platformApiUrl;
        this.loadedApps = new Map();
    }

    /**
     * Load a miniapp by ID
     */
    async load(
        appShortId: string,
        containerId: string,
        options?: LoadOptions,
    ): Promise<HTMLIFrameElement> {
        // Check if already loaded
        if (this.loadedApps.has(appShortId)) {
            return this.loadedApps.get(appShortId)!;
        }

        // Fetch metadata
        const metadata = await this.getMetadata(appShortId);

        // Create iframe
        const iframe = this.createIframe(appShortId, metadata, options);
        this.setupConfigHandshake(iframe, metadata, options);

        // Track lifecycle
        iframe.onload = () => this.onLoad(appShortId, metadata);

        // Append to container
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);
        container.appendChild(iframe);

        // Track loaded app
        this.loadedApps.set(appShortId, iframe);

        // Increment view count (background)
        this.incrementViewCount(
            appShortId,
            options?.config?.chainId ?? metadata.chain_id,
        );

        return iframe;
    }

    /**
     * Unload a miniapp
     */
    unload(appShortId: string): void {
        const iframe = this.loadedApps.get(appShortId);
        if (iframe) {
            iframe.remove();
            this.loadedApps.delete(appShortId);
        }
    }

    /**
     * Get miniapp metadata from Supabase
     */
    private async getMetadata(appShortId: string): Promise<Miniapp> {
        const response = await fetch(
            `${this.supabaseUrl}/rest/v1/miniapp_stats?app_short_id=eq.${appShortId}&select=*`,
            {
                headers: {
                    apikey: this.anonKey,
                    Authorization: `Bearer ${this.anonKey}`,
                },
            },
        );

        if (!response.ok)
            throw new Error(`Failed to load metadata for ${appShortId}`);
        const data = await response.json();
        return data[0];
    }

    /**
     * Create iframe with proper configuration
     */
    private createIframe(
        appShortId: string,
        metadata: Miniapp,
        options?: LoadOptions,
    ): HTMLIFrameElement {
        const iframe = document.createElement("iframe");

        // Set source
        iframe.src = options?.entryUrl || metadata.entry_url;

        // Set attributes
        iframe.id = `miniapp-${appShortId}`;
        iframe.title = metadata.name;

        // Sandbox policy - restrict permissions
        const sandbox = ["allow-scripts", "allow-same-origin", "allow-forms"];
        if (options?.allowPopups) sandbox.push("allow-popups");
        if (options?.allowModals) sandbox.push("allow-modals");
        iframe.sandbox = sandbox.join(" ");

        // Styling
        iframe.style.width = options?.width || "100%";
        iframe.style.height = options?.height || "100%";
        iframe.style.border = "none";

        // Loading state
        iframe.setAttribute("data-loading", "true");

        return iframe;
    }

    /**
     * Send miniapp_config after the miniapp signals readiness
     */
    private setupConfigHandshake(
        iframe: HTMLIFrameElement,
        metadata: Miniapp,
        options?: LoadOptions,
    ): void {
        const config = this.buildConfig(metadata, options);
        const targetOrigin = new URL(iframe.src).origin;

        const handler = (event: MessageEvent) => {
            if (event.source !== iframe.contentWindow) return;
            if (event.origin !== targetOrigin) return;

            if (event.data?.type === "miniapp_ready") {
                iframe.contentWindow?.postMessage(
                    {
                        type: "miniapp_config",
                        config,
                    },
                    targetOrigin,
                );
                window.removeEventListener("message", handler);
            }
        };

        window.addEventListener("message", handler);
    }

    private buildConfig(
        metadata: Miniapp,
        options?: LoadOptions,
    ): MiniAppSDKConfig {
        return {
            appId: metadata.app_id,
            contractAddress: metadata.contract_address || null,
            chainId: metadata.default_network || metadata.chain_id || null,
            contracts: metadata.contracts || {},
            defaultNetwork: metadata.default_network || null,
            ...options?.config,
            layout: options?.layout ?? options?.config?.layout ?? "web",
        };
    }

    /**
     * Handle iframe load event
     */
    private onLoad(appShortId: string, metadata: Miniapp): void {
        const iframe = this.loadedApps.get(appShortId);
        if (!iframe) return;

        iframe.removeAttribute("data-loading");
        iframe.setAttribute("data-loaded", "true");

        // Dispatch custom event
        const event = new CustomEvent("miniapp:loaded", {
            detail: { appShortId, metadata },
        });
        document.dispatchEvent(event);
    }

    /**
     * Increment view count (non-blocking)
     */
    private async incrementViewCount(
        appShortId: string,
        chainId?: string,
    ): Promise<void> {
        if (!this.platformApiUrl) return;
        try {
            const url = new URL(
                `/api/miniapps/${appShortId}/view`,
                this.platformApiUrl,
            );
            if (chainId) url.searchParams.set("chain_id", chainId);

            await fetch(url.toString(), { method: "POST" });
        } catch (error) {
            console.warn("Failed to increment view count:", error);
        }
    }
}

interface LoadOptions {
    entryUrl?: string; // include layout=web|mobile in query string when needed
    width?: string;
    height?: string;
    allowPopups?: boolean;
    allowModals?: boolean;
    layout?: "web" | "mobile";
    config?: Partial<MiniAppSDKConfig>; // merged into miniapp_config
}
```

### Usage Example

```typescript
const loader = new MiniappLoader({
    supabaseUrl: "https://dmonstzalbldzzdbbcdj.supabase.co",
    anonKey: "your-anon-key",
    cdnUrl: "https://meshmini.app",
    platformApiUrl: window.location.origin,
});

const entryUrl = new URL(
    "https://meshmini.app/miniapps/explorer/index.html",
);
entryUrl.searchParams.set("layout", "web");

// Load a miniapp
const iframe = await loader.load("explorer", "app-container", {
    entryUrl: entryUrl.toString(),
    width: "100%",
    height: "600px",
    layout: "web",
    config: {
        appId: "miniapp-explorer",
        chainId: "neo-n3-mainnet",
    },
});

// Listen for load event
document.addEventListener("miniapp:loaded", (event: any) => {
    console.log(`Miniapp ${event.detail.appShortId} loaded!`);
});

// Unload when done
loader.unload("explorer");
```

---

## PostMessage Communication

### Message Types

NEO miniapps use a small, fixed bridge protocol over `window.postMessage`:

#### From Miniapp to Platform

```typescript
// Miniapp is ready to receive config
{ type: "miniapp_ready" }

// SDK request (MiniAppSDK.invoke(...))
{
  type: "miniapp_sdk_request",
  id: string,
  method: string,
  params: any[]
}
```

#### From Platform to Miniapp

```typescript
// Send SDK config after miniapp_ready
{
  type: "miniapp_config",
  config: MiniAppSDKConfig
}

// SDK response
{
  type: "miniapp_sdk_response",
  id: string,
  ok: boolean,
  result?: any,
  error?: string
}

// Optional: wallet state updates
{
  type: "miniapp_wallet_state_change",
  connected: boolean,
  address?: string | null,
  chainId?: string | null,
  balance?: {
    native?: string;
    nativeSymbol?: string;
    governance?: string;
    governanceSymbol?: string;
  } | null
}
```

### Communication Service (Host Bridge)

```typescript
class MiniappHostBridge {
    private iframe: HTMLIFrameElement;
    private targetOrigin: string;
    private config: MiniAppSDKConfig;
    private handlers: Map<string, (...params: any[]) => Promise<unknown> | unknown>;

    constructor(iframe: HTMLIFrameElement, config: MiniAppSDKConfig) {
        this.iframe = iframe;
        this.config = config;
        this.targetOrigin = new URL(iframe.src).origin;
        this.handlers = new Map();
        this.handleMessage = this.handleMessage.bind(this);

        window.addEventListener("message", this.handleMessage);
    }

    register(
        method: string,
        handler: (...params: any[]) => Promise<unknown> | unknown,
    ): void {
        this.handlers.set(method, handler);
    }

    dispose(): void {
        window.removeEventListener("message", this.handleMessage);
    }

    private sendConfig(responseOrigin?: string): void {
        if (!this.iframe.contentWindow) return;
        const origin = responseOrigin ?? this.targetOrigin;
        this.iframe.contentWindow.postMessage(
            {
                type: "miniapp_config",
                config: this.config,
            },
            origin,
        );
    }

    private async handleMessage(event: MessageEvent): Promise<void> {
        if (event.source !== this.iframe.contentWindow) return;
        if (event.origin !== this.targetOrigin && event.origin !== "null") return;

        const data = event.data;
        if (!data || typeof data !== "object") return;

        const responseOrigin = event.origin === "null" ? "*" : this.targetOrigin;

        if (data.type === "miniapp_ready") {
            this.sendConfig(responseOrigin);
            return;
        }

        if (data.type !== "miniapp_sdk_request") return;

        const id = String(data.id ?? "").trim();
        const method = String(data.method ?? "").trim();
        const params = Array.isArray(data.params) ? data.params : [];

        if (!id || !method) return;

        const handler = this.handlers.get(method);
        if (!handler) {
            this.respond(
                responseOrigin,
                id,
                false,
                undefined,
                `Unknown method: ${method}`,
            );
            return;
        }

        try {
            const result = await handler(...params);
            this.respond(responseOrigin, id, true, result);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Request failed";
            this.respond(responseOrigin, id, false, undefined, message);
        }
    }

    private respond(
        responseOrigin: string,
        id: string,
        ok: boolean,
        result?: unknown,
        error?: string,
    ): void {
        if (!this.iframe.contentWindow) return;
        this.iframe.contentWindow.postMessage(
            {
                type: "miniapp_sdk_response",
                id,
                ok,
                result,
                error,
            },
            responseOrigin,
        );
    }
}
```

### Usage Example

```typescript
const iframe = document.getElementById("miniapp-explorer") as HTMLIFrameElement;

const bridge = new MiniappHostBridge(iframe, {
    appId: "miniapp-explorer",
    chainId: "neo-n3-mainnet",
    layout: "web",
});

bridge.register("get_user", async () => ({
    address: "0x...",
    network: "mainnet",
}));

bridge.register("sign_transaction", async (tx) => {
    // Sign and return tx
    return { txid: "0x..." };
});

// Cleanup when done
bridge.dispose();
```

---

## Security Best Practices

### 1. iframe Sandbox

Always use restrictive sandbox attributes:

```html
<!-- Minimum required -->
<iframe sandbox="allow-scripts allow-same-origin"></iframe>

<!-- With forms -->
<iframe sandbox="allow-scripts allow-same-origin allow-forms"></iframe>

<!-- With popups (use sparingly) -->
<iframe
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
></iframe>
```

### 2. Origin Validation

Always validate message origins:

If you omit `allow-same-origin` in the iframe sandbox, expect `event.origin` to
be `"null"` and use `"*"` when responding.

Practical pattern:

```typescript
const iframe = document.getElementById("miniapp-frame") as HTMLIFrameElement;
const expectedOrigin = new URL(iframe.src).origin;

window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== expectedOrigin && event.origin !== "null") return;
    // Process message
});
```

### 3. CSP Headers

Implement Content Security Policy:

```http
Content-Security-Policy:
  default-src 'self';
  frame-src https://meshmini.app;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  connect-src 'self' https://*.supabase.co https://meshmini.app;
```

### 4. Data Sanitization

Sanitize all data from miniapps:

```typescript
import DOMPurify from "dompurify";

function sanitizeMiniappOutput(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["div", "span", "p", "a"],
        ALLOWED_ATTR: ["href", "class"],
    });
}
```

### 5. Rate Limiting

Implement rate limiting for API calls:

```typescript
class RateLimiter {
    private calls: Map<string, number[]> = new Map();
    private maxCalls: number;
    private windowMs: number;

    constructor(maxCalls: number, windowMs: number) {
        this.maxCalls = maxCalls;
        this.windowMs = windowMs;
    }

    canProceed(identifier: string): boolean {
        const now = Date.now();
        const calls = this.calls.get(identifier) || [];

        // Remove old calls outside window
        const recentCalls = calls.filter((time) => now - time < this.windowMs);

        if (recentCalls.length >= this.maxCalls) {
            return false;
        }

        recentCalls.push(now);
        this.calls.set(identifier, recentCalls);
        return true;
    }
}

const apiLimiter = new RateLimiter(100, 60000); // 100 calls per minute
```

---

## Examples

### Example 1: Miniapp Discovery UI

```typescript
import React, { useEffect, useState } from 'react';

function MiniappGallery() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMiniapps();
  }, []);

  const loadMiniapps = async () => {
    try {
      const response = await fetch(
        'https://dmonstzalbldzzdbbcdj.supabase.co/rest/v1/miniapp_stats?select=*&order=name.asc',
        {
          headers: {
            'apikey': 'your-anon-key',
            'Authorization': 'Bearer your-anon-key'
          }
        }
      );
      const data = await response.json();
      setMiniapps(data);
    } catch (error) {
      console.error('Failed to load miniapps:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMiniapp = (appShortId: string) => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://meshmini.app/miniapps/${appShortId}/index.html`;
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
    iframe.style.width = '100%';
    iframe.style.height = '600px';

    document.getElementById('miniapp-container')!.appendChild(iframe);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="miniapp-gallery">
      <h2>Available Miniapps</h2>
      <div className="grid">
        {miniapps.map(app => (
          <div key={app.app_short_id} className="card">
            <img src={app.logo_url || '/placeholder.png'} alt={app.name} />
            <h3>{app.name}</h3>
            <p>{app.description}</p>
            <button onClick={() => loadMiniapp(app.app_short_id)}>
              Launch
            </button>
          </div>
        ))}
      </div>
      <div id="miniapp-container"></div>
    </div>
  );
}
```

### Example 2: Category Filter

```typescript
function MiniappCategories() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [miniapps, setMiniapps] = useState<Miniapp[]>([]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      loadAllMiniapps();
    } else {
      loadByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const loadByCategory = async (category: string) => {
    const encodedCategory = encodeURIComponent(category);
    const response = await fetch(
      `https://dmonstzalbldzzdbbcdj.supabase.co/rest/v1/miniapp_stats?category=eq.${encodedCategory}&select=*`,
      {
        headers: {
          'apikey': 'your-anon-key',
          'Authorization': 'Bearer your-anon-key'
        }
      }
    );
    const data = await response.json();
    setMiniapps(data);
  };

  return (
    <div>
      <div className="filters">
        <button onClick={() => setSelectedCategory('all')}>All</button>
        <button onClick={() => setSelectedCategory('social')}>Social</button>
        <button onClick={() => setSelectedCategory('games')}>Games</button>
        <button onClick={() => setSelectedCategory('finance')}>Finance</button>
      </div>
      <MiniappGrid miniapps={miniapps} />
    </div>
  );
}
```

### Example 3: Search Functionality

```typescript
function MiniappSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Miniapp[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setSearching(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://dmonstzalbldzzdbbcdj.supabase.co/rest/v1/miniapp_stats?searchable_text=ilike.*${encodedQuery}*`,
        {
          headers: {
            'apikey': 'your-anon-key',
            'Authorization': 'Bearer your-anon-key'
          }
        }
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search miniapps..."
      />
      {searching && <div>Searching...</div>}
      <MiniappGrid miniapps={results} />
    </div>
  );
}
```

---

## Appendix

### Error Codes

| Code                | Description                     |
| ------------------- | ------------------------------- |
| `MINIAPP_NOT_FOUND` | Miniapp with given ID not found |
| `INVALID_ORIGIN`    | Message from untrusted origin   |
| `TIMEOUT`           | Request timeout                 |
| `NOT_SUPPORTED`     | Method not supported            |
| `PERMISSION_DENIED` | Insufficient permissions        |

### Category List

- `social` - Social networking and communication
- `games` - Games and entertainment
- `finance` - Financial tools and DeFi
- `utility` - Tools and utilities
- `other` - Other categories

### Support

For issues or questions:

- GitHub: [repository URL]
- Documentation: [docs URL]
- Email: support@example.com
