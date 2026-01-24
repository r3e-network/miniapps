using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    // Event delegates for stream lifecycle
    public delegate void StreamCreatedHandler(BigInteger streamId, UInt160 creator, UInt160 beneficiary, UInt160 asset, BigInteger totalAmount, BigInteger rateAmount, BigInteger intervalSeconds);
    public delegate void StreamClaimedHandler(BigInteger streamId, UInt160 beneficiary, BigInteger amount, BigInteger totalReleased);
    public delegate void StreamCancelledHandler(BigInteger streamId, UInt160 creator, BigInteger refundAmount);
    public delegate void StreamCompletedHandler(BigInteger streamId, UInt160 beneficiary);

    /// <summary>
    /// StreamVault MiniApp - time-based release vaults for payrolls and subscriptions.
    ///
    /// FEATURES:
    /// - Create vaults with NEO or GAS deposits
    /// - Fixed interval releases to a beneficiary
    /// - Beneficiary claims on schedule
    /// - Creator can cancel and reclaim remaining funds
    /// </summary>
    [DisplayName("MiniAppStreamVault")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "StreamVault creates time-based release vaults for payrolls and subscriptions.")]
    [ContractPermission("*", "*")]
    public partial class MiniAppStreamVault : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-stream-vault";
        private const long MIN_NEO = 1;               // 1 NEO minimum
        private const long MIN_GAS = 10000000;        // 0.1 GAS minimum
        private const int MIN_INTERVAL_SECONDS = 86400;     // 1 day
        private const int MAX_INTERVAL_SECONDS = 31536000;  // 365 days
        private const int MAX_TITLE_LENGTH = 60;
        private const int MAX_NOTES_LENGTH = 240;
        #endregion

        #region App Prefixes (0x20+ to avoid collision with MiniAppBase)
        private static readonly byte[] PREFIX_STREAM_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_STREAMS = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_USER_STREAMS = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_USER_STREAM_COUNT = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_BENEFICIARY_STREAMS = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_BENEFICIARY_STREAM_COUNT = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_TOTAL_LOCKED = new byte[] { 0x26 };
        private static readonly byte[] PREFIX_TOTAL_RELEASED = new byte[] { 0x27 };
        #endregion

        #region Data Structures
        public struct StreamData
        {
            public UInt160 Creator;
            public UInt160 Beneficiary;
            public UInt160 Asset;
            public BigInteger TotalAmount;
            public BigInteger ReleasedAmount;
            public BigInteger RateAmount;
            public BigInteger IntervalSeconds;
            public BigInteger StartTime;
            public BigInteger LastClaimTime;
            public BigInteger CreatedTime;
            public bool Active;
            public bool Cancelled;
            public string Title;
            public string Notes;
        }
        #endregion

        #region App Events
        [DisplayName("StreamCreated")]
        public static event StreamCreatedHandler OnStreamCreated;

        [DisplayName("StreamClaimed")]
        public static event StreamClaimedHandler OnStreamClaimed;

        [DisplayName("StreamCancelled")]
        public static event StreamCancelledHandler OnStreamCancelled;

        [DisplayName("StreamCompleted")]
        public static event StreamCompletedHandler OnStreamCompleted;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_STREAM_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_LOCKED, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_RELEASED, 0);
        }
        #endregion

        #region Read Methods
        [Safe]
        public static BigInteger TotalStreams() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_STREAM_ID);

        [Safe]
        public static BigInteger TotalLocked() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_LOCKED);

        [Safe]
        public static BigInteger TotalReleased() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_RELEASED);

        [Safe]
        public static StreamData GetStream(BigInteger streamId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_STREAMS, (ByteString)streamId.ToByteArray()));
            if (data == null) return new StreamData();
            return (StreamData)StdLib.Deserialize(data);
        }
        #endregion
    }
}
