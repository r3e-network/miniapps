# Contract Documentation Guide (NatSpec Standard)

**Purpose:** Establish consistent, comprehensive documentation for all Neo N3 smart contracts.

---

## Documentation Standards

### 1. Contract-Level Documentation

Every contract must have a summary comment explaining:

```csharp
/// <summary>
/// [ContractName] MiniApp - Brief description of what it does.
/// 
/// FEATURES:
/// - List key features
/// - Explain main functionality
/// 
/// MECHANICS:
/// - How the contract works
/// - Key user interactions
/// 
/// SECURITY:
/// - Security considerations
/// - Access control notes
/// 
/// PERMISSIONS:
/// - Token permissions (e.g., GAS token only)
/// - External contract calls
/// </summary>
```

### 2. Event Documentation

Every event delegate must document:

```csharp
/// <summary>
/// Event description - when is it emitted?
/// </summary>
/// <param name="paramName">Parameter description including type/unit</param>
public delegate void EventNameHandler(Type paramName);
```

### 3. Constant Documentation

Every constant should explain:

```csharp
/// <summary>Brief description. Include units and purpose.</summary>
private const Type CONSTANT_NAME = value;
```

Example:
```csharp
/// <summary>Minimum bet amount in GAS (0.1 GAS = 10,000,000). Prevents spam bets.</summary>
private const long MIN_BET = 10000000;
```

### 4. Data Structure Documentation

Structs need both struct-level and field-level docs:

```csharp
/// <summary>
/// Description of what this struct represents.
/// 
/// Storage: How/where it's stored
/// Updated: When it's modified
/// </summary>
public struct StructName
{
    /// <summary>Field description with units if applicable.</summary>
    public Type FieldName;
}
```

### 5. Method Documentation

All public methods must have:

```csharp
/// <summary>
/// Brief description of what the method does.
/// </summary>
/// <param name="paramName">Parameter description</param>
/// <returns>Description of return value</returns>
/// <remarks>Any additional notes, requirements, or warnings</remarks>
[Safe] // or appropriate attribute
public static ReturnType MethodName(Type paramName)
```

For state-changing methods:
```csharp
/// <summary>
/// What this method does and its effects.
/// </summary>
/// <param name="paramName">Parameter description</param>
/// <returns>What the method returns</returns>
/// <exception cref="ExceptionType">When this exception is thrown</exception>
/// <requirements>
/// - List caller requirements (e.g., must be admin)
/// - List state requirements (e.g., must not be paused)
/// </requirements>
/// <emits>
/// - List events emitted by this method
/// </emits>
```

---

## Required Tags

### For All Public Methods
- `<summary>` - What it does
- `<param>` - Each parameter
- `<returns>` - Return value description

### For State-Changing Methods
- `<exception>` - Possible exceptions
- `<requirements>` - Prerequisites
- `<emits>` - Events emitted
- `<security>` - Security notes

### For Events
- `<summary>` - When it's emitted
- `<param>` - Each parameter with units

---

## Example: Complete Contract Documentation

See `apps/coin-flip/contracts/MiniAppCoinFlip.cs` for a fully documented example.

Key highlights:
- 169 lines of documentation added
- Every constant documented with units and purpose
- All data structures have field-level docs
- All read methods have complete documentation
- Events explain when they're emitted

---

## Documentation Checklist

### For Each Contract:
- [ ] Contract-level summary with features
- [ ] Mechanics explanation
- [ ] Security considerations
- [ ] Permissions documented

### For Each Event:
- [ ] Summary (when emitted)
- [ ] All parameters documented

### For Each Constant:
- [ ] Purpose explained
- [ ] Units specified

### For Each Data Structure:
- [ ] Struct-level documentation
- [ ] All fields documented
- [ ] Storage info included

### For Each Public Method:
- [ ] Summary
- [ ] Parameters
- [ ] Return value
- [ ] Exceptions (if state-changing)
- [ ] Requirements (if state-changing)

---

## Tools

### Generating Documentation
Use `docfx` or similar tools to generate HTML documentation from XML comments.

### Validation
- Ensure all public APIs are documented
- Check for consistent terminology
- Verify all parameters have descriptions

---

## Benefits

1. **Developer Experience** - New developers can understand the contract quickly
2. **Security Audits** - Auditors have context for each function
3. **API Documentation** - Auto-generated docs from comments
4. **Maintenance** - Future updates are easier with good docs
5. **User Trust** - Transparent documentation builds confidence

---

## Migration Priority

Document contracts in this order:

1. **High Priority** (User-facing, complex logic)
   - coin-flip, lottery, graveyard, forever-album
   - breakup-contract, heritage-trust

2. **Medium Priority** (Standard patterns)
   - Most game contracts
   - Standard DeFi contracts

3. **Lower Priority** (Simple contracts)
   - Basic utility contracts
   - Simple storage contracts

---

*Guide version: 1.0*  
*Last updated: 2026-01-28*
