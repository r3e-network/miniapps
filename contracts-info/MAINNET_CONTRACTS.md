# Neo N3 MiniApp Platform - Mainnet Contract Addresses

**Source:** https://github.com/r3e-network/neo-miniapps-platform (main branch)
**Last Updated:** 2026-01-21

## Network Configuration

| Property          | Value                           |
| ----------------- | ------------------------------- |
| **Network**       | Neo N3 Mainnet                  |
| **RPC**           | https://mainnet1.neo.coz.io:443 |
| **Network Magic** | 860833102                       |
| **Explorer**      | https://explorer.onegate.space  |

---

## Platform Contracts (Neo N3 Mainnet)

### Core Platform

| Contract                | Address                                      | Version | Deployed At               | Tx Hash          |
| ----------------------- | -------------------------------------------- | ------- | ------------------------- | ---------------- |
| **PaymentHub**          | `0xc700fa6001a654efcd63e15a3833fbea7baaa3a3` | 2.0.0   | 2026-01-21T02:07:02+00:00 | `0x3601b...5e28` |
| **Governance**          | `0x705615e903d92abf8f6f459086b83f51096aa413` | 1.0.0   | 2026-01-21T02:07:14+00:00 | `0x808c5...8cce` |
| **PriceFeed**           | `0x9e889922d2f64fa0c06a28d179c60fe1af915d27` | 2.0.0   | 2026-01-21T02:07:33+00:00 | `0x76499...9fae` |
| **RandomnessLog**       | `0x66493b8a2dee9f9b74a16cf01e443c3fe7452c25` | 2.0.0   | 2026-01-21T02:07:52+00:00 | `0x340b1...6054` |
| **AppRegistry**         | `0x583cabba8beff13e036230de844c2fb4118ee38c` | 1.0.0   | 2026-01-21T02:08:03+00:00 | `0x9147c...c351` |
| **AutomationAnchor**    | `0x0fd51557facee54178a5d48181dcfa1b61956144` | 2.0.0   | 2026-01-21T02:08:15+00:00 | `0x23699...2c25` |
| **ServiceLayerGateway** | `0x7f73ae3036c1ca57cad0d4e4291788653b0fa7d7` | 1.0.0   | 2026-01-21T02:08:34+00:00 | `0x882f6...0879` |
| **PauseRegistry**       | `0x377ca7c56dea5e2c2fbdc109fe4eabb6ade69a66` | -       | 2026-01-21T02:08:45+00:00 | `0x1cb87...2aaa` |
| **ForeverAlbum**        | `0x5b252bcf01126ed5a6e4c521aa30e50447111084` | -       | 2026-01-21T02:09:04+00:00 | `0x4ddd9...d8df` |

---

## MiniApp Contracts (Neo N3 Mainnet)

### DeFi Apps

| Contract                   | Address                                      | App ID                   | Notes                                |
| -------------------------- | -------------------------------------------- | ------------------------ | ------------------------------------ |
| **MiniAppFlashLoan**       | `0xb5d8fb0dc2319edc4be3104304b4136b925df6e4` | miniapp-flashloan        | Instant borrow and repay             |
| **MiniAppCompoundCapsule** | `0x46852726d7c4a347991606ef1135e61d8112a175` | miniapp-compound-capsule | Auto-compounding time-locked savings |
| **MiniAppSelfLoan**        | `0x942da575b31f39cbb59e64b5813b128739b44c25` | miniapp-self-loan        | Alchemix-style self-repaying loans   |
| **MiniAppHeritageTrust**   | `0xd260b66f646a49c15f572aa827e5eb36f7756563` | miniapp-heritage-trust   | v2.0.0 - bNEO rewards                |
| **MiniAppGuardianPolicy**  | `0x451422cfb5a16e26a12f3222aa04fb669d978229` | miniapp-guardianpolicy   | Policy enforcement                   |

### Gaming Apps

| Contract                 | Address                                      | App ID                 | Notes                          |
| ------------------------ | -------------------------------------------- | ---------------------- | ------------------------------ |
| **MiniAppLottery**       | `0xb3c0ca9950885c5bf4d0556e84bc367473c3475e` | miniapp-lottery        | Provable VRF lottery           |
| **MiniAppCoinFlip**      | `0x0a39f71c274dc944cd20cb49e4a38ce10f3ceea1` | miniapp-coinflip       | 50/50 double-or-nothing        |
| **MiniAppNeoGacha**      | `0xc9af7c9de5b0963e6514b6462b293f0179eb3798` | miniapp-neo-gacha      | v2.0.0 - Blind box marketplace |
| **MiniAppDoomsdayClock** | `0x8f46753fd7123bd276d77ef1100839004b9a3440` | miniapp-doomsday-clock | FOMO3D style - last buyer wins |

### Social Apps

