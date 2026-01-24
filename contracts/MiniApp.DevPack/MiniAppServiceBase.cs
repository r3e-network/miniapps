using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace NeoMiniAppPlatform.Contracts
{
    /// <summary>
    /// MiniApp DevPack - Service Base Class
    ///
    /// Extends MiniAppBase with service callback and automation functionality:
    /// - Service request/callback pattern (Chainlink-style)
    /// - Automation anchor integration
    /// - Periodic task registration
    ///
    /// STORAGE LAYOUT (0x18-0x1B):
    /// - 0x1A: Request to data mapping
    /// - 0x1B: Reserved
    /// (Automation anchor/task are stored in MiniAppBase: 0x0A/0x0B)
    ///
    /// USE FOR:
    /// - MiniAppOnChainTarot
    /// - MiniAppGuardianPolicy
    /// - MiniAppFlashLoan
    /// - MiniAppRedEnvelope
    /// - Any MiniApp needing external service callbacks
    /// </summary>
    public abstract class MiniAppServiceBase : MiniAppBase
    {
        #region Service Storage Prefixes (0x18-0x1B)

        protected static readonly byte[] PREFIX_SERVICE_REQUEST_DATA = new byte[] { 0x1A };
        protected static readonly byte[] PREFIX_SERVICE_REQUEST_META = new byte[] { 0x1B };

        #endregion

        #region Callback Security Constants

        // Maximum callback age in milliseconds (5 minutes)
        private const ulong MAX_CALLBACK_AGE_MS = 5 * 60 * 1000;

        #endregion

        #region Events

        public delegate void ServiceRequestedHandler(BigInteger requestId, string serviceType);
        public delegate void AutomationRegisteredHandler(BigInteger taskId, string triggerType);
        public delegate void AutomationCancelledHandler(BigInteger taskId);

        [DisplayName("ServiceRequested")]
        public static event ServiceRequestedHandler OnServiceRequested;

        [DisplayName("AutomationRegistered")]
        public static event AutomationRegisteredHandler OnAutomationRegistered;

        [DisplayName("AutomationCancelled")]
        public static event AutomationCancelledHandler OnAutomationCancelled;

        #endregion

        #region Automation Management

        protected static BigInteger RegisterAutomationTask(
            string triggerType, string schedule, BigInteger gasLimit)
        {
            UInt160 anchor = AutomationAnchor();
            ExecutionEngine.Assert(anchor != UInt160.Zero, "anchor not set");

            BigInteger taskId = (BigInteger)Contract.Call(
                anchor, "registerPeriodicTask", CallFlags.All,
                Runtime.ExecutingScriptHash, "onPeriodicExecution",
                triggerType, schedule, gasLimit);

            Storage.Put(Storage.CurrentContext, PREFIX_AUTOMATION_TASK, taskId);
            OnAutomationRegistered(taskId, triggerType);
            return taskId;
        }

        protected static void CancelAutomationTask()
        {
            BigInteger taskId = GetAutomationTaskId();
            ExecutionEngine.Assert(taskId > 0, "no task registered");

            UInt160 anchor = AutomationAnchor();
            Contract.Call(anchor, "cancelPeriodicTask", CallFlags.All, taskId);

            Storage.Delete(Storage.CurrentContext, PREFIX_AUTOMATION_TASK);
            OnAutomationCancelled(taskId);
        }

        protected static void ValidateAutomationAnchor()
        {
            UInt160 anchor = AutomationAnchor();
            ExecutionEngine.Assert(anchor != UInt160.Zero, "anchor not set");
            ExecutionEngine.Assert(Runtime.CallingScriptHash == anchor, "only anchor");
        }

        #endregion

        #region Service Request Methods

        protected static BigInteger RequestService(
            string appId, string serviceType, ByteString payload)
        {
            UInt160 gateway = Gateway();
            ExecutionEngine.Assert(gateway != null && gateway.IsValid, "gateway not set");

            BigInteger requestId = (BigInteger)Contract.Call(
                gateway,
                "requestService",
                CallFlags.All,
                appId,
                serviceType,
                payload,
                Runtime.ExecutingScriptHash,
                "onServiceCallback"
            );

            // Store request metadata for callback validation
            // Format: [serviceType (string)] + [timestamp (ulong)] + [processed (byte)]
            StoreRequestMeta(requestId, serviceType, Runtime.Time);

            OnServiceRequested(requestId, serviceType);
            return requestId;
        }

        protected static BigInteger RequestPriceFeed(string appId, ByteString payload)
        {
            return RequestService(appId, ServiceTypes.PRICE_FEED, payload);
        }

        protected static BigInteger RequestRng(string appId, ByteString payload)
        {
            return RequestService(appId, ServiceTypes.RNG, payload);
        }

        protected static BigInteger RequestEncryption(string appId, ByteString payload)
        {
            return RequestService(appId, ServiceTypes.ENCRYPTION, payload);
        }

        protected static BigInteger RequestDecryption(string appId, ByteString payload)
        {
            return RequestService(appId, ServiceTypes.DECRYPTION, payload);
        }

        #endregion

        #region Request Data Storage

        protected static void StoreRequestData(BigInteger requestId, ByteString data)
        {
            Storage.Put(Storage.CurrentContext,
                Helper.Concat(PREFIX_SERVICE_REQUEST_DATA, (ByteString)requestId.ToByteArray()),
                data);
        }

        protected static ByteString GetRequestData(BigInteger requestId)
        {
            return Storage.Get(Storage.CurrentContext,
                Helper.Concat(PREFIX_SERVICE_REQUEST_DATA, (ByteString)requestId.ToByteArray()));
        }

        protected static void DeleteRequestData(BigInteger requestId)
        {
            Storage.Delete(Storage.CurrentContext,
                Helper.Concat(PREFIX_SERVICE_REQUEST_DATA, (ByteString)requestId.ToByteArray()));
        }

        #endregion

        #region Request Metadata Storage

        /// <summary>
        /// Request metadata structure for callback validation.
        /// </summary>
        public struct RequestMeta
        {
            public string ServiceType;
            public ulong Timestamp;
            public bool Processed;
        }

        private static void StoreRequestMeta(BigInteger requestId, string serviceType, ulong timestamp)
        {
            byte[] key = Helper.Concat(PREFIX_SERVICE_REQUEST_META, (ByteString)requestId.ToByteArray());
            RequestMeta meta = new RequestMeta
            {
                ServiceType = serviceType,
                Timestamp = timestamp,
                Processed = false
            };
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(meta));
        }

        private static RequestMeta GetRequestMeta(BigInteger requestId)
        {
            byte[] key = Helper.Concat(PREFIX_SERVICE_REQUEST_META, (ByteString)requestId.ToByteArray());
            ByteString raw = Storage.Get(Storage.CurrentContext, key);
            if (raw == null)
            {
                return new RequestMeta
                {
                    ServiceType = "",
                    Timestamp = 0,
                    Processed = true // Treat missing as processed to reject unknown requests
                };
            }
            return (RequestMeta)StdLib.Deserialize(raw);
        }

        private static void MarkRequestProcessed(BigInteger requestId)
        {
            byte[] key = Helper.Concat(PREFIX_SERVICE_REQUEST_META, (ByteString)requestId.ToByteArray());
            ByteString raw = Storage.Get(Storage.CurrentContext, key);
            if (raw == null) return;

            RequestMeta meta = (RequestMeta)StdLib.Deserialize(raw);
            meta.Processed = true;
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(meta));
        }

        private static void DeleteRequestMeta(BigInteger requestId)
        {
            byte[] key = Helper.Concat(PREFIX_SERVICE_REQUEST_META, (ByteString)requestId.ToByteArray());
            Storage.Delete(Storage.CurrentContext, key);
        }

        #endregion

        #region Callback Validation Helpers

        /// <summary>
        /// Standard callback entry validation with full security checks.
        /// SECURITY: Validates gateway caller, request existence, expiration, and replay protection.
        /// Call this at the start of OnServiceCallback implementation.
        /// </summary>
        protected static ByteString ValidateCallback(BigInteger requestId)
        {
            // 1. Validate caller is Gateway
            ValidateGateway();

            // 2. Get and validate request metadata
            RequestMeta meta = GetRequestMeta(requestId);
            ExecutionEngine.Assert(meta.ServiceType != null && meta.ServiceType.Length > 0, "unknown request");

            // 3. SECURITY: Prevent replay - check if already processed
            ExecutionEngine.Assert(!meta.Processed, "callback already processed");

            // 4. SECURITY: Check request expiration (prevent stale callbacks)
            ulong currentTime = Runtime.Time;
            ulong requestAge = currentTime > meta.Timestamp ? currentTime - meta.Timestamp : 0;
            ExecutionEngine.Assert(requestAge <= MAX_CALLBACK_AGE_MS, "callback expired");

            // 5. Get request data
            ByteString data = GetRequestData(requestId);
            ExecutionEngine.Assert(data != null, "request data missing");

            // 6. Mark as processed BEFORE returning (fail-safe)
            MarkRequestProcessed(requestId);

            return data;
        }

        /// <summary>
        /// Enhanced callback validation with service type verification.
        /// Use when you need to ensure the callback matches the expected service.
        /// </summary>
        protected static ByteString ValidateCallbackWithType(BigInteger requestId, string expectedServiceType)
        {
            // 1. Validate caller is Gateway
            ValidateGateway();

            // 2. Get and validate request metadata
            RequestMeta meta = GetRequestMeta(requestId);
            ExecutionEngine.Assert(meta.ServiceType != null && meta.ServiceType.Length > 0, "unknown request");

            // 3. SECURITY: Verify service type matches
            ExecutionEngine.Assert(meta.ServiceType == expectedServiceType, "service type mismatch");

            // 4. SECURITY: Prevent replay - check if already processed
            ExecutionEngine.Assert(!meta.Processed, "callback already processed");

            // 5. SECURITY: Check request expiration
            ulong currentTime = Runtime.Time;
            ulong requestAge = currentTime > meta.Timestamp ? currentTime - meta.Timestamp : 0;
            ExecutionEngine.Assert(requestAge <= MAX_CALLBACK_AGE_MS, "callback expired");

            // 6. Get request data
            ByteString data = GetRequestData(requestId);
            ExecutionEngine.Assert(data != null, "request data missing");

            // 7. Mark as processed BEFORE returning (fail-safe)
            MarkRequestProcessed(requestId);

            return data;
        }

        /// <summary>
        /// Cleanup after callback processing.
        /// Call this at the end of OnServiceCallback implementation.
        /// </summary>
        protected static void FinalizeCallback(BigInteger requestId)
        {
            DeleteRequestData(requestId);
            DeleteRequestMeta(requestId);
        }

        #endregion
    }
}
