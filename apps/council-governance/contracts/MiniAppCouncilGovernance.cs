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
    public delegate void ProposalCreatedHandler(BigInteger proposalId, UInt160 creator, byte proposalType);
    public delegate void VoteCastHandler(BigInteger proposalId, UInt160 voter, bool support);
    public delegate void ProposalRevokedHandler(BigInteger proposalId, UInt160 creator);
    public delegate void ProposalFinalizedHandler(BigInteger proposalId, byte status);
    public delegate void ProposalExecutedHandler(BigInteger proposalId);
    public delegate void MemberBadgeEarnedHandler(UInt160 member, BigInteger badgeType, string badgeName);
    public delegate void DelegationSetHandler(UInt160 delegator, UInt160 delegatee);
    public delegate void DelegationRevokedHandler(UInt160 delegator);
    public delegate void QuorumReachedHandler(BigInteger proposalId, BigInteger totalVotes);

    /// <summary>
    /// Council Governance MiniApp - Decentralized governance for council members.
    /// Only top 21 committee members can create and vote on proposals.
    /// Supports text proposals, policy parameter change proposals, and vote delegation.
    ///
    /// FEATURES:
    /// - Text and policy change proposals
    /// - Vote delegation to other council members
    /// - Member statistics and badge system
    /// - Quorum requirements for proposal validity
    /// - Signature collection for policy execution
    ///
    /// BADGES:
    /// - 1=FirstProposal, 2=ActiveVoter(10 votes), 3=ProposalChampion(5 passed),
    /// - 4=ConsensusBuilder(10 yes votes received), 5=Veteran(50 votes cast)
    /// </summary>
    [DisplayName("MiniAppCouncilGovernance")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Version", "3.0.0")]
    [ManifestExtra("Description", "This is Neo R3E Network MiniApp. CouncilGovernance is a decentralized governance application for council voting. Use it to create and vote on proposals, you can participate in on-chain governance with vote delegation and badge rewards.")]
    [ContractPermission("*", "*")]
    public partial class MiniAppCouncilGovernance : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-council-governance";
        private const long MIN_DURATION_SECONDS = 86400;      // 1 day minimum
        private const long MAX_DURATION_SECONDS = 2592000;    // 30 days maximum
        private const int THRESHOLD_PERCENT = 50;        // >50% for passing
        private const int QUORUM_PERCENT = 30;           // 30% of committee must vote
        private const int COMMITTEE_SIZE = 21;           // Neo committee size
        // Badges: 1=FirstProposal, 2=ActiveVoter(10 votes), 3=ProposalChampion(5 passed),
        //         4=ConsensusBuilder(10 yes votes received), 5=Veteran(50 votes cast)
        #endregion

        #region App Prefixes (0x20+ to avoid collision with MiniAppBase)
        private static readonly byte[] PREFIX_CANDIDATE_CONTRACT = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_POLICY_CONTRACT = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_PROPOSAL_COUNT = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_PROPOSAL = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_VOTE = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_VOTER_LIST = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_SIGNATURE = new byte[] { 0x26 };
        private static readonly byte[] PREFIX_MEMBER_STATS = new byte[] { 0x27 };
        private static readonly byte[] PREFIX_MEMBER_BADGES = new byte[] { 0x28 };
        private static readonly byte[] PREFIX_DELEGATION = new byte[] { 0x29 };
        private static readonly byte[] PREFIX_TOTAL_PROPOSALS = new byte[] { 0x2A };
        private static readonly byte[] PREFIX_TOTAL_VOTES = new byte[] { 0x2B };
        private static readonly byte[] PREFIX_PASSED_PROPOSALS = new byte[] { 0x2C };
        private static readonly byte[] PREFIX_TOTAL_MEMBERS = new byte[] { 0x2D };
        // SECURITY: TimeLock for contract changes
        private static readonly byte[] PREFIX_PENDING_CANDIDATE_CONTRACT = new byte[] { 0x2E };
        private static readonly byte[] PREFIX_PENDING_POLICY_CONTRACT = new byte[] { 0x2F };
        private static readonly byte[] PREFIX_CONTRACT_CHANGE_TIME = new byte[] { 0x30 };
        #endregion

        #region Enums
        public const byte TYPE_TEXT = 0;
        public const byte TYPE_POLICY_CHANGE = 1;

        public const byte STATUS_PENDING = 0;
        public const byte STATUS_ACTIVE = 1;
        public const byte STATUS_PASSED = 2;
        public const byte STATUS_REJECTED = 3;
        public const byte STATUS_REVOKED = 4;
        public const byte STATUS_EXPIRED = 5;
        public const byte STATUS_EXECUTED = 6;
        #endregion

        #region Data Structures
        public struct MemberStats
        {
            public BigInteger ProposalsCreated;
            public BigInteger ProposalsPassed;
            public BigInteger ProposalsRejected;
            public BigInteger VotesCast;
            public BigInteger YesVotesCast;
            public BigInteger NoVotesCast;
            public BigInteger YesVotesReceived;
            public BigInteger DelegationsReceived;
            public BigInteger BadgeCount;
            public BigInteger JoinTime;
            public BigInteger LastActivityTime;
        }
        #endregion

        #region Events
        [DisplayName("ProposalCreated")]
        public static event ProposalCreatedHandler OnProposalCreated;

        [DisplayName("VoteCast")]
        public static event VoteCastHandler OnVoteCast;

        [DisplayName("ProposalRevoked")]
        public static event ProposalRevokedHandler OnProposalRevoked;

        [DisplayName("ProposalFinalized")]
        public static event ProposalFinalizedHandler OnProposalFinalized;

        [DisplayName("ProposalExecuted")]
        public static event ProposalExecutedHandler OnProposalExecuted;

        [DisplayName("MemberBadgeEarned")]
        public static event MemberBadgeEarnedHandler OnMemberBadgeEarned;

        [DisplayName("DelegationSet")]
        public static event DelegationSetHandler OnDelegationSet;

        [DisplayName("DelegationRevoked")]
        public static event DelegationRevokedHandler OnDelegationRevoked;

        [DisplayName("QuorumReached")]
        public static event QuorumReachedHandler OnQuorumReached;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_PROPOSAL_COUNT, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_PROPOSALS, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_VOTES, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_PASSED_PROPOSALS, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_MEMBERS, 0);
        }

        public static new void Update(ByteString nef, string manifest, object data)
        {
            ValidateAdmin();
            ContractManagement.Update(nef, manifest, data);
        }
        #endregion

        #region Admin Methods
        [Safe]
        public static UInt160 CandidateContract() =>
            (UInt160)Storage.Get(Storage.CurrentContext, PREFIX_CANDIDATE_CONTRACT);

        [Safe]
        public static UInt160 PolicyContract() =>
            (UInt160)Storage.Get(Storage.CurrentContext, PREFIX_POLICY_CONTRACT);

        [Safe]
        public static UInt160 PendingCandidateContract() =>
            (UInt160)Storage.Get(Storage.CurrentContext, PREFIX_PENDING_CANDIDATE_CONTRACT);

        [Safe]
        public static UInt160 PendingPolicyContract() =>
            (UInt160)Storage.Get(Storage.CurrentContext, PREFIX_PENDING_POLICY_CONTRACT);

        [Safe]
        public static BigInteger ContractChangeTime() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_CONTRACT_CHANGE_TIME);

        /// <summary>
        /// Proposes a new candidate contract. Change takes effect after TimeLock delay.
        /// SECURITY: TimeLock prevents immediate malicious changes.
        /// </summary>
        public static void ProposeCandidateContract(UInt160 candidateContract)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(candidateContract != null && candidateContract.IsValid, "invalid contract");
            Storage.Put(Storage.CurrentContext, PREFIX_PENDING_CANDIDATE_CONTRACT, candidateContract);
            BigInteger executeAfter = Runtime.Time + TimeLockDelay();
            Storage.Put(Storage.CurrentContext, PREFIX_CONTRACT_CHANGE_TIME, executeAfter);
        }

        /// <summary>
        /// Proposes a new policy contract. Change takes effect after TimeLock delay.
        /// SECURITY: TimeLock prevents immediate malicious changes.
        /// </summary>
        public static void ProposePolicyContract(UInt160 policyContract)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(policyContract != null && policyContract.IsValid, "invalid contract");
            Storage.Put(Storage.CurrentContext, PREFIX_PENDING_POLICY_CONTRACT, policyContract);
            BigInteger executeAfter = Runtime.Time + TimeLockDelay();
            Storage.Put(Storage.CurrentContext, PREFIX_CONTRACT_CHANGE_TIME, executeAfter);
        }

        /// <summary>
        /// Executes pending candidate contract change after TimeLock delay.
        /// </summary>
        public static void ExecuteCandidateContractChange()
        {
            ValidateAdmin();
            UInt160 pending = PendingCandidateContract();
            ExecutionEngine.Assert(pending != null && pending.IsValid, "no pending change");
            BigInteger changeTime = ContractChangeTime();
            ExecutionEngine.Assert(Runtime.Time >= changeTime, "timelock active");
            Storage.Put(Storage.CurrentContext, PREFIX_CANDIDATE_CONTRACT, pending);
            Storage.Delete(Storage.CurrentContext, PREFIX_PENDING_CANDIDATE_CONTRACT);
        }

        /// <summary>
        /// Executes pending policy contract change after TimeLock delay.
        /// </summary>
        public static void ExecutePolicyContractChange()
        {
            ValidateAdmin();
            UInt160 pending = PendingPolicyContract();
            ExecutionEngine.Assert(pending != null && pending.IsValid, "no pending change");
            BigInteger changeTime = ContractChangeTime();
            ExecutionEngine.Assert(Runtime.Time >= changeTime, "timelock active");
            Storage.Put(Storage.CurrentContext, PREFIX_POLICY_CONTRACT, pending);
            Storage.Delete(Storage.CurrentContext, PREFIX_PENDING_POLICY_CONTRACT);
        }

        /// <summary>
        /// Cancels any pending contract changes.
        /// </summary>
        public static void CancelContractChange()
        {
            ValidateAdmin();
            Storage.Delete(Storage.CurrentContext, PREFIX_PENDING_CANDIDATE_CONTRACT);
            Storage.Delete(Storage.CurrentContext, PREFIX_PENDING_POLICY_CONTRACT);
            Storage.Delete(Storage.CurrentContext, PREFIX_CONTRACT_CHANGE_TIME);
        }

        /// <summary>
        /// [DEPRECATED] Direct contract changes are no longer allowed.
        /// Use ProposeCandidateContract + ExecuteCandidateContractChange instead.
        /// </summary>
        [System.Obsolete("Use ProposeCandidateContract + ExecuteCandidateContractChange for TimeLock security")]
        public static void SetCandidateContract(UInt160 candidateContract)
        {
            ExecutionEngine.Assert(false, "use ProposeCandidateContract for TimeLock security");
        }

        /// <summary>
        /// [DEPRECATED] Direct contract changes are no longer allowed.
        /// Use ProposePolicyContract + ExecutePolicyContractChange instead.
        /// </summary>
        [System.Obsolete("Use ProposePolicyContract + ExecutePolicyContractChange for TimeLock security")]
        public static void SetPolicyContract(UInt160 policyContract)
        {
            ExecutionEngine.Assert(false, "use ProposePolicyContract for TimeLock security");
        }
        #endregion

        #region Read Methods

        [Safe]
        public static BigInteger GetTotalProposals() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_PROPOSALS);

        [Safe]
        public static BigInteger GetTotalVotes() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_VOTES);

        [Safe]
        public static BigInteger GetPassedProposals() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_PASSED_PROPOSALS);

        [Safe]
        public static BigInteger GetTotalMembers() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_MEMBERS);

        [Safe]
        public static MemberStats GetMemberStats(UInt160 member)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_MEMBER_STATS, member));
            if (data == null) return new MemberStats();
            return (MemberStats)StdLib.Deserialize(data);
        }

        [Safe]
        public static bool HasMemberBadge(UInt160 member, BigInteger badgeType)
        {
            byte[] key = Helper.Concat(
                Helper.Concat(PREFIX_MEMBER_BADGES, member),
                (ByteString)badgeType.ToByteArray());
            return (BigInteger)Storage.Get(Storage.CurrentContext, key) == 1;
        }

        [Safe]
        public static UInt160 GetDelegatee(UInt160 delegator)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_DELEGATION, delegator));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        #endregion
    }
}
