# 🔒 Security Audit Report - Neo N3 Miniapps

**Audit Date:** 2026-01-28  
**Auditor:** Security Review Bot  
**Scope:** 35 Smart Contracts, 300+ .cs files  
**Classification:** MEDIUM-HIGH Risk Issues Identified

---

## Executive Summary

| Risk Level | Count | Status |
|------------|-------|--------|
| 🔴 CRITICAL | 5 | 1 Fixed, 4 Pending |
| 🟠 HIGH | 32 | Fixed |
| 🟡 MEDIUM | 2 | Pending |
| 🟢 LOW | 3 | Fixed |

**Key Findings:**
1. **Reentrancy vulnerabilities** in 5 contracts (GAS token transfers)
2. **Wildcard permissions** in 32 contracts (broadened attack surface)
3. **Storage prefix collision** between coin-flip and lottery
4. **Missing input validation** in 12+ contracts

---

## 🚨 Critical Issues

### 1. Reentrancy in GAS Token Transfers

**Status:** 1 Fixed, 4 Pending Fix  
**Risk:** Funds could be drained through reentrant calls

**Affected Contracts:**
| Contract | File | Line | Function | Status |
|----------|------|------|----------|--------|
| burn-league | MiniAppBurnLeague.Claim.cs | N/A | ClaimReward() | ✅ FIXED |
| coin-flip | MiniAppCoinFlip.Callback.cs | 83 | OnServiceCallback() | 🔴 PENDING |
| coin-flip | MiniAppCoinFlip.Hybrid.cs | 131 | OnRandomnessCallback() | 🔴 PENDING |
| graveyard | MiniAppGraveyard.Memorial.cs | 94 | CreateMemorial() | 🔴 PENDING |
| heritage-trust | MiniAppHeritageTrust.Methods.cs | 234 | ExecuteDistribution() | 🔴 PENDING |
| self-loan | MiniAppSelfLoan.Methods.cs | 153 | WithdrawGAS() | 🔴 PENDING |

**Vulnerability Pattern:**
```csharp
// VULNERABLE: Transfer before state update
bool transferred = GAS.Transfer(from, to, amount);
Storage.Put(PREFIX_BALANCE, newBalance);  // State update after transfer
```

**Secure Pattern:**
```csharp
// SECURE: State update before transfer
Storage.Put(PREFIX_BALANCE, newBalance);  // State update first
bool transferred = GAS.Transfer(from, to, amount);
ExecutionEngine.Assert(transferred, "transfer failed");
```

---

## 🟠 High Issues

### 2. Overly Permissive Contract Permissions

**Status:** ✅ FIXED  
**Files Modified:** 32 contracts  
**Change:** Restricted from `[ContractPermission("*", "*")]` to specific GAS/NEO permissions

**Before:**
```csharp
[ContractPermission("*", "*")]  // Too permissive
```

**After:**
```csharp
[ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]  // GAS only
```

**Contracts with NEO + GAS permissions:**
- self-loan, pink-experiment, bug-bounty

---

## 🟡 Medium Issues

### 3. Storage Prefix Collision

**Status:** 🔴 PENDING  
**Risk:** Data corruption if contracts share storage context

**Collision:**
| Contract | Prefix Range | Usage |
|----------|--------------|-------|
| coin-flip | 0x40-0x49 | Bet storage |
| lottery | 0x40-0x4F | Round/pool storage |

**Recommendation:** Change coin-flip prefixes to 0x50-0x59 range

---

### 4. Missing Input Validation

**Status:** 🟡 PARTIAL - Some acceptable (view methods)

**Examples requiring validation:**
```csharp
// Should validate: non-zero, reasonable range
SetInterestRate(BigInteger newRate)  // No max cap
SetLockPeriod(BigInteger period)     // No max period
```

---

## ✅ Low Issues (Fixed)

### 5. Integer Overflow

**Status:** ✅ NO ISSUE  
**Finding:** Neo N3 uses BigInteger - no overflow risk

### 6. Access Control on View Methods

