# Oikos — Migration Tasklist (Front-End Layouts)

> Referencia: `oikos-old/src/pages/` → `oikos/apps/app/`
> Enfoque actual: solo layouts front-end (UI), sin integraciones blockchain.

---

## Pantallas

- [x] **Home / Exchange** — `Exchange.tsx` → `templates/home.tsx`
  - [x] Slider de porcentaje de balance (25%, 50%, 75%, 100%) en TradePanel
  - [x] Tabs en TradesHistory: Global / My Trades
  - [x] Filtro de token en TradesHistory
- [x] **Markets / Showcase** — `Showcase.tsx` → `templates/markets.tsx`
  - [x] Filtros avanzados: All / Presale / Graduated
  - [x] Ordenar por: market cap, newest, raised
  - [x] Secciones por categoria: presales activas, tokens graduados
- [x] **Liquidity** — `Liquidity.tsx` → `templates/liquidity.tsx`
  - [x] Selector de vault/token para cambiar entre pools
  - [x] Controles avanzados de curva (Shift/Slide mock — regeneran datos)
- [x] **Stake** — `Stake.tsx` → `templates/stake.tsx`
  - [ ] Active Position card: staked balance, sToken balance, rewards acumulados, cooldown status
  - [ ] Wallet sidebar con balances de tokens en contexto de staking
- [x] **Borrow** — `Borrow.tsx` → `templates/borrow.tsx`
  - [ ] Active Loan card: borrowed amount, collateral, LTV%, dias restantes, interest, countdown
  - [ ] Modal Repay: input de cantidad, simulacion de fees
  - [ ] Modal Roll: extender duracion del prestamo
  - [ ] Modal Add Collateral: agregar colateral con simulacion de LTV
  - [ ] Filtros en Loan History: All / Borrow / Repay / Roll / Add Collateral
- [x] **Launchpad** — 4 pages (token/pool/presale/preview)
  - [ ] Social links form: Twitter, Discord, Website, Telegram
  - [ ] Image crop/editor para logo del token
- [x] **Presale** — `Presale.tsx` → `templates/presale.tsx`
  - [ ] Admin controls: Finalize Presale button (solo si el usuario es deployer)
  - [ ] Referral system: generar codigo, copiar link, compartir
  - [ ] Timeline de estado de la presale
- [x] **Dividends** — `Dividends.tsx` → `templates/dividends.tsx`
  - [ ] Vesting detail modal: entradas individuales, claimed vs unclaimed, schedule
  - [ ] Progreso de vesting por token (barra de progreso)
  - [ ] Historial de claims individual por token
- [x] **Studio** — `Studio.tsx` → `templates/studio.tsx`
  - [ ] Activity feed / Recent activity con timestamps
  - [ ] Creator earnings tracker (rewards acumulados por vault)
  - [ ] Price + 24h Change por token en cards
  - [ ] "View on Exchange" button por token card
- [x] **Swap** — `Swap.tsx` → `templates/swap.tsx`
  - [ ] Token selector avanzado con busqueda y logos
  - [ ] Swap settings panel: slippage tolerance, MEV protection
  - [ ] Routing information (por que DEX se ejecuta el swap)
- [ ] **Home / Landing** — `Home.tsx` → no creada — baja prioridad

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
- [x] **Swap History** — `Swap.tsx` → `organism/swap-history.tsx`

## No se migran

- WebRTC pages (4) — Streaming/WebRTC fuera de alcance
- Test pages (9) — Paginas de debug/testing
- TwitterCallback — OAuth callback, no aplica
- Bootstrap — Subscription management, no aplica
- Splash — Canvas attractor animation, no aplica
- AI features — Generacion de nombres/simbolos/descripciones/logos con AI
- Twitter/social media posting — Integracion directa con redes sociales
