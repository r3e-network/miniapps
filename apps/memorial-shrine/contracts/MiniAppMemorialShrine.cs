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
    // Event delegates
    
    /// <summary>
    /// Event emitted when a new memorial is created.
    /// </summary>
    /// <param name="memorialId">Unique memorial identifier</param>
    /// <param name="creator">Creator's address</param>
    /// <param name="deceasedName">Name of the deceased</param>
    /// <param name="deathYear">Year of passing</param>
    public delegate void MemorialCreatedHandler(BigInteger memorialId, UInt160 creator, string deceasedName, BigInteger deathYear);
    
    /// <summary>
    /// Event emitted when an obituary is published.
    /// </summary>
    /// <param name="memorialId">The memorial identifier</param>
    /// <param name="deceasedName">Name of the deceased</param>
    /// <param name="obituary">Obituary text content</param>
    public delegate void ObituaryPublishedHandler(BigInteger memorialId, string deceasedName, string obituary);
    
    /// <summary>
    /// Event emitted when a visitor pays tribute at a memorial.
    /// </summary>
    /// <param name="memorialId">The memorial identifier</param>
    /// <param name="visitor">Visitor's address</param>
    /// <param name="offeringType">Type of offering (1-6: incense, candle, flower, fruit, wine, feast)</param>
    public delegate void TributePaidHandler(BigInteger memorialId, UInt160 visitor, BigInteger offeringType);
    
    /// <summary>
    /// Event emitted when memorial information is updated.
    /// </summary>
    /// <param name="memorialId">The memorial identifier</param>
    /// <param name="fieldUpdated">Name of field that was updated</param>
    public delegate void MemorialUpdatedHandler(BigInteger memorialId, string fieldUpdated);

    /// <summary>
    /// Memorial Shrine MiniApp - Blockchain Memorial (区块链灵位)
    /// 
    /// Eternally inscribe memories of the departed on the blockchain.
    /// 将逝者的记忆永久铭刻于区块链之上，让思念跨越时空，让记忆永不消逝。
    ///
    /// FEATURES:
    /// - Create Memorials: Record name, photo, birth/death years, biography, obituary
    ///   创建灵位：记录逝者姓名、照片、生卒年份、生平、讣告
    /// - Pay Tribute: Express grief with incense, candles, flowers, and offerings
    ///   虔诚祭拜：以香火、鲜花、祭品表达哀思
    /// - Eternal Records: All tributes permanently stored on blockchain
    ///   永恒记录：所有祭拜记录永久保存于区块链
    /// - Obituary Board: Public announcements for new memorials
    ///   讣告公示：新灵位发布讣告通知
    ///
    /// Offering services are charitable, only charging blockchain operating costs.
    /// 祭拜服务为公益性质，仅收取区块链运行成本。
    /// </summary>
    [DisplayName("MiniAppMemorialShrine")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Memorial Shrine - Blockchain Memorial. Eternally inscribe memories of the departed on the blockchain.")]
    [ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]  // GAS token
    /// <summary>
    /// Memorial Shrine MiniApp - Blockchain Memorial (区块链灵位)
    /// 
    /// Eternally inscribe memories of the departed on the blockchain.
    /// 将逝者的记忆永久铭刻于区块链之上，让思念跨越时空，让记忆永不消逝。
    ///
    /// FEATURES:
    /// - Create Memorials: Record name, photo, birth/death years, biography, obituary
    ///   创建灵位：记录逝者姓名、照片、生卒年份、生平、讣告
    /// - Pay Tribute: Express grief with incense, candles, flowers, and offerings  
    ///   虔诚祭拜：以香火、鲜花、祭品表达哀思
    /// - Eternal Records: All tributes permanently stored on blockchain
    ///   永恒记录：所有祭拜记录永久保存于区块链
    /// - Obituary Board: Public announcements for new memorials
    ///   讣告公示：新灵位发布讣告通知
    /// - NeoFS Storage: Photos, videos, audio permanently stored in decentralized storage
    ///   NeoFS存储：照片、视频、音频永久保存在去中心化存储
    ///
    /// NEOFS STORAGE:
    /// - Memorial Photos: Permanently stored in NeoFS, no centralized server dependency
    ///   灵位照片：永久保存在NeoFS，不依赖中心化服务器
    /// - Biographies: Long text support for large content
    ///   生平传记：长文本支持，可存放大容量内容
    /// - Audio/Video: Support for voice messages and memorial videos
    ///   音频/视频：支持语音留言、纪念视频
    /// - 99% cheaper than on-chain storage
    /// 
    /// Offering services are charitable, only charging blockchain operating costs.
    /// 祭拜服务为公益性质，仅收取区块链运行成本。
    /// </summary>
    public partial class MiniAppMemorialShrine : MiniAppNeoFSBase
    {
        #region App Constants
        /// <summary>Unique application identifier for the Memorial Shrine miniapp.</summary>
        private const string APP_ID = "miniapp-memorial-shrine";
        
        // Offering costs (公益性质 - charitable, only covers blockchain costs)
        
        /// <summary>Cost of incense offering in GAS (0.01 GAS = 1,000,000). 香 - Incense.</summary>
        private const long OFFERING_INCENSE = 1000000;
        
        /// <summary>Cost of candle offering in GAS (0.02 GAS = 2,000,000). 蜡烛 - Candle.</summary>
        private const long OFFERING_CANDLE = 2000000;
        
        /// <summary>Cost of flower offering in GAS (0.03 GAS = 3,000,000). 鲜花 - Flowers.</summary>
        private const long OFFERING_FLOWER = 3000000;
        
        /// <summary>Cost of fruit offering in GAS (0.05 GAS = 5,000,000). 水果 - Fruit.</summary>
        private const long OFFERING_FRUIT = 5000000;
        
        /// <summary>Cost of wine offering in GAS (0.1 GAS = 10,000,000). 酒 - Wine.</summary>
        private const long OFFERING_WINE = 10000000;
        
        /// <summary>Cost of feast offering in GAS (0.5 GAS = 50,000,000). 祭宴 - Feast.</summary>
        private const long OFFERING_FEAST = 50000000;
        
        // Offering type identifiers
        
        /// <summary>Offering type: Incense (香).</summary>
        private const int TYPE_INCENSE = 1;
        
        /// <summary>Offering type: Candle (蜡烛).</summary>
        private const int TYPE_CANDLE = 2;
        
        /// <summary>Offering type: Flower (鲜花).</summary>
        private const int TYPE_FLOWER = 3;
        
        /// <summary>Offering type: Fruit (水果).</summary>
        private const int TYPE_FRUIT = 4;
        
        /// <summary>Offering type: Wine (酒).</summary>
        private const int TYPE_WINE = 5;
        
        /// <summary>Offering type: Feast (祭宴).</summary>
        private const int TYPE_FEAST = 6;
        #endregion

        #region Storage Prefixes
        private static readonly byte[] PREFIX_MEMORIAL_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_MEMORIALS = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_CREATOR_MEMORIALS = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_CREATOR_MEMORIAL_COUNT = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_TRIBUTE_ID = new byte[] { 0x24 };
        private static readonly byte[] PREFIX_TRIBUTES = new byte[] { 0x25 };
        private static readonly byte[] PREFIX_MEMORIAL_TRIBUTES = new byte[] { 0x26 };
        private static readonly byte[] PREFIX_MEMORIAL_TRIBUTE_COUNT = new byte[] { 0x27 };
        private static readonly byte[] PREFIX_VISITOR_MEMORIALS = new byte[] { 0x28 };
        private static readonly byte[] PREFIX_VISITOR_MEMORIAL_COUNT = new byte[] { 0x29 };
        private static readonly byte[] PREFIX_RECENT_OBITUARIES = new byte[] { 0x2A };
        private static readonly byte[] PREFIX_OBITUARY_COUNT = new byte[] { 0x2B };
        private static readonly byte[] PREFIX_VISITED_FLAG = new byte[] { 0x2C };
        #endregion

        #region Data Structures
        
        /// <summary>
        /// Memorial for the deceased (灵位 - spirit tablet).
        /// 
        /// Storage: Serialized and stored with PREFIX_MEMORIALS + memorialId
        /// Created: When user creates a memorial
        /// Updated: When tributes are paid, fields modified
        /// </summary>
        public struct Memorial
        {
            /// <summary>Unique memorial identifier.</summary>
            public BigInteger Id;
            /// <summary>Creator's address (typically family member).</summary>
            public UInt160 Creator;
            /// <summary>Name of the deceased.</summary>
            public string DeceasedName;
            /// <summary>Photo hash reference (IPFS or NeoFS).</summary>
            public string PhotoHash;
            /// <summary>Relationship to creator (e.g., "Father", "Friend").</summary>
            public string Relationship;
            /// <summary>Birth year of the deceased.</summary>
            public BigInteger BirthYear;
            /// <summary>Year of passing.</summary>
            public BigInteger DeathYear;
            /// <summary>Biography or life story.</summary>
            public string Biography;
            /// <summary>Obituary text.</summary>
            public string Obituary;
            /// <summary>Unix timestamp when memorial was created.</summary>
            public BigInteger CreateTime;
            /// <summary>Unix timestamp of most recent tribute.</summary>
            public BigInteger LastTributeTime;
            /// <summary>Whether the memorial is active (can be deactivated).</summary>
            public bool Active;
            // Offering statistics (祭品统计)
            /// <summary>Number of incense offerings received.</summary>
            public BigInteger IncenseCount;
            /// <summary>Number of candle offerings received.</summary>
            public BigInteger CandleCount;
            /// <summary>Number of flower offerings received.</summary>
            public BigInteger FlowerCount;
            /// <summary>Number of fruit offerings received.</summary>
            public BigInteger FruitCount;
            /// <summary>Number of wine offerings received.</summary>
            public BigInteger WineCount;
            /// <summary>Number of feast offerings received.</summary>
            public BigInteger FeastCount;
        }

        /// <summary>
        /// Tribute/Offering at a memorial (祭拜记录).
        /// 
        /// Storage: Serialized and stored with PREFIX_TRIBUTES + tributeId
        /// </summary>
        public struct Tribute
        {
            /// <summary>Unique tribute identifier.</summary>
            public BigInteger Id;
            /// <summary>Memorial being visited.</summary>
            public BigInteger MemorialId;
            /// <summary>Visitor's address.</summary>
            public UInt160 Visitor;
            /// <summary>Type of offering (1-6: incense, candle, flower, fruit, wine, feast).</summary>
            public BigInteger OfferingType;
            /// <summary>Optional message from visitor.</summary>
            public string Message;
            /// <summary>Unix timestamp of tribute.</summary>
            public BigInteger Timestamp;
        }
        
        #endregion

        #region Events
        [DisplayName("MemorialCreated")]
        public static event MemorialCreatedHandler OnMemorialCreated;

        [DisplayName("ObituaryPublished")]
        public static event ObituaryPublishedHandler OnObituaryPublished;

        [DisplayName("TributePaid")]
        public static event TributePaidHandler OnTributePaid;

        [DisplayName("MemorialUpdated")]
        public static event MemorialUpdatedHandler OnMemorialUpdated;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_MEMORIAL_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TRIBUTE_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_OBITUARY_COUNT, 0);
        }
        #endregion

        #region Read Methods
        
        [Safe]
        public static BigInteger GetMemorialCount() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_MEMORIAL_ID);

        [Safe]
        public static BigInteger GetObituaryCount() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_OBITUARY_COUNT);

        [Safe]
        public static Memorial GetMemorial(BigInteger memorialId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_MEMORIALS, (ByteString)memorialId.ToByteArray()));
            if (data == null) return new Memorial();
            return (Memorial)StdLib.Deserialize(data);
        }

        [Safe]
        public static Tribute GetTribute(BigInteger tributeId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_TRIBUTES, (ByteString)tributeId.ToByteArray()));
            if (data == null) return new Tribute();
            return (Tribute)StdLib.Deserialize(data);
        }

        [Safe]
        public static BigInteger GetCreatorMemorialCount(UInt160 creator)
        {
            byte[] key = Helper.Concat(PREFIX_CREATOR_MEMORIAL_COUNT, creator);
            return (BigInteger)Storage.Get(Storage.CurrentContext, key);
        }

        [Safe]
        public static BigInteger GetVisitorMemorialCount(UInt160 visitor)
        {
            byte[] key = Helper.Concat(PREFIX_VISITOR_MEMORIAL_COUNT, visitor);
            return (BigInteger)Storage.Get(Storage.CurrentContext, key);
        }

        [Safe]
        public static BigInteger GetMemorialTributeCount(BigInteger memorialId)
        {
            byte[] key = Helper.Concat(PREFIX_MEMORIAL_TRIBUTE_COUNT, (ByteString)memorialId.ToByteArray());
            return (BigInteger)Storage.Get(Storage.CurrentContext, key);
        }

        [Safe]
        public static BigInteger GetOfferingCost(BigInteger offeringType)
        {
            if (offeringType == TYPE_INCENSE) return OFFERING_INCENSE;
            if (offeringType == TYPE_CANDLE) return OFFERING_CANDLE;
            if (offeringType == TYPE_FLOWER) return OFFERING_FLOWER;
            if (offeringType == TYPE_FRUIT) return OFFERING_FRUIT;
            if (offeringType == TYPE_WINE) return OFFERING_WINE;
            if (offeringType == TYPE_FEAST) return OFFERING_FEAST;
            return 0;
        }

        [Safe]
        public static string GetOfferingName(BigInteger offeringType)
        {
            if (offeringType == TYPE_INCENSE) return "香";
            if (offeringType == TYPE_CANDLE) return "蜡烛";
            if (offeringType == TYPE_FLOWER) return "鲜花";
            if (offeringType == TYPE_FRUIT) return "水果";
            if (offeringType == TYPE_WINE) return "酒";
            if (offeringType == TYPE_FEAST) return "祭宴";
            return "";
        }

        #endregion
    }
}
