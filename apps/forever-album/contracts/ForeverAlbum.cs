using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System;
using System.ComponentModel;

namespace ForeverAlbum
{
    [DisplayName("ForeverAlbum")]
    [ManifestExtra("Author", "Neo")]
    [ManifestExtra("Description", "Forever Album Smart Contract")]
    public class ForeverAlbumContract : SmartContract
    {
        private static readonly byte[] Prefix_Admin = new byte[] { 0x01 };
        // Prefix for storage
        private static readonly byte[] Prefix_Album = new byte[] { 0x61 }; // 'a'
        private static readonly byte[] Prefix_Index = new byte[] { 0x69 }; // 'i'
        private static readonly byte[] Prefix_Data = new byte[] { 0x64 };  // 'd'

        public delegate void OnPhotoUploadedDelegate(UInt160 user, string photoId);
        [DisplayName("PhotoUploaded")]
        public static event OnPhotoUploadedDelegate OnPhotoUploaded;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, Prefix_Admin, Runtime.Transaction.Sender);
        }

        [Safe]
        private static UInt160 Admin()
        {
            return (UInt160)Storage.Get(Storage.CurrentContext, Prefix_Admin);
        }

        private static void ValidateAdmin()
        {
            UInt160 admin = Admin();
            ExecutionEngine.Assert(admin != null && admin.IsValid, "admin not set");
            ExecutionEngine.Assert(Runtime.CheckWitness(admin), "no admin witness");
        }

        public static void Update(ByteString nefFile, string manifest)
        {
            ValidateAdmin();
            ContractManagement.Update(nefFile, manifest, null);
        }

        [Safe]
        public static ByteString GetPhoto(ByteString photoId)
        {
            return (ByteString)Storage.Get(Storage.CurrentContext, Helper.Concat(Prefix_Data, photoId));
        }

        [Safe]
        public static ByteString GetUserPhotosIndex(UInt160 user)
        {
            return (ByteString)Storage.Get(Storage.CurrentContext, Helper.Concat(Prefix_Index, user));
        }

        public static bool UploadPhoto(ByteString photoData, bool isEncrypted)
        {
            if (!Runtime.CheckWitness(Runtime.CallingScriptHash)) return false;

            UInt160 user = (UInt160)Runtime.CallingScriptHash; // Or Sender? Usually Sender in N3 unless specifically signed by another. 
            // Better: Transaction.Sender
            Transaction tx = (Transaction)Runtime.ScriptContainer;
            user = tx.Sender;

            if (!Runtime.CheckWitness(user)) return false;

            // Generate ID: Hash(TransactionHash + Index?) or just TxHash if 1 per tx.
            // Using TxHash as ID for simplicity.
            ByteString photoId = (ByteString)tx.Hash;
            
            // 1. Store Data
            // Format: Flag (1 byte) + Data
            byte[] flag = isEncrypted ? new byte[] { 0x01 } : new byte[] { 0x00 };
            ByteString content = Helper.Concat((ByteString)flag, photoData);
            
            Storage.Put(Storage.CurrentContext, Helper.Concat(Prefix_Data, photoId), content);

            // 2. Update Index
            // Index is just a long byte array of concatenated IDs? 
            // Or use StorageMap? For simplicity in this demo, let's append to a single key.
            // Warning: unbounded growth. In prod, use a better structure.
            byte[] userIndexKey = Helper.Concat(Prefix_Index, user);
            ByteString currentIndex = (ByteString)Storage.Get(Storage.CurrentContext, userIndexKey);
            
            // Append new ID (assuming ID is 32 bytes tx hash)
            Storage.Put(Storage.CurrentContext, userIndexKey, Helper.Concat(currentIndex, photoId));

            OnPhotoUploaded(user, photoId.ToString());
            return true;
        }
    }
}