| Contract                     | Address                                      | App ID                     | Notes                              |
| ---------------------------- | -------------------------------------------- | -------------------------- | ---------------------------------- |
| **MiniAppRedEnvelope**       | `0x5f371cc50116bb13d79554d96ccdd6e246cd5d59` | miniapp-redenvelope        | Social GAS red packets             |
| **MiniAppDevTipping**        | `0x1d476b067a180bc54ee4f90c91489ffa123759a4` | miniapp-dev-tipping        | v1.1.0 - EcoBoost                  |
| **MiniAppMasqueradeDAO**     | `0xc5e3e2e481af11dc823ae4ebcd8f791b9ba9b6f9` | miniapp-masqueradedao      | Anonymous masked voting DAO        |
| **MiniAppGovMerc**           | `0xe8f3d8d5784f8570d1f806940bbaa7daff9f52d0` | miniapp-gov-merc           | Governance mercenary - vote rental |
| **MiniAppCouncilGovernance** | `0xc7e50e67589df63302cbea1a6b00beb649ee74d8` | miniapp-council-governance | Council voting                     |
| **MiniAppHallOfFame**        | `0x3c00cbea1c4e502bafae4c6ce7a56237a7d71ded` | miniapp-hall-of-fame       | Vote for Neo legends               |
| **MiniAppBreakupContract**   | `0x7742a80565ef04c0b7487d1679e6efbeb2d0c6a9` | miniapp-breakupcontract    | Relationship dissolution           |
| **MiniAppExFiles**           | `0x9cfc02ad75691521cceb2ec0550e6a227251ad35` | miniapp-exfiles            | Encrypted file sharing             |
| **MiniAppBurnLeague**        | `0xd829b7a8c0d9fa3c67a29c703a277de3f922f173` | miniapp-burn-league        | Burn-to-earn deflationary rewards  |

### NFT & Creative Apps

| Contract                    | Address                                      | App ID                   | Notes                                |
| --------------------------- | -------------------------------------------- | ------------------------ | ------------------------------------ |
| **MiniAppOnChainTarot**     | `0xfb5d6b25c974a301e34c570dd038de8c25f3ae56` | miniapp-onchaintarot     | On-chain tarot readings              |
| **MiniAppGardenOfNeo**      | `0x72aa16fd44305eabe8b85ca397b9bfcdc718dce8` | miniapp-garden-of-neo    | Plants grow based on blockchain data |
| **MiniAppMillionPieceMap**  | `0xdae609b67e51634a95badea92bae585459fe83a4` | miniapp-millionpiecemap  | Collaborative pixel map ownership    |
| **MiniAppGraveyard**        | `0x0195e668f7a2a41ef4a0200c5b9c2cc1c02e24d1` | miniapp-graveyard        | Digital graveyard - paid deletion    |
| **MiniAppUnbreakableVault** | `0x198bfcccabb9b73181f23b5af22fe73afdc6c3aa` | miniapp-unbreakablevault | Time-locked vault with conditions    |
| **MiniAppTimeCapsule**      | `0xd853a4ac293ff96e7f70f774c2155d846f91a989` | miniapp-time-capsule     | Encrypted time-locked messages       |
| **MiniAppForeverAlbum**     | `0x254421a4aeb4e731f89182776b7bc6042c40c797` | miniapp-forever-album    | On-chain encrypted photo album       |
| **MiniAppMemorialShrine**   | `0xee7a548b71c69364fcb0e45a63a40f141b938e42` | miniapp-memorial-shrine  | On-chain memorial                    |

### Utility Apps

| Contract                | Address                                      | App ID               | Notes                            |
| ----------------------- | -------------------------------------------- | -------------------- | -------------------------------- |
| **MiniAppDailyCheckin** | `0x908867b23ab551a598723ceeaaedd70c54e10c76` | miniapp-dailycheckin | Daily check-in rewards           |
| **MiniAppGasSponsor**   | `0x80ea8435a88334b9b80077220097d88c440615f1` | miniapp-gas-sponsor  | Sponsor GAS fees for other users |
| **MiniAppTurtleMatch**  | `0xac10b90f40c015da61c71e30533309760b75fec7` | miniapp-turtle-match | Match-3 puzzle game              |

### External/Third-Party Contracts

| Contract                 | Address                                      | App ID                 | Notes                |
| ------------------------ | -------------------------------------------- | ---------------------- | -------------------- |
| **MiniAppCandidateVote** | `0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5` | miniapp-candidate-vote | Native NEO contract  |
| **MiniAppNeoSwap**       | `0xf970f4ccecd765b63732b821775dc38c25d74f23` | miniapp-neo-swap       | Flamingo DEX router  |
| **MiniAppNeoburger**     | `0x48c40d4666f93408be1bef038b6722404d9a4c2a` | miniapp-neoburger      | NeoBurger bNEO token |
| **NameService**          | `0x50ac1c37690cc2cfc594472833cf57505d5f46de` | miniapp-neo-ns         | Neo Name Service     |

---

## Summary

| Category           | Count  |
| ------------------ | ------ |
| Platform Contracts | 9      |
| MiniApp Contracts  | 35     |
| External Contracts | 4      |
| **Total**          | **48** |

---

## Deployer Information

| Property         | Value                                |
| ---------------- | ------------------------------------ |
| Deployer Address | `NhWxcoEc9qtmnjsTLF1fVF6myJ5MZZhSMK` |

---

## Source Repository

- **GitHub:** https://github.com/r3e-network/neo-miniapps-platform
- **Branch:** main
- **Config Path:** deploy/config/mainnet_contracts.json
