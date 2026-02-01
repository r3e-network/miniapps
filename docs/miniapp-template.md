# MiniApp Standard Template

Use this checklist when creating a new miniapp so it matches platform UX, i18n,
and contract requirements.

## Required Files
- `apps/<app>/neo-manifest.json` (app_id, names, tags, permissions, contracts, icon/banner)
- `apps/<app>/src/manifest.json` (UniApp metadata)
- `apps/<app>/src/pages/index/index.vue`
- `apps/<app>/src/pages/docs/index.vue`
- `apps/<app>/src/messages.ts` or `src/locale/messages.ts`
- `apps/<app>/src/static/logo.png`
- `apps/<app>/src/static/banner.png`

## Layout Rules
- Left panel order: banner, logo + name, status, description.
- Docs tab/page always available and populated (real steps + constraints).
- Mobile-first spacing; verify light + dark themes for contrast.

## i18n
- English + Chinese for all visible strings.
- Keep error messages short and actionable.

## Chain Guard (Neo-only)
- Use `useChainValidation()` to gate contract actions when you need mainnet/testnet checks.
- For reads in background, use the silent option when appropriate.

## Amount Handling
- Use `toFixedDecimals` / `toFixed8` for on-chain amounts.
- Avoid float math for transfer amounts.

## Contract & Registry
- Put chain-specific addresses in `apps/<app>/neo-manifest.json`:
  - `contracts.neo-n3-testnet.address`
  - `contracts.neo-n3-mainnet.address`
- Ensure `icon` and `banner` are PNGs and point to `/miniapps/<app>/static/...`.

## QA Gate
- Docs complete, theme checked, i18n checked.
- Logo/banner display on left panel.
- Contract calls fail fast on wrong chain.