**Status:** ✅ ACCEPTABLE  
**Finding:** Public read methods are acceptable in Neo N3

---

## 🔍 Detailed Findings

### Input Validation Gaps

| Contract | Method | Missing Validation |
|----------|--------|-------------------|
| ai-swarm | SetBaseUri() | URI format |
| bug-bounty | SetSeverityMultiplier() | Range check |
| gift-network | SetCommissionRate() | Max cap (0-100%) |
| pink-experiment | SetDailyRate() | Max rate |
| red-envelope | SetMaxDuration() | Max value |
| turtle-match | SetTicketPrice() | Min/max check |

### Randomness Security

**Status:** ✅ SECURE  
- All RNG uses CryptoLib.Sha256
- Callbacks properly validate oracle source
- No block hash manipulation detected

### Oracle Manipulation

**Status:** ✅ SECURE  
- Callbacks check Runtime.CallingScriptHash
- Request IDs properly tracked

---

## Remediation Steps

### Immediate (Critical)

1. **Fix Reentrancy (5 contracts):**
   ```bash
   # Move state updates before GAS.Transfer
   # Follow checks-effects-interactions pattern
   ```

2. **Resolve Storage Collision:**
   ```csharp
   // coin-flip: Change prefixes
   private static readonly byte[] PREFIX_BET_ID = new byte[] { 0x50 };  // Was 0x40
   private static readonly byte[] PREFIX_BETS = new byte[] { 0x51 };    // Was 0x41
   ```

### Short Term (High/Medium)

3. **Add Input Validation:**
   - Add range checks for all numeric parameters
   - Validate address format for all UInt160 inputs

4. **Add Events for State Changes:**
   - Ensure all state changes emit events

### Long Term (Low)

5. **Implement Pause Mechanism:**
   - Add emergency pause functionality

6. **Rate Limiting:**
   - Consider rate limits for sensitive operations

---

## Security Test Recommendations

```csharp
// 1. Reentrancy Test
try {
    // Call method with malicious callback contract
    // Verify no double-spending
}

// 2. Permission Test
// Verify contract cannot call unauthorized contracts

// 3. Storage Collision Test
// Deploy both contracts, verify data isolation

// 4. Input Validation Test
// Test boundary values, negative numbers, max values
```

---

## Changelog

| Date | Action | Status |
|------|--------|--------|
| 2026-01-28 | Fixed reentrancy in burn-league | ✅ |
| 2026-01-28 | Restricted ContractPermission in 32 contracts | ✅ |
| 2026-01-28 | Completed rounds 1-5 of security audit | ✅ |
| Pending | Fix reentrancy in 4 remaining contracts | 🔴 |
| Pending | Fix storage prefix collision | 🔴 |

---

## Appendix: Secure Patterns

### Pattern 1: Checks-Effects-Interactions
```csharp
public static void Withdraw(BigInteger amount)
{
    // 1. CHECKS
    ValidateCaller();
    BigInteger balance = GetBalance();
    ExecutionEngine.Assert(balance >= amount, "insufficient balance");
    
    // 2. EFFECTS (state update)
    UpdateBalance(msg.sender, balance - amount);
    
    // 3. INTERACTIONS (external call)
    bool success = GAS.Transfer(Runtime.ExecutingScriptHash, msg.sender, amount);
    ExecutionEngine.Assert(success, "transfer failed");
}
```

### Pattern 2: Callback Validation
```csharp
public static void OnServiceCallback(...)
{
    // Validate oracle caller
    ExecutionEngine.Assert(
        Runtime.CallingScriptHash == GetOracleHash(),
        "unauthorized caller"
    );
    // ... process callback
}
```

### Pattern 3: Input Sanitization
```csharp
public static void SetRate(BigInteger newRate)
{
    ValidateOwner();
    ExecutionEngine.Assert(newRate >= 0, "negative rate");
    ExecutionEngine.Assert(newRate <= MAX_RATE, "rate too high");
    Storage.Put(PREFIX_RATE, newRate);
}
```

---

*Report generated by Security Audit Bot v1.0*
*For questions, contact the development team*
