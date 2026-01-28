# NeoFS Migration Plan for ForeverAlbum

## Current Architecture (On-Chain Storage)
```
User Upload → Base64 Photo Data → Store in Contract Storage
```
**Limits**: 45KB/photo, 60KB/batch, expensive

## Proposed Architecture (NeoFS Storage)
```
User Upload → Photo File → NeoFS (via Oracle/Off-chain) → Store Reference ID On-Chain
```

## Implementation Options

### Option A: Oracle-Based Upload (Recommended)
```csharp
// 1. User initiates upload request on-chain
public static bool RequestPhotoUpload(string filename, BigInteger fileSize)
{
    // Store pending request
    Storage.Put(PREFIX_PENDING_UPLOAD, requestId, sender);
    // Oracle picks up request and uploads to NeoFS
    return true;
}

// 2. Oracle callback with NeoFS reference
public static void OnNeoFSUploadComplete(BigInteger requestId, 
    string containerId, string objectId)
{
    ValidateOracleCaller();
    // Store only the reference on-chain
    PhotoReference ref = new PhotoReference {
        ContainerId = containerId,
        ObjectId = objectId,
        Owner = GetPendingOwner(requestId)
    };
    StorePhotoReference(photoId, ref);
}
```

### Option B: Direct NeoFS API Integration (If NeoFS available in Neo N3)
```csharp
// Use NeoFS API contract if available
public static bool UploadPhotoToNeoFS(ByteString photoData)
{
    // Call NeoFS contract
    string objectId = NeoFSAPI.Put(containerId, photoData);
    // Store reference
    Storage.Put(PREFIX_PHOTO_REF, photoId, objectId);
    return true;
}
```

### Option C: Off-Chain Upload + On-Chain Verification
```
1. User uploads photo to NeoFS via SDK/CLI
2. User gets containerId + objectId
3. User calls contract to register the reference
4. Contract verifies ownership via NeoFS (optional)
```

## Data Structure Changes

### Current
```csharp
public struct PhotoInfo
{
    public ByteString PhotoId;
    public UInt160 Owner;
    public bool Encrypted;
    public ByteString Data;        // ← Actual photo data (45KB max)
    public BigInteger CreatedAt;
}
```

### NeoFS Version
```csharp
public struct PhotoInfo
{
    public ByteString PhotoId;
    public UInt160 Owner;
    public bool Encrypted;
    public string NeoFSContainerId;  // ← NeoFS reference
    public string NeoFSObjectId;      // ← NeoFS reference
    public ByteString ContentHash;    // ← Integrity check
    public BigInteger FileSize;       // ← Size in bytes
    public BigInteger CreatedAt;
}
```

## Contract Changes Required

### New Storage Prefixes
```csharp
private static readonly byte[] PREFIX_PHOTO_CONTAINER = new byte[] { 0x27 };
private static readonly byte[] PREFIX_PHOTO_OBJECT = new byte[] { 0x28 };
private static readonly byte[] PREFIX_PHOTO_HASH = new byte[] { 0x29 };
private static readonly byte[] PREFIX_PHOTO_SIZE = new byte[] { 0x2A };
```

### New Methods
```csharp
// Register a NeoFS-stored photo
public static bool RegisterPhoto(
    string containerId, 
    string objectId, 
    ByteString contentHash,
    BigInteger fileSize,
    bool encrypted
);

// Update photo reference (if re-uploaded)
public static bool UpdatePhotoReference(
    ByteString photoId,
    string newContainerId,
    string newObjectId
);

// Get full NeoFS URL
[Safe]
public static string GetPhotoUrl(ByteString photoId);
```

## Frontend Changes

### Current Flow
```typescript
// Read photo data directly from contract
const photo = await contract.invoke('getPhoto', [photoId]);
const imageSrc = `data:image/jpeg;base64,${photo.data}`;
```

### NeoFS Flow
```typescript
// Get reference from contract, fetch from NeoFS
const photo = await contract.invoke('getPhoto', [photoId]);
const url = `https://neofs.example.com/${photo.containerId}/${photo.objectId}`;
// or use NeoFS SDK
const imageData = await neoFSClient.get(photo.containerId, photo.objectId);
```

## NeoFS Node Requirements

### Option 1: Public NeoFS Nodes
- Use community NeoFS nodes
- Free/cheap but less reliable
- Good for testing

### Option 2: Self-Hosted NeoFS Node
- Run own NeoFS storage node
- More reliable, full control
- Requires server infrastructure

### Option 3: NeoFS CDN Integration
- Use NeoFS gateways/CDN
- Fast global access
- Best user experience

## Migration Path

### Phase 1: Hybrid Mode (Backward Compatible)
```csharp
public struct PhotoInfo
{
    public ByteString PhotoId;
    public UInt160 Owner;
    public bool Encrypted;
    public ByteString Data;           // Legacy: on-chain data
    public string NeoFSContainerId;   // New: NeoFS reference
    public string NeoFSObjectId;       // New: NeoFS reference
    public bool IsNeoFS;               // New: flag to identify storage type
    public BigInteger CreatedAt;
}
```

### Phase 2: Full NeoFS Migration
- Disable new on-chain uploads
- Migrate existing small photos to NeoFS (optional)
- Remove legacy Data field

## Cost Comparison

| Operation | On-Chain | NeoFS | Savings |
|-----------|----------|-------|---------|
| Store 1MB photo | ~10 GAS | ~0.1 GAS | 99% |
| Store 5MB photo | ~50 GAS | ~0.5 GAS | 99% |
| Read photo | Free | Free | - |
| Storage/year | ~50 GAS/MB | ~1 GAS/MB | 98% |

## Security Considerations

### 1. Content Verification
```csharp
// Verify content hash matches on-chain record
ByteString computedHash = CryptoLib.Sha256(photoData);
ExecutionEngine.Assert(computedHash == storedHash, "content mismatch");
```

### 2. Ownership Verification
```csharp
// Optional: Verify user owns the NeoFS object
ExecutionEngine.Assert(NeoFSAPI.GetOwner(containerId, objectId) == sender);
```

### 3. Access Control
```csharp
// Support private albums with encrypted access tokens
public static ByteString GetPhotoAccessToken(ByteString photoId)
{
    // Only owner can generate access tokens
    ValidateOwnership(photoId);
    return GenerateAccessToken(photoId, Runtime.Time + 3600); // 1 hour expiry
}
```

## Implementation Priority

1. **High Priority**
   - Add NeoFS reference support to contract
   - Implement hybrid mode for backward compatibility

2. **Medium Priority**
   - Frontend NeoFS integration
   - Content hash verification

3. **Low Priority**
   - Migrate existing photos to NeoFS
   - Remove legacy on-chain storage

## Resources

- NeoFS Documentation: https://fs.neo.org/
- NeoFS Go SDK: https://github.com/nspcc-dev/neofs-sdk-go
- NeoFS JavaScript SDK: https://github.com/nspcc-dev/neofs-sdk-js
