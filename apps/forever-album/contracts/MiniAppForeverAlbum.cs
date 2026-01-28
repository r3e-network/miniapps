using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    public delegate void PhotoUploadedHandler(UInt160 owner, ByteString photoId, bool encrypted, BigInteger index);

    [DisplayName("MiniAppForeverAlbum")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "On-chain photo album with optional client-side encryption.")]
    [ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]  // GAS token
    public class MiniAppForeverAlbum : MiniAppBase
    {
        private const string APP_ID = "miniapp-forever-album";
        private const int MAX_PHOTOS_PER_UPLOAD = 5;
        private const int MAX_PHOTO_BYTES = 45000;
        private const int MAX_TOTAL_BYTES = 60000;

        private static readonly byte[] PREFIX_PHOTO_DATA = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_PHOTO_ENCRYPTED = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_PHOTO_OWNER = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_PHOTO_TIME = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_USER_PHOTO_COUNT = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_USER_PHOTO_INDEX = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_TOTAL_PHOTOS = new byte[] { 0x26 };

        public struct PhotoInfo
        {
            public ByteString PhotoId;
            public UInt160 Owner;
            public bool Encrypted;
            public ByteString Data;
            public BigInteger CreatedAt;
        }

        [DisplayName("PhotoUploaded")]
        public static event PhotoUploadedHandler OnPhotoUploaded;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_PHOTOS, 0);
        }

        [Safe]
        public static BigInteger TotalPhotos()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_PHOTOS);
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetUserPhotoCount(UInt160 user)
        {
            byte[] key = Helper.Concat(PREFIX_USER_PHOTO_COUNT, user);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static ByteString[] GetUserPhotoIds(UInt160 user, BigInteger start, BigInteger limit)
        {
            BigInteger count = GetUserPhotoCount(user);
            if (count == 0 || limit <= 0 || start >= count) return new ByteString[0];

            if (start < 0) start = 0;
            if (limit > count - start) limit = count - start;
            if (limit > 50) limit = 50;

            ByteString[] ids = new ByteString[(int)limit];
            for (int i = 0; i < (int)limit; i++)
            {
                byte[] key = Helper.Concat(
                    Helper.Concat(PREFIX_USER_PHOTO_INDEX, user),
                    (ByteString)(start + i).ToByteArray());
                ByteString photoId = Storage.Get(Storage.CurrentContext, key);
                ids[i] = photoId ?? (ByteString)new byte[0];
            }
            return ids;
        }

        [Safe]
        public static PhotoInfo GetPhoto(ByteString photoId)
        {
            if (photoId is null || photoId.Length == 0) return new PhotoInfo();

            byte[] dataKey = Helper.Concat(PREFIX_PHOTO_DATA, photoId);
            ByteString data = Storage.Get(Storage.CurrentContext, dataKey);
            if (data == null) return new PhotoInfo();

            UInt160 owner = (UInt160)Storage.Get(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_OWNER, photoId));
            ByteString encryptedData = Storage.Get(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_ENCRYPTED, photoId));
            bool encrypted = encryptedData != null && (BigInteger)encryptedData != 0;
            ByteString createdData = Storage.Get(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_TIME, photoId));
            BigInteger createdAt = createdData == null ? 0 : (BigInteger)createdData;

            return new PhotoInfo
            {
                PhotoId = photoId,
                Owner = owner,
                Encrypted = encrypted,
                Data = data,
                CreatedAt = createdAt
            };
        }

        public static bool UploadPhoto(string photoData, bool encrypted)
        {
            return UploadPhotos(new string[] { photoData }, new bool[] { encrypted });
        }

        public static bool UploadPhotos(string[] photoData, bool[] encryptedFlags)
        {
            ValidateNotGloballyPaused(APP_ID);

            UInt160 sender = Runtime.Transaction.Sender;
            ExecutionEngine.Assert(sender != null && sender.IsValid, "invalid sender");
            ExecutionEngine.Assert(Runtime.CheckWitness(sender), "no witness");

            if (photoData == null || encryptedFlags == null) return false;
            if (photoData.Length == 0) return false;
            if (photoData.Length > MAX_PHOTOS_PER_UPLOAD) return false;
            if (photoData.Length != encryptedFlags.Length) return false;

            int totalBytes = 0;
            for (int i = 0; i < photoData.Length; i++)
            {
                string data = photoData[i];
                if (data == null) return false;
                int length = data.Length;
                if (length == 0 || length > MAX_PHOTO_BYTES) return false;
                totalBytes += length;
                if (totalBytes > MAX_TOTAL_BYTES) return false;
            }

            BigInteger count = GetUserPhotoCount(sender);
            Transaction tx = Runtime.Transaction;

            for (int i = 0; i < photoData.Length; i++)
            {
                ByteString idSeed = Helper.Concat(tx.Hash, (ByteString)((BigInteger)i).ToByteArray());
                ByteString photoId = CryptoLib.Sha256(idSeed);

                Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_DATA, photoId), (ByteString)photoData[i]);
                Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_ENCRYPTED, photoId), encryptedFlags[i] ? 1 : 0);
                Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_OWNER, photoId), sender);
                Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_PHOTO_TIME, photoId), Runtime.Time);

                byte[] indexKey = Helper.Concat(
                    Helper.Concat(PREFIX_USER_PHOTO_INDEX, sender),
                    (ByteString)(count + i).ToByteArray());
                Storage.Put(Storage.CurrentContext, indexKey, photoId);

                OnPhotoUploaded(sender, photoId, encryptedFlags[i], count + i);
            }

            Storage.Put(Storage.CurrentContext, Helper.Concat(PREFIX_USER_PHOTO_COUNT, sender), count + photoData.Length);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_PHOTOS, TotalPhotos() + photoData.Length);

            return true;
        }
    }
}
