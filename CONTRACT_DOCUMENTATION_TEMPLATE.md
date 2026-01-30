# Smart Contract NatSpec Documentation Template

## File Header Template

```csharp
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
    /// <summary>
    /// [MiniApp Name] - [Brief one-line description]
    /// 
    /// [Detailed description of what the contract does, its purpose,
    /// and key features. 2-4 sentences.]
    /// 
    /// KEY FEATURES:
    /// - Feature 1: Brief description
    /// - Feature 2: Brief description
    /// - Feature 3: Brief description
    /// 
    /// SECURITY CONSIDERATIONS:
    /// - Security point 1
    /// - Security point 2
    /// 
    /// PERMISSIONS:
    /// - List of contract permissions (e.g., GAS token transfers)
    /// </summary>
    [DisplayName("[ContractDisplayName]")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "[Short description for manifest]")]
    [ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]
    public class [ContractName] : SmartContract
    {
```

## Event Delegate Documentation

```csharp
    /// <summary>
    /// Event emitted when [event description].
    /// </summary>
    /// <param name="param1">Description of param1</param>
    /// <param name="param2">Description of param2</param>
    [DisplayName("[EventName]")]
    public delegate void EventNameHandler(Type1 param1, Type2 param2);
```

## Constant Documentation

```csharp
    /// <summary>Description of what this constant represents.</summary>
    private const string APP_ID = "miniapp-[name]";
    
    /// <summary>Minimum bet amount in GAS (0.1 GAS).</summary>
    private const long MIN_BET = 10000000;
    
    /// <summary>Maximum bet amount in GAS (100 GAS).</summary>
    private const long MAX_BET = 10000000000;
    
    /// <summary>Platform fee percentage (3%).</summary>
    private const int FEE_PERCENT = 300; // Basis points (3% = 300/10000)
```

## Storage Prefix Documentation

```csharp
    #region Storage Prefixes
    /// <summary>Prefix for user data storage (0x01).</summary>
    private const byte PREFIX_USER = 0x01;
    
    /// <summary>Prefix for bet records (0x02).</summary>
    private const byte PREFIX_BET = 0x02;
    
    /// <summary>Prefix for statistics (0x03).</summary>
    private const byte PREFIX_STATS = 0x03;
    #endregion
```

## Struct Documentation

```csharp
    /// <summary>
    /// Represents a user's bet in the game.
    /// </summary>
    public struct Bet
    {
        /// <summary>Unique identifier for the bet.</summary>
        public BigInteger Id;
        
        /// <summary>Address of the player who placed the bet.</summary>
        public UInt160 Player;
        
        /// <summary>Bet amount in GAS.</summary>
        public BigInteger Amount;
        
        /// <summary>Player's choice (true = heads, false = tails).</summary>
        public bool Choice;
        
        /// <summary>Timestamp when the bet was placed.</summary>
        public BigInteger Timestamp;
        
        /// <summary>Whether the bet has been resolved.</summary>
        public bool Resolved;
    }
```

## Method Documentation

### Public Methods

```csharp
    /// <summary>
    /// Places a new bet in the game.
    /// </summary>
    /// <param name="choice">Player's choice (true = heads, false = tails).</param>
    /// <returns>The unique bet ID.</returns>
    /// <exception cref="Exception">Thrown when bet amount is invalid or player has insufficient balance.</exception>
    /// <example>
    /// var betId = PlaceBet(true); // Bet on heads
    /// </example>
    public static BigInteger PlaceBet(bool choice)
    {
        // Implementation
    }
```

### Private Methods

```csharp
    /// <summary>
    /// Calculates the payout amount for a winning bet.
    /// </summary>
    /// <param name="betAmount">The original bet amount.</param>
    /// <returns>The total payout including original bet.</returns>
    private static BigInteger CalculatePayout(BigInteger betAmount)
    {
        // Implementation
    }
```

### Verification Methods

```csharp
    /// <summary>
    /// Verifies that the caller is the contract owner.
    /// </summary>
    /// <returns>True if the caller is the owner, false otherwise.</returns>
    private static bool VerifyOwner()
    {
        // Implementation
    }
```

## Complete Example

```csharp
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
    /// <summary>
    /// Event emitted when a player places a new bet.
    /// </summary>
    /// <param name="player">The player's address</param>
    /// <param name="betId">Unique identifier for the bet</param>
    /// <param name="amount">Bet amount in GAS</param>
    /// <param name="choice">Player's choice (true = heads, false = tails)</param>
    public delegate void BetPlacedHandler(UInt160 player, BigInteger betId, BigInteger amount, bool choice);

    /// <summary>
    /// CoinFlip MiniApp - A provably fair coin flip gambling game.
    /// 
    /// Players bet GAS on heads or tails. Winners receive 1.94x their bet.
    /// Uses a provably fair random number generation system.
    /// 
    /// KEY FEATURES:
    /// - Fair 50/50 coin flips with 1.94x payout
    /// - Min bet: 0.1 GAS, Max bet: 100 GAS
    /// - 3% house edge
    /// - Instant payouts
    /// 
    /// SECURITY:
    /// - Min/max bet limits enforced
    /// - Reentrancy protection
    /// - Provably fair with published seeds
    /// 
    /// PERMISSIONS:
    /// - GAS token transfers
    /// </summary>
    [DisplayName("MiniAppCoinFlip")]
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Email", "dev@r3e.network")]
    [ManifestExtra("Version", "1.0.0")]
    [ManifestExtra("Description", "Provably fair coin flip game")]
    [ContractPermission("0xd2a4cff31913016155e38e474a2c06d08be276cf", "*")]
    public class MiniAppCoinFlip : SmartContract
    {
        /// <summary>Unique application identifier.</summary>
        private const string APP_ID = "miniapp-coinflip";
        
        /// <summary>Minimum bet amount in GAS (0.1 GAS).</summary>
        private const long MIN_BET = 10000000;
        
        /// <summary>Maximum bet amount in GAS (100 GAS).</summary>
        private const long MAX_BET = 10000000000;
        
        /// <summary>Payout multiplier (194 = 1.94x).</summary>
        private const int PAYOUT_MULTIPLIER = 194;
        
        /// <summary>Multiplier base (100 = 1.00x).</summary>
        private const int MULTIPLIER_BASE = 100;

        /// <summary>
        /// Places a new bet on the coin flip game.
        /// </summary>
        /// <param name="choice">Player's choice: true for heads, false for tails.</param>
        /// <returns>The unique bet ID for tracking.</returns>
        /// <exception cref="Exception">Thrown when bet amount is outside allowed range.</exception>
        public static BigInteger PlaceBet(bool choice)
        {
            // Implementation
            return 0;
        }
    }
}
```

## Best Practices

1. **Every public member must have documentation**
2. **Use `<summary>` for all types and members**
3. **Document all parameters with `<param>`**
4. **Document return values with `<returns>`**
5. **Document exceptions with `<exception>`**
6. **Include examples for complex methods with `<example>`**
7. **Keep descriptions concise but complete**
8. **Use consistent terminology throughout**
