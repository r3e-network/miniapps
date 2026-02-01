# MiniApp Development & Debugging Guide

Complete guide for developing, debugging, and testing Neo MiniApps.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Running MiniApps Locally](#running-miniapps-locally)
- [Debugging Techniques](#debugging-techniques)
- [Testing in Host App](#testing-in-host-app)
- [Testing on CDN](#testing-on-cdn)
- [Common Issues & Solutions](#common-issues--solutions)
- [Tools & Utilities](#tools--utilities)

---

## Quick Start

```bash
# 1. Navigate to a miniapp
cd apps/lottery

# 2. Install dependencies (if needed)
pnpm install

# 3. Start dev server
pnpm dev:h5

# 4. Open browser at http://localhost:5173
```

---

## Development Workflow

### Project Structure

Each miniapp follows this structure:

```
apps/{miniapp-name}/
├── src/
│   ├── pages/           # Vue pages (UniApp routing)
│   ├── components/      # Reusable components
│   ├── composables/     # Vue composables
│   ├── static/          # Static assets
│   ├── App.vue          # Root component
│   └── main.ts          # Entry point
├── public/              # Public assets (logo.png, banner.png)
├── neo-manifest.json    # MiniApp manifest (permissions, metadata)
├── manifest.json        # UniApp config
├── pages.json           # UniApp page routing
├── package.json         # Dependencies
├── vite.config.ts       # Vite build config
└── dist/build/h5/       # Build output (H5)
```

### Available Commands

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `pnpm dev`      | Start UniApp dev server (multi-platform) |
| `pnpm dev:h5`   | Start H5-specific dev server (port 5173) |
| `pnpm build`    | Build H5 production bundle               |
| `pnpm build:h5` | Alias for `pnpm build`                   |

---

## Running MiniApps Locally

### Method 1: Vite Dev Server (Recommended for Development)

```bash
cd apps/{miniapp-name}
pnpm dev:h5
```

**Features:**

- Hot Module Replacement (HMR)
- Fast refresh
- Source maps
- Vue DevTools support
- Network access (accessible from other devices on LAN)

**Access URLs:**

- Local: http://localhost:5173
- Network: http://192.168.x.x:5173 (check terminal output)

### Method 2: Build & Preview

```bash
# Build the miniapp
cd apps/{miniapp-name}
pnpm build:h5

# Preview with any static server
cd dist/build/h5
python3 -m http.server 8080
# or
npx serve .
```

**Features:**

- Production-optimized build
- Test actual bundle size
- Verify production behavior

### Method 3: Live Preview from CDN

If already deployed to CDN:

```bash
# Build and deploy single app
pnpm build:h5
cp -r dist/build/h5/* ~/path/to/host-app/public/miniapps/{app-name}/

# Or access directly from CDN
open https://meshmini.app/miniapps/{app-name}/index.html
```

---

## Debugging Techniques

### Browser DevTools

All miniapps support standard browser DevTools:

```bash
# Open DevTools in Chrome/Edge:
# - F12 or Ctrl+Shift+I (Windows/Linux)
# - Cmd+Option+I (macOS)
```

**Key Tabs:**

| Tab             | Usage                             |
| --------------- | --------------------------------- |
| **Console**     | View logs, errors, warnings       |
| **Network**     | Inspect API calls, SDK requests   |
| **Elements**    | Inspect DOM, CSS styles           |
| **Sources**     | Debug TypeScript/Vue source maps  |
| **Application** | View localStorage, sessionStorage |

### Vue DevTools

Install [Vue DevTools browser extension](https://devtools.vuejs.org/):

```bash
# Chrome/Edge: https://chrome.google.com/webstore
# Firefox: https://addons.mozilla.org/firefox/
```

**Features:**

- Component tree inspection
- Props, state, and events tracking
- Vuex/Pinia store inspection
- Performance profiling
- Router debugging

### Console Logging

```typescript
// Standard logging
console.log("Data:", data);
console.error("Error:", error);
console.warn("Warning:", warning);

// Grouped logging
console.group("API Request");
console.log("URL:", url);
console.log("Payload:", payload);
console.groupEnd();

// Table logging for arrays
console.table(arrayData);

// Trace execution path
console.trace("Execution path");
```

### Network Request Debugging

```typescript
// Log all SDK calls
import { useWallet } from "@neo/uniapp-sdk";

const { invokeRead } = useWallet();

// Add debugging
const result = await invokeRead({
    scriptHash: "0x...",
    operation: "balanceOf",
    args: [],
});
console.log("Contract result:", result);
```

**Check Network Tab:**

- Look for Supabase API calls
- RPC endpoint requests
- CDN asset loading
- WebSocket connections

### PostMessage Communication Debugging

For miniapps loaded in iframes:

```typescript
// In host app (sdk/platform/host-app)
window.addEventListener("message", (event) => {
    console.log("Received postMessage:", event.data);
    console.log("Origin:", event.origin);
});

// In miniapp
window.parent.postMessage(
    {
        type: "MINIAPP_REQUEST",
        method: "wallet.getAddress",
    },
    "*",
);
```

**Security Note:** Always validate `event.origin` in production.

### Source Maps

Source maps are enabled by default in dev mode:

```typescript
// vite.config.ts
export default {
    build: {
        sourcemap: true, // Enable for production debugging
    },
};
```

---

## Testing in Host App

The host app (NeoHub) provides a complete miniapp platform environment.

### Starting Host App Locally

```bash
# Navigate to host app
cd sdk/platform/host-app

# Install dependencies (first time only)
pnpm install

# Start dev server
pnpm dev
```

**Access:** http://localhost:3000

### Loading a Miniapp in Host App

**Method 1: URL Parameter**

```
http://localhost:3000/?entry_url=/miniapps/lottery/index.html
```

**Method 2: Launch Page**

```
http://localhost:3000/launch/lottery
```

### Host App Features for Debugging

1. **MiniApp Registry** - View all registered miniapps
2. **Settings Panel** - Configure Edge base URL, Auth JWT
3. **Wallet Binding** - Test wallet integration
4. **Intent Submission** - Test on-chain operations
5. **PostMessage Bridge** - Test cross-origin communication

### Local Development Workflow

```bash
# Terminal 1: Build and watch miniapp
cd apps/lottery
pnpm dev:h5

# Terminal 2: Start host app
cd sdk/platform/host-app
pnpm dev

# Terminal 3: Copy build to host (if using built version)
cd apps/lottery
pnpm build:h5
cp -r dist/build/h5/* ../../sdk/platform/host-app/public/miniapps/lottery/
```

---

## Testing on CDN

### Deploy Single Miniapp

```bash
# Build the miniapp
cd apps/{miniapp-name}
pnpm build:h5

# Copy to public directory
cp -r dist/build/h5/* ../../../public/miniapps/{miniapp-name}/

# Upload to CDN
cd ../../..
node scripts/deploy/upload-built.js production
```

### Verify Deployment

```bash
# Run comprehensive check
node scripts/comprehensive-check.js

# Or check specific app
curl -I https://meshmini.app/miniapps/{miniapp-name}/index.html
```

### CDN Testing Checklist

- [ ] Miniapp loads without errors
- [ ] All assets (images, CSS, JS) load correctly
- [ ] SDK functions work (wallet, payments, RNG)
- [ ] PostMessage communication works
- [ ] Permissions are enforced
- [ ] Console has no errors
- [ ] Network requests complete successfully

---

## Common Issues & Solutions

### Issue: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5173`

**Solution:**

```bash
# Find and kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port
pnpm dev:h5 -- --port 5174
```

### Issue: Hot Module Replacement Not Working

**Symptoms:** Changes don't reflect in browser

**Solutions:**

```bash
# 1. Clear Vite cache
rm -rf node_modules/.vite
pnpm dev:h5

# 2. Hard refresh browser (Ctrl+Shift+R)

# 3. Check for file watcher limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Issue: SDK Not Found

**Error:** `Cannot find module '@neo/uniapp-sdk'`

**Solution:**

```bash
# From miniapp root
cd apps/{miniapp-name}
rm -rf node_modules
pnpm install

# If still failing, from repo root
cd ../..
pnpm install
cd apps/{miniapp-name}
pnpm install
```

### Issue: Build Fails

**Common causes:**

1. **TypeScript errors:**

    ```bash
    # Run typecheck to see specific errors
    pnpm typecheck
    ```

2. **Missing vite.config.ts:**

    ```bash
    # Create vite.config.ts if missing
    echo 'import { createAppConfig } from "../../vite.shared";
    export default createAppConfig(__dirname);' > vite.config.ts
    ```

3. **Memory issues:**
    ```bash
    # Increase Node memory
    NODE_OPTIONS="--max-old-space-size=8192" pnpm build
    ```

### Issue: Miniapp Won't Load in Host App

**Checklist:**

```bash
# 1. Verify build output exists
ls -la sdk/platform/host-app/public/miniapps/{app-name}/

# 2. Check manifest is registered
curl https://meshmini.app/data/miniapps.json | jq '.[] | select(.id=="miniapp-{app-name}")'

# 3. Check console for errors
# Open DevTools in host app and check for:
# - 404 errors for missing files
# - CORS errors for cross-origin requests
# - CSP violations
```

### Issue: Wallet Connection Fails

**Debug steps:**

1. **Verify NeoLine is installed:**

    ```javascript
    // In browser console
    console.log("NeoLine:", window.neoLine);
    ```

2. **Check wallet is unlocked:**

    ```javascript
    // Trigger wallet connect
    await wallet.connect();
    ```

3. **Verify network matches:**
    ```javascript
    // Check if on correct network (neo-n3-mainnet or neo-n3-testnet)
    const network = await wallet.getNetwork();
    console.log("Network:", network);
    ```

### Issue: PostMessage Not Working

**Debug steps:**

```javascript
// In host app, add message listener
window.addEventListener("message", (event) => {
    console.log("Message origin:", event.origin);
    console.log("Message data:", event.data);

    // Validate origin
    const expectedOrigin = new URL(entry_url).origin;
    if (event.origin !== expectedOrigin) {
        console.warn("Invalid origin:", event.origin);
        return;
    }
});

// In miniapp, verify parent exists
console.log("Has parent:", window.parent !== window);
console.log("Parent origin:", window.parent.location.origin);
```

---

## Tools & Utilities

### Build All Miniapps

```bash
# Build all 52+ miniapps
pnpm build:all

# Build with bundle analysis
pnpm build:analyze
```

### Registry Management

```bash
# Auto-discover and register all miniapps
pnpm registry:generate

# Sync registry to CDN
pnpm registry:sync

# Register to Supabase
pnpm register:full

# Verify registration
pnpm register:verify
```

### Verification Scripts

```bash
# Check CDN + Supabase consistency
node scripts/comprehensive-check.js

# List Supabase tables
pnpm supabase:list

# Check for duplicates
pnpm supabase:check

# Clean duplicates
pnpm supabase:cleanup:execute
```

### Deployment

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:prod

# Deploy with CDN upload + Supabase registration
pnpm publish
```

---

## Environment Variables

### For Miniapp Development

Create `.env.local` in miniapp root:

```env
# Neo N3 RPC
NEXT_PUBLIC_RPC_URL=https://testnet1.neo.coz.io:443
NEXT_PUBLIC_NETWORK=neo-n3-mainnet

# CDN URL
NEXT_PUBLIC_CDN_URL=https://meshmini.app
```

### For Host App Development

Create `.env.local` in `sdk/platform/host-app/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Edge Functions
EDGE_BASE_URL=http://localhost:8787/functions/v1

# Module Federation (optional)
NEXT_PUBLIC_MF_REMOTES=builtin@http://localhost:3001

# Security
MINIAPP_FRAME_ORIGINS=http://localhost:5173 https://meshmini.app
EDGE_RPC_ALLOWLIST=*
```

---

## Performance Optimization

### Analyze Bundle Size

```bash
cd apps/{miniapp-name}
pnpm build:h5

# Analyze with rollup-plugin-visualizer (if configured)
# Or use:
npx vite-bundle-visualizer
```

### Common Optimizations

1. **Code Splitting:**

    ```typescript
    // Lazy load routes
    const Component = defineAsyncComponent(() => import("./Component.vue"));
    ```

2. **Dynamic Imports:**

    ```typescript
    // Load heavy libraries on demand
    const heavyLib = await import("heavy-library");
    ```

3. **Asset Optimization:**
    ```bash
    # Compress images
    # Use WebP format when possible
    # Minify SVGs
    ```

---

## Testing Checklist

Before deploying to production:

### Functionality

- [ ] All core features work
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Edge cases are handled

### Integration

- [ ] SDK calls work (wallet, payments, RNG, etc.)
- [ ] PostMessage communication works
- [ ] Permissions are enforced

### UX

- [ ] Responsive design works on mobile
- [ ] Loading states are smooth
- [ ] Error messages are user-friendly
- [ ] Animations are performant

### Security

- [ ] No sensitive data in console
- [ ] Proper input validation
- [ ] CSRF protection
- [ ] No exposed API keys

### Performance

- [ ] Initial load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] No memory leaks
- [ ] Proper cleanup on unmount

---

## Additional Resources

- [UniApp Documentation](https://uniapp.dcloud.net.cn/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Platform Integration Guide](./PLATFORM_MINIAPP_GUIDE.md)
- [Deployment Workflow](../DEPLOYMENT_WORKFLOW.md)
- [Development Workflow](../DEVELOPMENT_WORKFLOW.md)
- [Coding Standards](./STANDARDS.md)
