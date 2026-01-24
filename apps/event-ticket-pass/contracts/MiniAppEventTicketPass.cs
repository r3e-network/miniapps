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
    public delegate void EventCreatedHandler(BigInteger eventId, UInt160 creator, string name);
    public delegate void EventUpdatedHandler(BigInteger eventId);
    public delegate void TicketIssuedHandler(ByteString tokenId, BigInteger eventId, UInt160 owner);
    public delegate void TicketCheckedInHandler(ByteString tokenId, BigInteger eventId, UInt160 operatorAddress);
    public delegate void TransferHandler(UInt160 from, UInt160 to, ByteString tokenId);

    /// <summary>
    /// Event Ticket Pass MiniApp - NEP-11 tickets with QR check-in.
    /// </summary>
    [DisplayName("MiniAppEventTicketPass")]
    [SupportedStandards("NEP-11")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Event Ticket Pass issues NEP-11 tickets with QR check-in support.")]
    [ContractPermission("*", "*")]
    public partial class MiniAppEventTicketPass : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-event-ticket-pass";
        private const string TOKEN_SYMBOL = "TICKET";
        private const byte TOKEN_DECIMALS = 0;

        private const int MAX_EVENT_NAME_LENGTH = 60;
        private const int MAX_VENUE_LENGTH = 60;
        private const int MAX_NOTE_LENGTH = 240;
        private const int MAX_SEAT_LENGTH = 24;
        private const int MAX_MEMO_LENGTH = 160;
        private const int MAX_SUPPLY = 100000;
        #endregion

        #region Storage Prefixes
        private static readonly byte[] PREFIX_EVENT_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_EVENTS = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_CREATOR_EVENTS = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_CREATOR_EVENT_COUNT = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_TICKETS = new byte[] { 0x24 };

        // NEP-11 storage
        private static readonly byte[] PREFIX_TOTAL_SUPPLY = new byte[] { 0x30 };
        private static readonly byte[] PREFIX_TOKEN_OWNER = new byte[] { 0x31 };
        private static readonly byte[] PREFIX_OWNER_BALANCE = new byte[] { 0x32 };
        private static readonly byte[] PREFIX_OWNER_TOKEN = new byte[] { 0x33 };
        private static readonly byte[] PREFIX_TOKENS = new byte[] { 0x34 };
        #endregion

        #region Data Structures
        public struct EventData
        {
            public UInt160 Creator;
            public string Name;
            public string Venue;
            public BigInteger StartTime;
            public BigInteger EndTime;
            public BigInteger MaxSupply;
            public BigInteger Minted;
            public string Notes;
            public bool Active;
            public BigInteger CreatedTime;
        }

        public struct TicketData
        {
            public BigInteger EventId;
            public UInt160 Owner;
            public BigInteger IssuedTime;
            public bool Used;
            public BigInteger UsedTime;
            public string Seat;
            public string Memo;
        }
        #endregion

        #region Events
        [DisplayName("EventCreated")]
        public static event EventCreatedHandler OnEventCreated;

        [DisplayName("EventUpdated")]
        public static event EventUpdatedHandler OnEventUpdated;

        [DisplayName("TicketIssued")]
        public static event TicketIssuedHandler OnTicketIssued;

        [DisplayName("TicketCheckedIn")]
        public static event TicketCheckedInHandler OnTicketCheckedIn;

        [DisplayName("Transfer")]
        public static event TransferHandler OnTransfer;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_EVENT_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_SUPPLY, 0);
        }
        #endregion

        #region Core Read Methods
        [Safe]
        public static BigInteger TotalEvents() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_EVENT_ID);

        [Safe]
        public static BigInteger TotalTickets() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_SUPPLY);

        [Safe]
        public static EventData GetEvent(BigInteger eventId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_EVENTS, (ByteString)eventId.ToByteArray()));
            if (data == null) return new EventData();
            return (EventData)StdLib.Deserialize(data);
        }

        [Safe]
        public static TicketData GetTicket(ByteString tokenId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_TICKETS, tokenId));
            if (data == null) return new TicketData();
            return (TicketData)StdLib.Deserialize(data);
        }
        #endregion
    }
}
