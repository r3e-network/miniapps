# NeoFS Migration Guide for Miniapps

**Version:** 1.0  
**Date:** 2026-01-28  
**Scope:** Storage-heavy Miniapps

---

## Executive Summary

NeoFS is Neo's native decentralized storage solution. This guide provides a migration path for Miniapps that currently store data on-chain to use NeoFS for better scalability and cost-efficiency.

### Why NeoFS?

| Metric | On-Chain | NeoFS | Improvement |
|--------|----------|-------|-------------|
| Cost per MB | ~10 GAS | ~0.1 GAS | **99% cheaper** |
| Max file size | ~45KB | Virtually unlimited | **∞x larger** |
| Storage type | Contract storage | Decentralized nodes | Better distribution |
| Access speed | Fast | Network-dependent | Acceptable |
| Data integrity | Guaranteed | Content-addressed (hash) | Verified |

---

## Architecture Overview

### Hybrid Storage Model

```
┌─────────────────────────────────────────────────────────────┐
│                      NEO BLOCKCHAIN                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Miniapp Smart Contract                             │   │
│  │  - Store metadata (owner, timestamps, permissions)  │   │
│  │  - Store NeoFS references (containerId, objectId)   │   │
│  │  - Store content hash (SHA256 for verification)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                     │
│  ┌─────────────────────┼─────────────────────────────────┐   │
│  │                     ▼                                 │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Small Data (< 40KB)                         │    │   │
│  │  │  - Thumbnails                                │    │   │
│  │  │  - Profile pictures                          │    │   │
│  │  │  - Metadata                                  │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │  LEGACY MODE (On-Chain)                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ NeoFS Reference
                             │ (containerId + objectId)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        NEOFS NETWORK                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Storage Nodes                                      │   │
│  │  - Large photos                                     │   │
│  │  - Videos                                           │   │
│  │  - Documents                                        │   │
│  │  - High-res assets                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  NEOFS MODE (Off-Chain)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### Step 1: Inherit from MiniAppNeoFSBase

```csharp
// Before
public class MiniAppForeverAlbum : MiniAppBase

// After
public class MiniAppForeverAlbum : MiniAppNeoFSBase
```

### Step 2: Define Storage Thresholds

```csharp
private const int NEFOS_THRESHOLD_BYTES = 40000;  // Files > 40KB use NeoFS
private const long MAX_NEFOS_FILE_SIZE = 100 * 1024 * 1024;  // 100MB max
```

### Step 3: Create Hybrid Data Structure

```csharp
public struct ContentInfo
{
    public ByteString ContentId;
    public UInt160 Owner;
    public bool Encrypted;
    
    // Legacy mode
    public ByteString Data;  // null for NeoFS content
    
    // NeoFS mode
    public string NeoFSContainerId;
    public string NeoFSObjectId;
    public ByteString ContentHash;
    
