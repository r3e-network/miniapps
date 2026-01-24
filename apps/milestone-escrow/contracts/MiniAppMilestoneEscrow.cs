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
    public delegate void EscrowCreatedHandler(BigInteger escrowId, UInt160 creator, UInt160 beneficiary, UInt160 asset, BigInteger totalAmount, BigInteger milestoneCount);
    public delegate void MilestoneApprovedHandler(BigInteger escrowId, BigInteger milestoneIndex, UInt160 approver);
    public delegate void MilestoneClaimedHandler(BigInteger escrowId, BigInteger milestoneIndex, UInt160 beneficiary, BigInteger amount);
    public delegate void EscrowCancelledHandler(BigInteger escrowId, UInt160 creator, BigInteger refundAmount);
    public delegate void EscrowCompletedHandler(BigInteger escrowId, UInt160 beneficiary);

    /// <summary>
    /// MilestoneEscrow MiniApp - staged releases with creator approval per milestone.
    /// </summary>
    [DisplayName("MiniAppMilestoneEscrow")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "MilestoneEscrow locks NEO or GAS and releases per approved milestones.")]
    [ContractPermission("*", "*")]
    public partial class MiniAppMilestoneEscrow : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-milestone-escrow";
        private const long MIN_NEO = 1;                // 1 NEO minimum
        private const long MIN_GAS = 10000000;         // 0.1 GAS minimum
        private const int MIN_MILESTONES = 1;
        private const int MAX_MILESTONES = 12;
        private const int MAX_TITLE_LENGTH = 60;
        private const int MAX_NOTES_LENGTH = 240;
        #endregion

        #region App Prefixes (0x20+)
        private static readonly byte[] PREFIX_ESCROW_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_ESCROWS = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_CREATOR_ESCROWS = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_CREATOR_ESCROW_COUNT = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_BENEFICIARY_ESCROWS = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_BENEFICIARY_ESCROW_COUNT = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_MILESTONES = new byte[] { 0x26 };
        private static readonly byte[] PREFIX_TOTAL_LOCKED = new byte[] { 0x27 };
        private static readonly byte[] PREFIX_TOTAL_RELEASED = new byte[] { 0x28 };
        #endregion

        #region Data Structures
        public struct EscrowData
        {
            public UInt160 Creator;
            public UInt160 Beneficiary;
            public UInt160 Asset;
            public BigInteger TotalAmount;
            public BigInteger ReleasedAmount;
            public BigInteger MilestoneCount;
            public BigInteger CreatedTime;
            public bool Active;
            public bool Cancelled;
            public string Title;
            public string Notes;
        }

        public struct MilestoneData
        {
            public BigInteger Amount;
            public bool Approved;
            public bool Claimed;
            public BigInteger ApprovedTime;
            public BigInteger ClaimedTime;
        }
        #endregion

        #region Events
        [DisplayName("EscrowCreated")]
        public static event EscrowCreatedHandler OnEscrowCreated;

        [DisplayName("MilestoneApproved")]
        public static event MilestoneApprovedHandler OnMilestoneApproved;

        [DisplayName("MilestoneClaimed")]
        public static event MilestoneClaimedHandler OnMilestoneClaimed;

        [DisplayName("EscrowCancelled")]
        public static event EscrowCancelledHandler OnEscrowCancelled;

        [DisplayName("EscrowCompleted")]
        public static event EscrowCompletedHandler OnEscrowCompleted;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_ESCROW_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_LOCKED, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_RELEASED, 0);
        }
        #endregion

        #region Read Methods
        [Safe]
        public static BigInteger TotalEscrows() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_ESCROW_ID);

        [Safe]
        public static BigInteger TotalLocked() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_LOCKED);

        [Safe]
        public static BigInteger TotalReleased() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_RELEASED);

        [Safe]
        public static EscrowData GetEscrow(BigInteger escrowId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_ESCROWS, (ByteString)escrowId.ToByteArray()));
            if (data == null) return new EscrowData();
            return (EscrowData)StdLib.Deserialize(data);
        }

        [Safe]
        public static MilestoneData GetMilestone(BigInteger escrowId, BigInteger milestoneIndex)
        {
            ByteString data = Storage.Get(Storage.CurrentContext, BuildMilestoneKey(escrowId, milestoneIndex));
            if (data == null) return new MilestoneData();
            return (MilestoneData)StdLib.Deserialize(data);
        }
        #endregion
    }
}
