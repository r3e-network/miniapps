using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    // Event delegates
    public delegate void AgentRegisteredHandler(UInt160 agent, string displayName);
    public delegate void AgentUnregisteredHandler(UInt160 agent);
    public delegate void DelegationCreatedHandler(UInt160 delegator, UInt160 delegatee, BigInteger votingPower);
    public delegate void DelegationChangedHandler(UInt160 delegator, UInt160 oldDelegatee, UInt160 newDelegatee);
    public delegate void DelegationRevokedHandler(UInt160 delegator, UInt160 delegatee);

    [DisplayName("MiniAppTrustAnchor")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Non-profit voting delegation for Neo N3 governance")]
    [ContractPermission("*", "*")]
    public class MiniAppTrustAnchor : SmartContract
    {
        private const int MAX_AGENTS = 21;
        private static readonly byte[] PREFIX_ADMIN = new byte[] { 0x01 };
        private static readonly byte[] PREFIX_AGENT = new byte[] { 0x02 };
        private static readonly byte[] PREFIX_DELEGATION = new byte[] { 0x03 };
        private static readonly byte[] PREFIX_TOTAL_DELEGATIONS = new byte[] { 0x04 };
        private static readonly byte[] PREFIX_TOTAL_AGENTS = new byte[] { 0x05 };
        private static readonly byte[] PREFIX_ACTIVE_AGENTS = new byte[] { 0x06 };
        private static readonly byte[] PREFIX_VOTING_POWER = new byte[] { 0x07 };
        private static readonly byte[] PREFIX_AGENT_INDEX = new byte[] { 0x08 };

        // Events
        [DisplayName("AgentRegistered")]
        public static event AgentRegisteredHandler OnAgentRegistered;

        [DisplayName("AgentUnregistered")]
        public static event AgentUnregisteredHandler OnAgentUnregistered;

        [DisplayName("DelegationCreated")]
        public static event DelegationCreatedHandler OnDelegationCreated;

        [DisplayName("DelegationChanged")]
        public static event DelegationChangedHandler OnDelegationChanged;

        [DisplayName("DelegationRevoked")]
        public static event DelegationRevokedHandler OnDelegationRevoked;

        public struct AgentInfo
        {
            public UInt160 AgentAddress;
            public string DisplayName;
            public string MetadataUri;
            public BigInteger ReputationScore;
            public BigInteger TotalDelegators;
            public BigInteger TotalVotingPower;
            public BigInteger RegistrationTime;
            public bool IsActive;
        }

        public struct DelegationInfo
        {
            public UInt160 Delegator;
            public UInt160 Delegatee;
            public BigInteger VotingPower;
            public BigInteger DelegationTime;
        }

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, (ByteString)Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_DELEGATIONS, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_AGENTS, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_ACTIVE_AGENTS, 0);
        }

        private static void ValidateAdmin()
        {
            if (!Runtime.CheckWitness(GetAdmin()))
                throw new Exception("Invalid admin");
        }

        private static UInt160 GetAdmin()
        {
            ByteString data = Storage.Get(Storage.CurrentContext, PREFIX_ADMIN);
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        [Safe]
        public static BigInteger GetTotalDelegations()
        {
            return (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_DELEGATIONS);
        }

        [Safe]
        public static BigInteger GetTotalAgents()
        {
            return (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_AGENTS);
        }

        [Safe]
        public static BigInteger GetActiveAgentCount()
        {
            return (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_ACTIVE_AGENTS);
        }

        [Safe]
        public static UInt160 GetAgentByIndex(BigInteger index)
        {
            ByteString key = Helper.Concat((ByteString)PREFIX_AGENT_INDEX, index.ToByteArray());
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        [Safe]
        public static AgentInfo GetAgentInfo(UInt160 agent)
        {
            ByteString key = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)agent);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return new AgentInfo();
            return (AgentInfo)StdLib.Deserialize(data);
        }

        [Safe]
        public static DelegationInfo GetDelegationInfo(UInt160 delegator)
        {
            ByteString key = Helper.Concat((ByteString)PREFIX_DELEGATION, (ByteString)delegator);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return new DelegationInfo();
            return (DelegationInfo)StdLib.Deserialize(data);
        }

        [Safe]
        public static BigInteger GetVotingPower(UInt160 account)
        {
            ByteString key = Helper.Concat((ByteString)PREFIX_VOTING_POWER, (ByteString)account);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return 0;
            return (BigInteger)data;
        }

        [Safe]
        public static bool IsDelegating(UInt160 delegator)
        {
            DelegationInfo d = GetDelegationInfo(delegator);
            return d.Delegatee != UInt160.Zero;
        }

        [Safe]
        public static UInt160 GetCurrentDelegatee(UInt160 delegator)
        {
            DelegationInfo d = GetDelegationInfo(delegator);
            return d.Delegatee;
        }

        [Safe]
        public static BigInteger CalculateVotingPower(UInt160 account)
        {
            BigInteger gas = GAS.BalanceOf(account);
            BigInteger neo = NEO.BalanceOf(account);
            return neo + gas / 100000000;
        }

        public static void RegisterAgent(string displayName, string metadataUri)
        {
            UInt160 sender = (UInt160)Runtime.Transaction.Sender;
            if (sender == UInt160.Zero) throw new Exception("Invalid sender");
            if (string.IsNullOrEmpty(displayName) || displayName.Length > 100)
                throw new Exception("Invalid name");

            AgentInfo existing = GetAgentInfo(sender);
            if (existing.IsActive) throw new Exception("Already registered");

            BigInteger total = GetTotalAgents();
            if (total >= MAX_AGENTS) throw new Exception("Max agents reached");

            AgentInfo newAgent = new AgentInfo
            {
                AgentAddress = sender,
                DisplayName = displayName,
                MetadataUri = metadataUri ?? "",
                ReputationScore = 0,
                TotalDelegators = 0,
                TotalVotingPower = 0,
                RegistrationTime = Runtime.Time,
                IsActive = true
            };

            ByteString key = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)sender);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(newAgent));

            // Add to agent index
            ByteString indexKey = Helper.Concat((ByteString)PREFIX_AGENT_INDEX, total.ToByteArray());
            Storage.Put(Storage.CurrentContext, indexKey, (ByteString)sender);

            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_AGENTS, total + 1);
            Storage.Put(Storage.CurrentContext, PREFIX_ACTIVE_AGENTS, GetActiveAgentCount() + 1);

            OnAgentRegistered(sender, displayName);
        }

        public static void UnregisterAgent()
        {
            UInt160 sender = (UInt160)Runtime.Transaction.Sender;
            AgentInfo agent = GetAgentInfo(sender);
            if (!agent.IsActive) throw new Exception("Not registered");

            agent.IsActive = false;
            ByteString key = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)sender);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(agent));

            Storage.Put(Storage.CurrentContext, PREFIX_ACTIVE_AGENTS, GetActiveAgentCount() - 1);

            OnAgentUnregistered(sender);
        }

        public static void DelegateTo(UInt160 delegatee)
        {
            UInt160 delegator = (UInt160)Runtime.Transaction.Sender;
            if (delegator == delegatee) throw new Exception("Cannot delegate to self");
            if (delegatee == UInt160.Zero) throw new Exception("Invalid delegatee");

            AgentInfo agent = GetAgentInfo(delegatee);
            if (!agent.IsActive) throw new Exception("Agent not active");

            BigInteger power = CalculateVotingPower(delegator);
            if (power <= 0) throw new Exception("No voting power");

            DelegationInfo existing = GetDelegationInfo(delegator);
            if (existing.Delegatee == delegatee) throw new Exception("Already delegated");

            if (existing.Delegatee != UInt160.Zero)
            {
                ChangeDelegation(delegator, existing.Delegatee, delegatee, power);
            }
            else
            {
                CreateDelegation(delegator, delegatee, power);
            }
        }

        public static void RevokeDelegation()
        {
            UInt160 delegator = (UInt160)Runtime.Transaction.Sender;
            DelegationInfo d = GetDelegationInfo(delegator);
            if (d.Delegatee == UInt160.Zero) throw new Exception("No delegation");
            RevokeDelegationInternal(delegator);
        }

        private static void CreateDelegation(UInt160 delegator, UInt160 delegatee, BigInteger power)
        {
            DelegationInfo nd = new DelegationInfo
            {
                Delegator = delegator,
                Delegatee = delegatee,
                VotingPower = power,
                DelegationTime = Runtime.Time
            };

            ByteString key = Helper.Concat((ByteString)PREFIX_DELEGATION, (ByteString)delegator);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(nd));

            AgentInfo agent = GetAgentInfo(delegatee);
            agent.TotalDelegators++;
            agent.TotalVotingPower += power;
            ByteString agentKey = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)delegatee);
            Storage.Put(Storage.CurrentContext, agentKey, StdLib.Serialize(agent));

            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_DELEGATIONS, GetTotalDelegations() + 1);
            UpdateVotingPower(delegator, 0);

            OnDelegationCreated(delegator, delegatee, power);
        }

        private static void ChangeDelegation(UInt160 delegator, UInt160 oldDel, UInt160 newDel, BigInteger power)
        {
            // Recalculate current voting power
            BigInteger currentPower = CalculateVotingPower(delegator);

            AgentInfo oldAgent = GetAgentInfo(oldDel);
            oldAgent.TotalDelegators--;
            oldAgent.TotalVotingPower -= power;
            ByteString oldKey = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)oldDel);
            Storage.Put(Storage.CurrentContext, oldKey, StdLib.Serialize(oldAgent));

            AgentInfo newAgent = GetAgentInfo(newDel);
            newAgent.TotalDelegators++;
            newAgent.TotalVotingPower += currentPower;
            ByteString newKey = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)newDel);
            Storage.Put(Storage.CurrentContext, newKey, StdLib.Serialize(newAgent));

            DelegationInfo d = GetDelegationInfo(delegator);
            d.Delegatee = newDel;
            d.VotingPower = currentPower;
            d.DelegationTime = Runtime.Time;
            ByteString key = Helper.Concat((ByteString)PREFIX_DELEGATION, (ByteString)delegator);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(d));

            OnDelegationChanged(delegator, oldDel, newDel);
        }

        private static void RevokeDelegationInternal(UInt160 delegator)
        {
            DelegationInfo d = GetDelegationInfo(delegator);
            UInt160 delegatee = d.Delegatee;
            BigInteger power = d.VotingPower;

            AgentInfo agent = GetAgentInfo(delegatee);
            agent.TotalDelegators--;
            agent.TotalVotingPower -= power;
            ByteString key = Helper.Concat((ByteString)PREFIX_AGENT, (ByteString)delegatee);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(agent));

            Storage.Delete(Storage.CurrentContext, Helper.Concat((ByteString)PREFIX_DELEGATION, (ByteString)delegator));
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_DELEGATIONS, GetTotalDelegations() - 1);
            UpdateVotingPower(delegator, power);

            OnDelegationRevoked(delegator, delegatee);
        }

        private static void UpdateVotingPower(UInt160 account, BigInteger newPower)
        {
            ByteString key = Helper.Concat((ByteString)PREFIX_VOTING_POWER, (ByteString)account);
            Storage.Put(Storage.CurrentContext, key, newPower);
        }
    }
}