    // Common
    public BigInteger FileSize;
    public BigInteger CreatedAt;
    public bool IsNeoFS;
}
```

### Step 4: Implement Auto-Selection Logic

```csharp
public static bool UploadContent(string data, bool encrypted)
{
    if (data.Length >= NEFOS_THRESHOLD_BYTES)
    {
        // Use NeoFS for large files
        return UploadToNeoFS(data, encrypted);
    }
    else
    {
        // Use legacy for small files
        return UploadLegacy(data, encrypted);
    }
}
```

### Step 5: Access Content

```csharp
[Safe]
public static string GetContentUrl(ByteString contentId)
{
    ContentInfo content = GetContent(contentId);
    
    if (content.IsNeoFS)
    {
        // Return NeoFS URL
        return $"https://neofs.example.com/{content.NeoFSContainerId}/{content.NeoFSObjectId}";
    }
    else
    {
        // Return data URL for legacy content
        return $"data:image/jpeg;base64,{content.Data}";
    }
}
```

---

## Miniapps That Should Use NeoFS

### Tier 1: High Priority (Must Migrate)

| Miniapp | Current Storage | NeoFS Use Case | Impact |
|---------|-----------------|----------------|--------|
| **forever-album** | 45KB max photos | Full-size photos, albums | 🔴 Critical |
| **graveyard** | contentHash only | Memory photos, epitaphs | 🟠 High |
| **memorial-shrine** | Serialized structs | Memorial photos, tributes | 🟠 High |
| **ex-files** | dataHash only | Anonymous documents | 🟠 High |

### Tier 2: Medium Priority (Should Migrate)

| Miniapp | Current Storage | NeoFS Use Case | Impact |
|---------|-----------------|----------------|--------|
| **neo-gacha** | Item metadata | Item images, animations | 🟡 Medium |
| **million-piece-map** | 500B metadata | Map tile images | 🟡 Medium |
| **event-ticket-pass** | Ticket data | Ticket designs, QR codes | 🟡 Medium |
| **soulbound-certificate** | Certificate data | Certificate images | 🟡 Medium |

### Tier 3: Low Priority (Optional)

| Miniapp | Current Storage | NeoFS Use Case | Impact |
|---------|-----------------|----------------|--------|
| **trustanchor** | Anchor data | Large documents | 🟢 Low |
| **on-chain-tarot** | Reading data | Card images | 🟢 Low |

---

## Migration Patterns

### Pattern A: Automatic Mode Selection (Recommended)

```csharp
public static bool UploadAuto(string data, bool encrypted)
{
    if (data.Length >= NEFOS_THRESHOLD)
    {
        return UploadNeoFS(data, encrypted);
    }
    return UploadLegacy(data, encrypted);
}
```

**Pros:** Simple, backward compatible  
**Cons:** Users don't control storage mode

### Pattern B: Explicit Mode Selection

```csharp
public static bool Upload(string data, bool encrypted, bool useNeoFS)
{
    if (useNeoFS)
    {
        return UploadNeoFS(data, encrypted);
    }
    return UploadLegacy(data, encrypted);
}
```

**Pros:** User control  
**Cons:** More complex UI

### Pattern C: Oracle-Managed Upload

```csharp
// Step 1: Request upload
public static BigInteger RequestUpload(BigInteger fileSize)
{
    return RequestNeoFSUpload(fileSize, CONTENT_TYPE, encrypted);
}

// Step 2: Oracle completes upload
public static void OnUploadComplete(BigInteger requestId, ...)
{
    CompleteNeoFSUpload(requestId, ...);
}
```

**Pros:** Secure, handles large files  
**Cons:** Requires oracle infrastructure

---

## NeoFS Base Class API

### Core Methods

```csharp
// Register NeoFS content
protected bool RegisterNeoFSContent(
    ByteString contentId,
    string containerId,
    string objectId,
    ByteString contentHash,
    BigInteger fileSize,
    bool encrypted,
    BigInteger contentType
);

// Request NeoFS upload
protected BigInteger RequestNeoFSUpload(
    BigInteger fileSize,
    BigInteger contentType,
    bool encrypted
);

// Complete NeoFS upload (oracle only)
protected bool CompleteNeoFSUpload(
    BigInteger requestId,
    ByteString contentId,
    string containerId,
    string objectId,
    ByteString contentHash
);

// Delete NeoFS content
protected bool DeleteNeoFSContent(ByteString contentId);
```

### Read Methods

```csharp
// Get NeoFS reference
[Safe] NeoFSReference GetNeoFSReference(ByteString contentId);

// Get NeoFS URL
[Safe] string GetNeoFSUrl(ByteString contentId);

// Get HTTP gateway URL
[Safe] string GetNeoFSGatewayUrl(ByteString contentId, string gatewayHost);

// Check storage mode
[Safe] bool IsNeoFSContent(ByteString contentId);
[Safe] bool IsLegacyContent(ByteString contentId);
```

### Verification Methods

```csharp
// Verify content integrity
protected bool VerifyNeoFSContent(ByteString contentId, ByteString computedHash);

// Verify with SHA256
protected bool VerifyNeoFSContentSHA256(ByteString contentId, ByteString contentData);
```

---

## Frontend Integration

### NeoFS SDK Installation

```bash
npm install @neofs/sdk
```

### Upload Flow

```typescript
import { NeoFSClient } from '@neofs/sdk';

