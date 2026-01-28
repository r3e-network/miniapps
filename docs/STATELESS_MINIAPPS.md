# Stateless Miniapp Development Guide

## Architecture Overview

Miniapps are **stateless** by design. They should NOT store any local state, user data, or application state. Instead, they rely on:

1. **Smart Contracts** - On-chain state storage
2. **External APIs** - Remote data fetch
3. **Platform APIs** - User activity tracking (views, transactions, comments, scores)

## Stateless Design Principles

### ❌ What NOT to Do in Miniapps

```typescript
// ❌ DON'T: Store user data locally
const userData = {
    name: "",
    score: 0,
    history: [],
};
localStorage.setItem("userData", JSON.stringify(userData));

// ❌ DON'T: Store application state
const appState = {
    currentRound: 1,
    participants: [],
};
localStorage.setItem("appState", JSON.stringify(appState));

// ❌ DON'T: Use database connections
// Miniapps have no backend database
```

### ✅ What TO Do Instead

```typescript
// ✅ DO: Fetch state from smart contract
const { getState } = useContract();
const gameState = await getState();

// ✅ DO: Fetch data from external API
const fetchData = async () => {
    const response = await fetch("https://api.example.com/data");
    return response.json();
};

// ✅ DO: Report activity to platform
const { reportActivity } = usePlatform();
reportActivity({
    type: "score",
    data: { score: 100 },
});
```

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Miniapp   │────▶│ Smart Contract │────▶│   Platform   │
│  (Stateless)│     │   (On-chain)  │     │ (Analytics) │
└─────────────┘     └──────────────┘     └─────────────┘
       │                       │
       │                       ▼
       ▼                ┌─────────────┐
┌─────────────┐      │  External API  │
│    CDN      │      │  (Optional)   │
└─────────────┘      └─────────────┘
```

## Using Platform APIs

### Composables for Platform Integration

```typescript
// composables/usePlatform.ts
import { ref } from 'vue'

export function usePlatform(appId: string) {
  const activity = ref(null)

  /**
   * Report user activity to platform
   */
  async reportActivity(type: string, data: any) {
    try {
      await fetch('/api/platform/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-ID': appId
        },
        body: JSON.stringify({ type, data })
      })
    } catch (error) {
      console.warn('Failed to report activity:', error)
    }
  }

  /**
   * Get user's history for this app
   */
  async getUserHistory(userId: string) {
    const response = await fetch(`/api/platform/miniapps/${appId}/history/${userId}`)
    return response.json()
  }

  /**
   * Get leaderboard from platform
   */
  async getLeaderboard(limit = 100) {
    const response = await fetch(`/api/platform/miniapps/${appId}/leaderboard?limit=${limit}`)
    return response.json()
  }

  return {
    reportActivity,
    getUserHistory,
    getLeaderboard
  }
}
```

### Activity Types

| Type          | Description           | Data Example              |
| ------------- | --------------------- | ------------------------- |
| `view`        | User viewed miniapp   | `{ duration: 5000 }`      |
| `transaction` | User made transaction | `{ hash, value, method }` |
| `score`       | User achieved score   | `{ score: 100, rank: 1 }` |
| `comment`     | User posted comment   | `{ content }`             |
| `play`        | User played game      | `{ rounds: 5, won: 3 }`   |
| `share`       | User shared result    | `{ platform: 'twitter' }` |

## Smart Contract Integration

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useWallet } from "@shared/composables";
import { usePlatform } from "./composables/usePlatform";

const { invokeContract } = useWallet();
const { reportActivity } = usePlatform("miniapp-lottery");

// State from contract (not stored locally)
const gameState = ref({
    currentPot: 0,
    lastWinner: "",
    totalPlayers: 0,
});

// Fetch from smart contract on mount
onMounted(async () => {
    await refreshState();
});

async function refreshState() {
    try {
        const result = await invokeContract({
            contract: "LotteryContract",
            method: "getState",
        });
        gameState.value = result;
    } catch (error) {
        console.error("Failed to fetch state:", error);
    }
}

async function play() {
    // Execute transaction
    const tx = await invokeContract({
        contract: "LotteryContract",
        method: "play",
        args: [],
    });

    // Report activity to platform
    await reportActivity("transaction", {
        hash: tx.transactionHash,
        value: tx.value,
        method: "play",
    });
}
</script>
```

## Example: Stateless Lottery Miniapp

