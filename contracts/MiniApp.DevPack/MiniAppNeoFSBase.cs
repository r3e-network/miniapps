using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    /// <summary>
    /// NeoFS Storage Base Class - For MiniApps storing large data
    /// 
    /// NeoFS is Neo's decentralized storage solution:
    /// - Cheaper than on-chain storage (~99% cost reduction)
    /// - Unlimited file sizes (MBs to GBs)
    /// - Content-addressed (data identified by hash)
    /// - Built-in encryption and access control
    /// 
    /// STORAGE MODEL:
    /// - On-chain: Store only NeoFS references (containerId + objectId + contentHash)
    /// - Off-chain (NeoFS): Store actual file data
    /// 
    /// SECURITY:
    /// - Content hash verification ensures data integrity
    /// - Optional encryption for private content
    /// - Owner-based access control
    /// 
    /// USE CASES:
    /// - Photo albums (forever-album)
    /// - Memorial content (graveyard, memorial-shrine)
    /// - Documents (ex-files)
    /// - Map data (million-piece-map)
    /// - Gacha assets (neo-gacha)
    /// </summary>
    public class MiniAppNeoFSBase : MiniAppBase
    {
        #region NeoFS Storage Prefixes (0x30-0x3F)
        
        // Core NeoFS reference storage
        protected static readonly byte[] PREFIX_NEFOS_CONTAINER = new byte[] { 0x30 };
        protected static readonly byte[] PREFIX_NEFOS_OBJECT = new byte[] { 0x31 };
        protected static readonly byte[] PREFIX_NEFOS_HASH = new byte[] { 0x32 };
        protected static readonly byte[] PREFIX_NEFOS_SIZE = new byte[] { 0x33 };
        protected static readonly byte[] PREFIX_NEFOS_ENCRYPTED = new byte[] { 0x34 };
        protected static readonly byte[] PREFIX_NEFOS_OWNER = new byte[] { 0x35 };
        protected static readonly byte[] PREFIX_NEFOS_CREATED = new byte[] { 0x36 };
        protected static readonly byte[] PREFIX_NEFOS_TYPE = new byte[] { 0x37 };
        
        // Legacy on-chain storage prefixes (for hybrid mode)
        protected static readonly byte[] PREFIX_LEGACY_DATA = new byte[] { 0x38 };
        protected static readonly byte[] PREFIX_LEGACY_FLAG = new byte[] { 0x39 };
        
        // Upload request tracking
        protected static readonly byte[] PREFIX_UPLOAD_REQUEST = new byte[] { 0x3A };
        protected static readonly byte[] PREFIX_UPLOAD_REQUEST_ID = new byte[] { 0x3B };
        
        #endregion

        #region NeoFS Data Structures
        
        public struct NeoFSReference
        {
            public ByteString ContentId;      // Unique content identifier
            public string ContainerId;         // NeoFS container ID
            public string ObjectId;            // NeoFS object ID
            public ByteString ContentHash;     // SHA256 hash for verification
            public BigInteger FileSize;        // File size in bytes
            public UInt160 Owner;              // Content owner
            public bool Encrypted;             // Is content encrypted
            public BigInteger ContentType;     // Type identifier (app-specific)
            public BigInteger CreatedAt;       // Creation timestamp
        }
        
        public struct UploadRequest
        {
            public BigInteger RequestId;
            public UInt160 Requester;
            public BigInteger FileSize;
            public BigInteger ContentType;
            public bool Encrypted;
            public BigInteger RequestedAt;
            public bool Completed;
        }
        
        #endregion

        #region Events
        
        public delegate void NeoFSContentRegisteredHandler(ByteString contentId, string containerId, string objectId, UInt160 owner);
        public delegate void NeoFSUploadRequestedHandler(BigInteger requestId, UInt160 requester, BigInteger fileSize);
        public delegate void NeoFSUploadCompletedHandler(BigInteger requestId, ByteString contentId, string containerId, string objectId);
        public delegate void NeoFSContentVerifiedHandler(ByteString contentId, bool valid);
        public delegate void NeoFSContentDeletedHandler(ByteString contentId, UInt160 owner);
        
        [DisplayName("NeoFSContentRegistered")]
        public static event NeoFSContentRegisteredHandler OnNeoFSContentRegistered;
        
        [DisplayName("NeoFSUploadRequested")]
        public static event NeoFSUploadRequestedHandler OnNeoFSUploadRequested;
        
        [DisplayName("NeoFSUploadCompleted")]
        public static event NeoFSUploadCompletedHandler OnNeoFSUploadCompleted;
        
        [DisplayName("NeoFSContentVerified")]
        public static event NeoFSContentVerifiedHandler OnNeoFSContentVerified;
        
        [DisplayName("NeoFSContentDeleted")]
        public static event NeoFSContentDeletedHandler OnNeoFSContentDeleted;
        
        #endregion

        #region Read Methods
        
        [Safe]
        public static NeoFSReference GetNeoFSReference(ByteString contentId)
        {
            if (contentId == null || contentId.Length == 0) return new NeoFSReference();
            
            byte[] baseKey = Helper.Concat(PREFIX_NEFOS_CONTAINER, contentId);
            ByteString containerData = Storage.Get(Storage.CurrentContext, baseKey);
            if (containerData == null) return new NeoFSReference();
            
            return new NeoFSReference
            {
                ContentId = contentId,
                ContainerId = containerData.ToString(),
                ObjectId = GetNeoFSObjectId(contentId),
                ContentHash = GetNeoFSContentHash(contentId),
                FileSize = GetNeoFSFileSize(contentId),
                Owner = GetNeoFSContentOwner(contentId),
                Encrypted = IsNeoFSEncrypted(contentId),
                ContentType = GetNeoFSContentType(contentId),
                CreatedAt = GetNeoFSCreatedAt(contentId)
            };
        }
        
        [Safe]
        public static string GetNeoFSUrl(ByteString contentId)
        {
            NeoFSReference reference = GetNeoFSReference(contentId);
            if (reference.ContainerId == null) return "";
            
            // Standard NeoFS URL format
            return $"neofs://{reference.ContainerId}/{reference.ObjectId}";
        }
        
        [Safe]
        public static string GetNeoFSGatewayUrl(ByteString contentId, string gatewayHost = "https://neofs.example.com")
        {
            NeoFSReference reference = GetNeoFSReference(contentId);
            if (reference.ContainerId == null) return "";
            
            // HTTP gateway URL format
            return $"{gatewayHost}/{reference.ContainerId}/{reference.ObjectId}";
        }
        
        [Safe]
        public static bool IsNeoFSContent(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_CONTAINER, contentId);
            return Storage.Get(Storage.CurrentContext, key) != null;
        }
        
        [Safe]
        public static bool IsLegacyContent(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_LEGACY_FLAG, contentId);
            return (BigInteger)Storage.Get(Storage.CurrentContext, key) == 1;
        }
        
        [Safe]
        public static BigInteger GetNeoFSUploadRequestId()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, PREFIX_UPLOAD_REQUEST_ID);
            return data == null ? 0 : (BigInteger)data;
        }
        
        [Safe]
        public static UploadRequest GetUploadRequest(BigInteger requestId)
        {
            byte[] baseKey = Helper.Concat(PREFIX_UPLOAD_REQUEST, (ByteString)requestId.ToByteArray());
            ByteString data = Storage.Get(Storage.CurrentContext, baseKey);
            if (data == null) return new UploadRequest();
            
            // Deserialize stored data
            object[] arr = (object[])StdLib.Deserialize(data);
            return new UploadRequest
            {
                RequestId = requestId,
                Requester = (UInt160)arr[0],
                FileSize = (BigInteger)arr[1],
                ContentType = (BigInteger)arr[2],
                Encrypted = (bool)arr[3],
                RequestedAt = (BigInteger)arr[4],
                Completed = (bool)arr[5]
            };
        }
        
        // Helper getters
        private static string GetNeoFSObjectId(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_OBJECT, contentId);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data?.ToString() ?? "";
        }
        
        private static ByteString GetNeoFSContentHash(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_HASH, contentId);
            return Storage.Get(Storage.CurrentContext, key);
        }
        
        private static BigInteger GetNeoFSFileSize(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_SIZE, contentId);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }
        
        private static UInt160 GetNeoFSContentOwner(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_OWNER, contentId);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? UInt160.Zero : (UInt160)data;
        }
        
        private static bool IsNeoFSEncrypted(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId);
            return (BigInteger)Storage.Get(Storage.CurrentContext, key) == 1;
        }
        
        private static BigInteger GetNeoFSContentType(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_TYPE, contentId);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }
        
        private static BigInteger GetNeoFSCreatedAt(ByteString contentId)
        {
            byte[] key = Helper.Concat(PREFIX_NEFOS_CREATED, contentId);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }
        
        #endregion

        #region Write Methods
        
        /// <summary>
        /// Register content that has been uploaded to NeoFS.
        /// Called after successful NeoFS upload to record the reference.
        /// </summary>
        protected static bool RegisterNeoFSContent(
            ByteString contentId,
            string containerId,
            string objectId,
            ByteString contentHash,
            BigInteger fileSize,
            bool encrypted,
            BigInteger contentType)
        {
            ValidateAddress(Runtime.Transaction.Sender);
            ExecutionEngine.Assert(Runtime.CheckWitness(Runtime.Transaction.Sender), "unauthorized");
            
            ExecutionEngine.Assert(contentId != null && contentId.Length > 0, "invalid contentId");
            ExecutionEngine.Assert(containerId != null && containerId.Length > 0, "invalid containerId");
            ExecutionEngine.Assert(objectId != null && objectId.Length > 0, "invalid objectId");
            ExecutionEngine.Assert(contentHash != null && contentHash.Length == 32, "invalid hash");
            ExecutionEngine.Assert(fileSize > 0, "invalid file size");
            
            // Store NeoFS reference
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CONTAINER, contentId), containerId);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OBJECT, contentId), objectId);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_HASH, contentId), contentHash);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_SIZE, contentId), fileSize);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OWNER, contentId), Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId), encrypted ? 1 : 0);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_TYPE, contentId), contentType);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CREATED, contentId), Runtime.Time);
            
            // Mark as NeoFS content (not legacy)
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_FLAG, contentId), 0);
            
            OnNeoFSContentRegistered(contentId, containerId, objectId, Runtime.Transaction.Sender);
            return true;
        }
        
        /// <summary>
        /// Request permission to upload content to NeoFS.
        /// Returns a requestId that must be used in the upload process.
        /// </summary>
        protected static BigInteger RequestNeoFSUpload(BigInteger fileSize, BigInteger contentType, bool encrypted)
        {
            ValidateAddress(Runtime.Transaction.Sender);
            ExecutionEngine.Assert(Runtime.CheckWitness(Runtime.Transaction.Sender), "unauthorized");
            ExecutionEngine.Assert(fileSize > 0, "invalid file size");
            
            BigInteger requestId = GetNeoFSUploadRequestId() + 1;
            Storage.Put(Storage.CurrentContext, PREFIX_UPLOAD_REQUEST_ID, requestId);
            
            UploadRequest request = new UploadRequest
            {
                RequestId = requestId,
                Requester = Runtime.Transaction.Sender,
                FileSize = fileSize,
                ContentType = contentType,
                Encrypted = encrypted,
                RequestedAt = Runtime.Time,
                Completed = false
            };
            
            byte[] key = Helper.Concat(PREFIX_UPLOAD_REQUEST, (ByteString)requestId.ToByteArray());
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(request));
            
            OnNeoFSUploadRequested(requestId, Runtime.Transaction.Sender, fileSize);
            return requestId;
        }
        
        /// <summary>
        /// Complete a NeoFS upload request.
        /// Called by oracle/gateway after NeoFS upload is confirmed.
        /// </summary>
        protected static bool CompleteNeoFSUpload(
            BigInteger requestId,
            ByteString contentId,
            string containerId,
            string objectId,
            ByteString contentHash)
        {
            // Only gateway/oracle can complete uploads
            ValidateGateway();
            
            UploadRequest request = GetUploadRequest(requestId);
            ExecutionEngine.Assert(request.RequestId > 0, "request not found");
            ExecutionEngine.Assert(!request.Completed, "already completed");
            
            // Mark request as completed
            request.Completed = true;
            byte[] key = Helper.Concat(PREFIX_UPLOAD_REQUEST, (ByteString)requestId.ToByteArray());
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(request));
            
            // Register the content
            RegisterNeoFSContent(
                contentId,
                containerId,
                objectId,
                contentHash,
                request.FileSize,
                request.Encrypted,
                request.ContentType
            );
            
            OnNeoFSUploadCompleted(requestId, contentId, containerId, objectId);
            return true;
        }
        
        /// <summary>
        /// Delete NeoFS content reference.
        /// Note: Actual NeoFS deletion must be done separately (off-chain or via oracle).
        /// </summary>
        protected static bool DeleteNeoFSContent(ByteString contentId)
        {
            ExecutionEngine.Assert(contentId != null && contentId.Length > 0, "invalid contentId");
            
            UInt160 owner = GetNeoFSContentOwner(contentId);
            ExecutionEngine.Assert(owner == Runtime.Transaction.Sender, "not owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(Runtime.Transaction.Sender), "unauthorized");
            
            // Delete all references
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CONTAINER, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OBJECT, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_HASH, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_SIZE, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OWNER, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_TYPE, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CREATED, contentId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_FLAG, contentId));
            
            OnNeoFSContentDeleted(contentId, Runtime.Transaction.Sender);
            return true;
        }
        
        #endregion

        #region Verification
        
        /// <summary>
        /// Verify content hash against stored hash.
        /// Returns true if content integrity is verified.
        /// </summary>
        protected static bool VerifyNeoFSContent(ByteString contentId, ByteString computedHash)
        {
            ByteString storedHash = GetNeoFSContentHash(contentId);
            if (storedHash == null || computedHash == null) return false;
            return storedHash.Equals(computedHash);
        }
        
        /// <summary>
        /// Verify content hash using SHA256.
        /// </summary>
        protected static bool VerifyNeoFSContentSHA256(ByteString contentId, ByteString contentData)
        {
            ByteString computedHash = CryptoLib.Sha256(contentData);
            return VerifyNeoFSContent(contentId, computedHash);
        }
        
        #endregion

        #region Hybrid Mode Helpers
        
        /// <summary>
        /// Store content in legacy mode (on-chain).
        /// For small content that doesn't need NeoFS.
        /// </summary>
        protected static bool RegisterLegacyContent(ByteString contentId, ByteString data, bool encrypted)
        {
            ExecutionEngine.Assert(contentId != null && contentId.Length > 0, "invalid contentId");
            ExecutionEngine.Assert(data != null && data.Length > 0, "invalid data");
            
            // Store on-chain
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_DATA, contentId), data);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_FLAG, contentId), 1);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OWNER, contentId), Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId), encrypted ? 1 : 0);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_SIZE, contentId), data.Length);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CREATED, contentId), Runtime.Time);
            
            return true;
        }
        
        /// <summary>
        /// Get content data (works for both legacy and NeoFS modes).
        /// For NeoFS content, returns empty - actual data must be fetched off-chain.
        /// </summary>
        [Safe]
        protected static ByteString GetLegacyContentData(ByteString contentId)
        {
            if (!IsLegacyContent(contentId)) return null;
            
            byte[] key = Helper.Concat(PREFIX_LEGACY_DATA, contentId);
            return Storage.Get(Storage.CurrentContext, key);
        }
        
        /// <summary>
        /// Migrate legacy content to NeoFS.
        /// Called after content is uploaded to NeoFS.
        /// </summary>
        protected static bool MigrateToNeoFS(
            ByteString contentId,
            string containerId,
            string objectId,
            ByteString contentHash)
        {
            ExecutionEngine.Assert(IsLegacyContent(contentId), "not legacy content");
            
            UInt160 owner = GetNeoFSContentOwner(contentId);
            ExecutionEngine.Assert(owner == Runtime.Transaction.Sender, "not owner");
            
            BigInteger fileSize = GetNeoFSFileSize(contentId);
            bool encrypted = IsNeoFSEncrypted(contentId);
            BigInteger createdAt = GetNeoFSCreatedAt(contentId);
            
            // Delete legacy data
            Storage.Delete(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_DATA, contentId));
            
            // Register as NeoFS content
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CONTAINER, contentId), containerId);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_OBJECT, contentId), objectId);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_HASH, contentId), contentHash);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_LEGACY_FLAG, contentId), 0);
            
            // Restore preserved values
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_SIZE, contentId), fileSize);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_ENCRYPTED, contentId), encrypted ? 1 : 0);
            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_NEFOS_CREATED, contentId), createdAt);
            
            return true;
        }
        
        #endregion

        #region Validation Helpers
        
        protected static void ValidateNeoFSOwner(ByteString contentId)
        {
            UInt160 owner = GetNeoFSContentOwner(contentId);
            ExecutionEngine.Assert(owner == Runtime.Transaction.Sender, "not owner");
        }
        
        protected static void ValidateContentExists(ByteString contentId)
        {
            ExecutionEngine.Assert(IsNeoFSContent(contentId) || IsLegacyContent(contentId), "content not found");
        }
        
        #endregion
    }
}