const client = new NeoFSClient({
  endpoint: 'https://neofs.example.com',
  containerId: 'my-container'
});

// 1. Request upload permission from contract
const requestId = await contract.invoke('requestPhotoUpload', {
  fileSize: file.size,
  encrypted: true
});

// 2. Upload to NeoFS
const objectId = await client.put({
  data: file,
  attributes: {
    'Request-Id': requestId.toString()
  }
});

// 3. Compute content hash
const contentHash = await sha256(file);

// 4. Complete upload via oracle
await oracle.notify('photoUploadComplete', {
  requestId,
  photoId: generatePhotoId(),
  containerId: client.containerId,
  objectId,
  contentHash
});
```

### Display Flow

```typescript
// Get photo info
const photo = await contract.invoke('getPhoto', [photoId]);

if (photo.isNeoFS) {
  // Fetch from NeoFS
  const url = `https://neofs.example.com/${photo.neoFSContainerId}/${photo.neoFSObjectId}`;
  const response = await fetch(url);
  const data = await response.blob();
  
  // Verify integrity
  const computedHash = await sha256(data);
  const isValid = await contract.invoke('verifyPhotoIntegrity', [
    photoId,
    computedHash
  ]);
  
  if (!isValid) {
    console.error('Content integrity check failed!');
  }
  
  displayImage(data);
} else {
  // Legacy: data is stored on-chain
  displayBase64Image(photo.data);
}
```

---

## Cost Analysis

### Forever-Album Example

| Scenario | On-Chain Only | NeoFS Hybrid | Savings |
|----------|--------------|--------------|---------|
| 100 small thumbnails (5KB each) | ~5 GAS | ~5 GAS | 0% |
| 100 full photos (2MB each) | ~2000 GAS (impossible) | ~20 GAS | 99% |
| Mixed: 50 thumbnails + 50 photos | ~1000+ GAS | ~12 GAS | 98% |

### Annual Storage Costs (1000 photos)

| Storage Type | Cost | Notes |
|--------------|------|-------|
| On-chain only | ~20,000 GAS | Impossible due to size limits |
| NeoFS only | ~100 GAS | 1GB total |
| Hybrid approach | ~20 GAS | Optimized for each file size |

---

## Security Considerations

### 1. Content Integrity

Always verify content hash after retrieval:

```csharp
ByteString computedHash = CryptoLib.Sha256(contentData);
bool valid = VerifyNeoFSContent(contentId, computedHash);
ExecutionEngine.Assert(valid, "content integrity check failed");
```

### 2. Access Control

```csharp
// Only owner can delete
UInt160 owner = GetNeoFSContentOwner(contentId);
ExecutionEngine.Assert(owner == Runtime.Transaction.Sender, "not owner");
```

### 3. Encryption

```csharp
// Mark encrypted content
Storage.Put(Storage.CurrentContext, 
    Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId), 1);

// Frontend decrypts with user's key
const decrypted = await decrypt(data, userPrivateKey);
```

---

## Deployment Checklist

- [ ] Inherit from `MiniAppNeoFSBase`
- [ ] Define storage thresholds
- [ ] Create hybrid data structures
- [ ] Implement upload methods (auto or explicit)
- [ ] Add NeoFS URL getters
- [ ] Implement verification methods
- [ ] Add migration path for existing content
- [ ] Update frontend to handle NeoFS URLs
- [ ] Test with NeoFS testnet
- [ ] Deploy NeoFS container
- [ ] Update production contracts

---

## Resources

- NeoFS Documentation: https://fs.neo.org/
- NeoFS Go SDK: https://github.com/nspcc-dev/neofs-sdk-go
- NeoFS JavaScript SDK: https://github.com/nspcc-dev/neofs-sdk-js
- NeoFS HTTP Gateway: https://github.com/nspcc-dev/neofs-http-gw

---

## Support

For questions about NeoFS migration:
1. Check the `MiniAppNeoFSBase.cs` implementation
2. See `MiniAppForeverAlbum.NeoFS.cs` for example usage
3. Refer to NeoFS official documentation
