using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    public delegate void RoundCreatedHandler(BigInteger roundId, UInt160 creator, UInt160 asset, BigInteger matchingPool);
    public delegate void MatchingPoolAddedHandler(BigInteger roundId, UInt160 contributor, BigInteger amount, BigInteger totalPool);
    public delegate void RoundFinalizedHandler(BigInteger roundId, BigInteger matchingAllocated);
    public delegate void RoundCancelledHandler(BigInteger roundId, UInt160 creator);
    public delegate void MatchingWithdrawnHandler(BigInteger roundId, UInt160 creator, BigInteger amount);

    public delegate void ProjectRegisteredHandler(BigInteger projectId, BigInteger roundId, UInt160 owner, string name);
    public delegate void ProjectUpdatedHandler(BigInteger projectId);
    public delegate void ContributionMadeHandler(BigInteger roundId, BigInteger projectId, UInt160 contributor, BigInteger amount, string memo);
    public delegate void ProjectClaimedHandler(BigInteger projectId, UInt160 owner, BigInteger amount);

    /// <summary>
    /// Quadratic Funding MiniApp - public grant rounds with QF matching (off-chain).
    /// </summary>
    [DisplayName("MiniAppQuadraticFunding")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Quadratic Funding rounds for public grants with off-chain matching.")]
    [ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]  // GAS token
    [ContractPermission("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", "*")]  // NEO token
    public partial class MiniAppQuadraticFunding : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-quadratic-funding";
        private const long MIN_NEO = 1;
        private const long MIN_GAS = 10000000; // 0.1 GAS
        private const int MAX_TITLE_LENGTH = 60;
        private const int MAX_DESC_LENGTH = 240;
        private const int MAX_PROJECT_NAME_LENGTH = 60;
        private const int MAX_PROJECT_DESC_LENGTH = 300;
        private const int MAX_PROJECT_LINK_LENGTH = 200;
        private const int MAX_MEMO_LENGTH = 160;
        #endregion

        #region Storage Prefixes
        private static readonly byte[] PREFIX_ROUND_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_PROJECT_ID = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_ROUNDS = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_PROJECTS = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_ROUND_PROJECT_COUNT = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_ROUND_PROJECTS = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_OWNER_PROJECT_COUNT = new byte[] { 0x26 };
        private static readonly byte[] PREFIX_OWNER_PROJECTS = new byte[] { 0x27 };
        private static readonly byte[] PREFIX_CREATOR_ROUND_COUNT = new byte[] { 0x28 };
        private static readonly byte[] PREFIX_CREATOR_ROUNDS = new byte[] { 0x29 };
        private static readonly byte[] PREFIX_CONTRIBUTION = new byte[] { 0x2A };
        #endregion

        #region Data Structures
        public struct RoundData
        {
            public UInt160 Creator;
            public UInt160 Asset;
            public BigInteger MatchingPool;
            public BigInteger MatchingAllocated;
            public BigInteger MatchingWithdrawn;
            public BigInteger StartTime;
            public BigInteger EndTime;
            public BigInteger CreatedTime;
            public BigInteger TotalContributed;
            public BigInteger ProjectCount;
            public bool Finalized;
            public bool Cancelled;
            public string Title;
            public string Description;
        }

        public struct ProjectData
        {
            public UInt160 Owner;
            public BigInteger RoundId;
            public string Name;
            public string Description;
            public string Link;
            public BigInteger CreatedTime;
            public BigInteger TotalContributed;
            public BigInteger ContributorCount;
            public BigInteger MatchedAmount;
            public bool Active;
            public bool Claimed;
        }
        #endregion

        #region Events
        [DisplayName("RoundCreated")]
        public static event RoundCreatedHandler OnRoundCreated;

        [DisplayName("MatchingPoolAdded")]
        public static event MatchingPoolAddedHandler OnMatchingPoolAdded;

        [DisplayName("RoundFinalized")]
        public static event RoundFinalizedHandler OnRoundFinalized;

        [DisplayName("RoundCancelled")]
        public static event RoundCancelledHandler OnRoundCancelled;

        [DisplayName("MatchingWithdrawn")]
        public static event MatchingWithdrawnHandler OnMatchingWithdrawn;

        [DisplayName("ProjectRegistered")]
        public static event ProjectRegisteredHandler OnProjectRegistered;

        [DisplayName("ProjectUpdated")]
        public static event ProjectUpdatedHandler OnProjectUpdated;

        [DisplayName("ContributionMade")]
        public static event ContributionMadeHandler OnContributionMade;

        [DisplayName("ProjectClaimed")]
        public static event ProjectClaimedHandler OnProjectClaimed;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_ROUND_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_PROJECT_ID, 0);
        }
        #endregion

        #region Read Methods
        [Safe]
        public static BigInteger TotalRounds() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_ROUND_ID);

        [Safe]
        public static BigInteger TotalProjects() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_PROJECT_ID);

        [Safe]
        public static RoundData GetRound(BigInteger roundId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_ROUNDS, (ByteString)roundId.ToByteArray()));
            if (data == null) return new RoundData();
            return (RoundData)StdLib.Deserialize(data);
        }

        [Safe]
        public static ProjectData GetProject(BigInteger projectId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_PROJECTS, (ByteString)projectId.ToByteArray()));
            if (data == null) return new ProjectData();
            return (ProjectData)StdLib.Deserialize(data);
        }

        [Safe]
        public static BigInteger GetContribution(UInt160 contributor, BigInteger roundId, BigInteger projectId)
        {
            return GetContributionInternal(contributor, roundId, projectId);
        }
        #endregion
    }
}
