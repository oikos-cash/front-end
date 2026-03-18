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
- [ ] **Launchpad** — `Launchpad.tsx` → `templates/launchpad.tsx` (placeholder — falta: multi-step wizard, presale creation form, token config)
- [ ] **Presale** — `Presale.tsx` → no creada (progress bar, contribution form, stats, countdown timer)
- [ ] **Dividends** — `Dividends.tsx` → no creada (multi-token dividend display, claim buttons, historical claims table)
- [ ] **Studio** — `Studio.tsx` → no creada (creator dashboard: analytics grid, token list, stats cards)
- [ ] **Swap** — `Swap.tsx` → no creada (DEX swap simplificado: token selector, amount inputs, balance display)
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

## No se migran

- WebRTC pages (4) — Streaming/WebRTC fuera de alcance
- Test pages (9) — Paginas de debug/testing
- TwitterCallback — OAuth callback, no aplica
- Bootstrap — Subscription management, no aplica
- Splash — Canvas attractor animation, no aplica
