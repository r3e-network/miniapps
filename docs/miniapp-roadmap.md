# MiniApp Roadmap (Sequential)

This is the working order for new miniapps to add next. Each entry lists whether
it needs an on-chain contract or can be front-end only.

## Order
1. stream-vault (contract) - implemented, deployment pending (payroll/subscription vaults with time-based releases).
2. milestone-escrow (contract) - implemented, deployment pending (milestone approval and staged releases).
3. event-ticket-pass (contract) - implemented, deployment pending (NEP-11 tickets with QR check-in).
4. soulbound-certificate (contract) - implemented, deployment pending (non-transferable badges for courses/events).
5. quadratic-funding (contract + off-chain indexer) - implemented, deployment pending (public grants with QF matching).
6. wallet-health (front-end only) - implemented, deployment pending (wallet readiness, backup, and risk checklist).

## Entry Requirements (All New MiniApps)
- Docs page with real usage steps, constraints, and security notes.
- i18n: English + Chinese strings complete.
- Light/Dark theme checked; no low-contrast text.
- Banner and logo use PNG assets.
- Left panel layout: banner, logo+name, status, description.
- Chain guard for Neo-only operations.
- Contract addresses support testnet + mainnet (if contract-based).
