# Oikos — Migration Tasklist (Front-End Layouts)

> Referencia: `oikos-old/src/pages/` → `oikos/apps/app/`
> Enfoque actual: solo layouts front-end (UI), sin integraciones blockchain.

---

## Pantallas

- [x] **Home / Exchange** — `Exchange.tsx` → `templates/home.tsx` (parcial — falta swap modal, order book)
- [x] **Markets / Showcase** — `Showcase.tsx` → `templates/markets.tsx` (catalogo con infinite scroll)
- [x] **Liquidity** — `Liquidity.tsx` → `templates/liquidity.tsx` (chart + details table)
- [x] **Stake** — `Stake.tsx` → `templates/stake.tsx` (KPI cards, staking form with RHF/Zod, cooldown timer, stake history with infinite scroll)
- [x] **Borrow** — `Borrow.tsx` → `templates/borrow.tsx` (KPI cards, borrow form with RHF/Zod, loan history with infinite scroll)
- [x] **Launchpad** — `Launchpad.tsx` → 4 pages (token/pool/presale/preview) with sidebar layout, Zustand persist store, i18n-driven cards, file upload, deploy mock
- [x] **Presale** — `Presale.tsx` → `templates/presale.tsx` (KPI cards, contribution form with RHF/Zod, progress bar with live countdown, my contribution card)
- [x] **Dividends** — `Dividends.tsx` → `templates/dividends.tsx` (KPI cards, OKS balance card, dividend token list with Lock/Withdraw, claim history with infinite scroll)
- [x] **Studio** — `Studio.tsx` → `templates/studio.tsx` (KPI cards, token list with stats, creator dashboard)
- [x] **Swap** — `Swap.tsx` → `templates/swap.tsx` (universal DEX swap: token selectors, calculated output, exchange rate, price impact, recent swaps)
- [ ] **Migrate** — `Migrate.tsx` → no creada (token migration: version selector, amount input)
- [ ] **Linktree** — `Linktree.tsx` → no creada (link aggregation page con branding) — baja prioridad
- [ ] **Home / Landing** — `Home.tsx` → no creada (landing page con hero section) — baja prioridad

## Organismos

- [x] **Price Chart** — `Exchange.tsx` → `organism/price-chart.tsx`
- [x] **Trades History** — `Exchange.tsx` → `organism/trades-history.tsx`
- [x] **Trade Panel** — `Exchange.tsx` → `organism/trade-panel.tsx`
- [x] **Price Table** — `Exchange.tsx` → `organism/price-table.tsx`
- [x] **Liquidity Chart** — `Liquidity.tsx` → `organism/liquidity-chart.tsx`
- [x] **Liquidity Details** — `Liquidity.tsx` → `organism/liquidity-details.tsx`
- [x] **Wallet Panel** — `WalletSidebar.tsx` → `organism/wallet-panel.tsx`
- [x] **Markets Catalog** — `Showcase.tsx` → `organism/markets-catalog.tsx`
- [x] **Stake Form Panel** — `Stake.tsx` → `organism/stake-form-panel.tsx`
- [x] **Stake History** — `Stake.tsx` → `organism/stake-history.tsx`
- [x] **Borrow Form Panel** — `Borrow.tsx` → `organism/borrow-form-panel.tsx`
- [x] **Loan History** — `Borrow.tsx` → `organism/loan-history.tsx`
- [x] **Launchpad Token Form** — `Launchpad.tsx` → `organism/launchpad-token-form.tsx`
- [x] **Launchpad Pool Form** — `Launchpad.tsx` → `organism/launchpad-pool-form.tsx`
- [x] **Launchpad Presale Form** — `Launchpad.tsx` → `organism/launchpad-presale-form.tsx`
- [x] **Presale Progress** — `Presale.tsx` → `organism/presale-progress.tsx`
- [x] **Presale Contribution Form** — `Presale.tsx` → `organism/presale-contribution-form.tsx`
- [x] **Dividend Token List** — `Dividends.tsx` → `organism/dividend-token-list.tsx`
- [x] **Dividend Claim History** — `Dividends.tsx` → `organism/dividend-claim-history.tsx`
- [x] **Studio Token List** — `Studio.tsx` → `organism/studio-token-list.tsx`
- [x] **Swap Form** — `Swap.tsx` → `organism/swap-form.tsx`

## No se migran

- WebRTC pages (4) — Streaming/WebRTC fuera de alcance
- Test pages (9) — Paginas de debug/testing
- TwitterCallback — OAuth callback, no aplica
- Bootstrap — Subscription management, no aplica
- Splash — Canvas attractor animation, no aplica
