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
    public delegate void TemplateCreatedHandler(BigInteger templateId, UInt160 issuer, string name);
    public delegate void TemplateUpdatedHandler(BigInteger templateId);
    public delegate void CertificateIssuedHandler(ByteString tokenId, BigInteger templateId, UInt160 owner);
    public delegate void CertificateRevokedHandler(ByteString tokenId, BigInteger templateId, UInt160 issuer);
    public delegate void TransferHandler(UInt160 from, UInt160 to, ByteString tokenId);

    /// <summary>
    /// Soulbound Certificate MiniApp - Non-transferable NEP-11 certificates.
    /// </summary>
    [DisplayName("MiniAppSoulboundCertificate")]
    [SupportedStandards("NEP-11")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Soulbound Certificate issues non-transferable NEP-11 badges.")]
    [ContractPermission("*", "*")]
    public partial class MiniAppSoulboundCertificate : MiniAppBase
    {
        #region App Constants
        private const string APP_ID = "miniapp-soulbound-certificate";
        private const string TOKEN_SYMBOL = "CERT";
        private const byte TOKEN_DECIMALS = 0;

        private const int MAX_NAME_LENGTH = 60;
        private const int MAX_ISSUER_NAME_LENGTH = 60;
        private const int MAX_CATEGORY_LENGTH = 32;
        private const int MAX_DESCRIPTION_LENGTH = 240;
        private const int MAX_RECIPIENT_NAME_LENGTH = 60;
        private const int MAX_ACHIEVEMENT_LENGTH = 120;
        private const int MAX_MEMO_LENGTH = 160;
        private const int MAX_SUPPLY = 100000;
        #endregion

        #region Storage Prefixes (0x20+)
        private static readonly byte[] PREFIX_TEMPLATE_ID = new byte[] { 0x20 };
        private static readonly byte[] PREFIX_TEMPLATES = new byte[] { 0x21 };
        private static readonly byte[] PREFIX_ISSUER_TEMPLATES = new byte[] { 0x22 };
        private static readonly byte[] PREFIX_ISSUER_TEMPLATE_COUNT = new byte[] { 0x23 };
        private static readonly byte[] PREFIX_CERTIFICATES = new byte[] { 0x24 };

        // NEP-11 storage
        private static readonly byte[] PREFIX_TOTAL_SUPPLY = new byte[] { 0x30 };
        private static readonly byte[] PREFIX_TOKEN_OWNER = new byte[] { 0x31 };
        private static readonly byte[] PREFIX_OWNER_BALANCE = new byte[] { 0x32 };
        private static readonly byte[] PREFIX_OWNER_TOKEN_COUNT = new byte[] { 0x33 };
        private static readonly byte[] PREFIX_OWNER_TOKEN_LIST = new byte[] { 0x34 };
        private static readonly byte[] PREFIX_TOKENS = new byte[] { 0x35 };
        #endregion

        #region Data Structures
        public struct TemplateData
        {
            public UInt160 Issuer;
            public string Name;
            public string IssuerName;
            public string Category;
            public BigInteger MaxSupply;
            public BigInteger Issued;
            public string Description;
            public bool Active;
            public BigInteger CreatedTime;
        }

        public struct CertificateData
        {
            public BigInteger TemplateId;
            public UInt160 Owner;
            public BigInteger IssuedTime;
            public bool Revoked;
            public BigInteger RevokedTime;
            public string RecipientName;
            public string Achievement;
            public string Memo;
        }
        #endregion

        #region Events
        [DisplayName("TemplateCreated")]
        public static event TemplateCreatedHandler OnTemplateCreated;

        [DisplayName("TemplateUpdated")]
        public static event TemplateUpdatedHandler OnTemplateUpdated;

        [DisplayName("CertificateIssued")]
        public static event CertificateIssuedHandler OnCertificateIssued;

        [DisplayName("CertificateRevoked")]
        public static event CertificateRevokedHandler OnCertificateRevoked;

        [DisplayName("Transfer")]
        public static event TransferHandler OnTransfer;
        #endregion

        #region Lifecycle
        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, PREFIX_ADMIN, Runtime.Transaction.Sender);
            Storage.Put(Storage.CurrentContext, PREFIX_TEMPLATE_ID, 0);
            Storage.Put(Storage.CurrentContext, PREFIX_TOTAL_SUPPLY, 0);
        }
        #endregion

        #region Core Read Methods
        [Safe]
        public static BigInteger TotalTemplates() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TEMPLATE_ID);

        [Safe]
        public static BigInteger TotalCertificates() =>
            (BigInteger)Storage.Get(Storage.CurrentContext, PREFIX_TOTAL_SUPPLY);

        [Safe]
        public static TemplateData GetTemplate(BigInteger templateId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_TEMPLATES, (ByteString)templateId.ToByteArray()));
            if (data == null) return new TemplateData();
            return (TemplateData)StdLib.Deserialize(data);
        }

        [Safe]
        public static CertificateData GetCertificate(ByteString tokenId)
        {
            ByteString data = Storage.Get(Storage.CurrentContext,
                Helper.Concat((ByteString)PREFIX_CERTIFICATES, tokenId));
            if (data == null) return new CertificateData();
            return (CertificateData)StdLib.Deserialize(data);
        }
        #endregion
    }
}