```vue
<template>
    <view class="lottery">
        <!-- State fetched from smart contract -->
        <view class="pot">Current Pot: {{ gameState.currentPot }} GAS</view>
        <view class="players">{{ gameState.totalPlayers }} players</view>
        <view class="winner">Last Winner: {{ gameState.lastWinner }}</view>

        <!-- User interaction -->
        <button @click="play">Play Lottery</button>

        <!-- Platform features -->
        <view class="leaderboard">
            <view v-for="player in leaderboard" :key="player.address">
                {{ player.score }} - {{ player.address.slice(0, 6) }}
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWallet } from "@shared/composables";
import { usePlatform } from "./composables/usePlatform";

const { invokeContract } = useWallet();
const { reportActivity, getLeaderboard } = usePlatform("miniapp-lottery");

const gameState = ref({
    currentPot: 0,
    lastWinner: "",
    totalPlayers: 0,
});

const leaderboard = ref([]);

onMounted(async () => {
    await refreshState();
    await fetchLeaderboard();
});

async function refreshState() {
    // State from smart contract
    const result = await invokeContract({
        contract: "LotteryContract",
        method: "getState",
    });
    gameState.value = result;
}

async function fetchLeaderboard() {
    // Leaderboard from platform API
    leaderboard.value = await getLeaderboard(10);
}

async function play() {
    // Transaction recorded on blockchain
    const tx = await invokeContract({
        contract: "LotteryContract",
        method: "play",
        args: [],
    });

    // Activity tracked by platform
    await reportActivity("transaction", {
        hash: tx.transactionHash,
        value: tx.value,
    });

    // Refresh state after transaction
    await refreshState();
}
</script>
```

## Platform Communication

### PostMessage API

The platform can communicate with miniapps via `postMessage`:

```typescript
// Listen for platform messages
window.addEventListener("message", (event) => {
    const { type, data } = event.data;

    switch (type) {
        case "init":
            // Platform sends initial context
            console.log("Platform:", data.platform);
            console.log("User:", data.user);
            console.log("Wallet:", data.wallet);
            break;

        case "theme-change":
            // Platform sends theme updates
            document.documentElement.setAttribute("data-theme", data.theme);
            break;

        case "wallet-connected":
            // Platform sends wallet connection
            console.log("Wallet connected:", data.address);
            break;
    }
});

// Send messages to platform
function sendMessage(type: string, data: any) {
    window.parent.postMessage({ type, data }, "*");
}

// Report activity to platform
function reportView() {
    sendMessage("activity", {
        app_id: "miniapp-lottery",
        type: "view",
        data: { duration: Date.now() - viewStartTime },
    });
}
```

## Best Practices

### 1. Always Fetch State

```typescript
// ✅ GOOD: Fetch on every render
const state = await fetchState();

// ❌ BAD: Cache state locally
const state = cachedState || (await fetchState());
```

### 2. Use Read-Only Operations

```typescript
// ✅ GOOD: Read from smart contract
const balance = await contract.getBalance(address);

// ❌ BAD: Write to local storage
localStorage.setItem("balance", balance);
```

### 3. Report Activities

```typescript
// Report all meaningful user actions
await reportActivity("view", { page: "game" });
await reportActivity("play", { level: 1 });
await reportActivity("score", { points: 100 });
await reportActivity("share", { platform: "twitter" });
```

### 4. Handle Loading States

```vue
<template>
    <view v-if="loading">Loading...</view>
    <view v-else>
        <!-- Game content -->
    </view>
</template>

<script setup lang="ts">
const loading = ref(true);

onMounted(async () => {
    await Promise.all([refreshState(), fetchLeaderboard()]);
    loading.value = false;
});
</script>
```

## Environment Variables

Miniapps can access platform environment variables:

```javascript
// Available in miniapps
const PLATFORM_CONFIG = {
    apiUrl: window.__PLATFORM_API_URL__,
    appId: window.__MINIAPP_ID__,
    userId: window.__USER_ID__,
    walletAddress: window.__WALLET_ADDRESS__,
};
```

## Testing Stateless Miniapps

```typescript
// Test with mock platform
const mockPlatform = {
    sendMessage: (msg) => console.log("Mock:", msg),
    getWallet: () => ({ address: "0x123..." }),
};

// Test with mock contract
const mockContract = {
    getState: () => ({ pot: 1000, players: 50 }),
};
```

## Summary

✅ Miniapps are **stateless** - no local data storage
✅ State from **smart contracts** - on-chain truth
✅ Activity tracked by **platform** - analytics
✅ Deployed to **CDN** - static hosting
✅ Communication via **postMessage** - platform integration
