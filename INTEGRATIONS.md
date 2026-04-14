# Oikos - Plan de Integraciones

> Hoja de ruta pagina por pagina para reemplazar datos mock con conexiones reales a API/blockchain.
> Todas las integraciones usan como referencia el proyecto antiguo (`oikos-old`).

### Estrategia de fetching de datos

| Prioridad | Estrategia | Cuando usar |
|-----------|-----------|-------------|
| 1ra | **SSR** (Server Components + `fetch` con cache) | Datos que no dependen del usuario: listas de tokens, metadata, vaults, stats, historial publico. Se renderizan en el servidor, llegan al cliente como HTML. |
| 2da | **SWR** (client) | Datos que dependen del usuario conectado (balances, posiciones, allowances) o que necesitan revalidacion frecuente en el cliente. |
| 3ra | **WebSocket** (client) | Datos en tiempo real: precios, trades, eventos de blockchain. |
| 4ta | **Blockchain read** (client) | Lecturas directas a contratos que dependen de la wallet conectada (claimable, staked, cooldown). |
| 5ta | **Blockchain write** (client) | Transacciones: swap, stake, claim, deploy. Siempre desde el cliente con wallet. |

> **Regla:** Si el dato NO depende de la wallet del usuario, va por SSR. Si depende de la wallet o necesita actualizacion en tiempo real, va por SWR/WS en el cliente.

---

## Prerequisitos (Infraestructura Global)

Antes de integrar cualquier pagina, estas piezas fundamentales deben estar en su lugar:

### P1 - Fetchers del servidor + Cliente API + SWR
- [x] Crear fetchers del lado del servidor en `utils/fetcher.ts` usando `fetch` nativo de Next.js con opciones de cache (`{ next: { revalidate: N } }`) para Server Components. Crear tambien un cliente SWR para componentes del lado del cliente que necesiten datos dependientes del usuario. Configurar `SWRConfig` provider con opciones por defecto (dedupe, error retry).
- **Ref vieja:** `config.ts` (URLs por entorno), `vaultApiService.ts` (patrones de fetch)
- **Tipo:** Server fetch + Cliente SWR

**Como testear:**
1. Ir a cualquier pagina con datos publicos (ej: Markets) → ver "View Source" en el navegador → los datos deben estar en el HTML (SSR funcionando).
2. Abrir DevTools → Network → NO deben verse peticiones XHR/fetch para datos publicos en la carga inicial (ya vienen del servidor).
3. Los datos dependientes de wallet (balances, posiciones) SI deben verse como peticiones del cliente.
4. Cambiar de tab y volver → las peticiones SWR deben re-validar (revalidateOnFocus).
5. Hacer dos llamadas SWR al mismo endpoint simultaneamente → solo debe salir 1 request (dedupe).
6. Desconectar el backend → verificar que SWR hace retry automatico y la UI no se rompe.

---

### P2 - Integracion de Wallet (Wagmi + RainbowKit)
- [x] Reemplazar el mock de `stores/wallet.ts` con conexion real de wallet via Wagmi v2 + RainbowKit. Soportar BSC Testnet/Mainnet. Exponer hook `useWallet()` con address, balances, chain y estado de conexion.
- **Ref vieja:** `NetworkContext.tsx`, config de wagmi en `main.tsx`
- **Tipo:** Blockchain / wallet provider

**Como testear:**
1. Click en "Conectar Wallet" → debe abrir el modal de RainbowKit con MetaMask, WalletConnect, etc.
2. Conectar MetaMask → la UI debe mostrar la address truncada y el balance de BNB.
3. Verificar que el header/sidebar refleja el estado conectado.
4. Cambiar de red en MetaMask a una no soportada → debe aparecer aviso de red incorrecta.
5. Cambiar a BSC Testnet → la app debe detectar la red y actualizar la UI.
6. Desconectar desde MetaMask → la UI debe volver al estado desconectado.
7. Recargar la pagina con wallet ya conectada → debe reconectarse automaticamente.

---

### P3 - Servicio WebSocket
- [x] Crear un manager de WebSocket para feeds de precio en tiempo real, eventos de trades y eventos de blockchain. Patron singleton con auto-reconexion (5 intentos). Usado por Exchange, Liquidity y Studio.
- **Ref vieja:** `websocketService.ts`, `priceWebSocketService.ts`, `trollboxConnection.ts`
- **Tipo:** Cliente WebSocket

**Como testear:**
1. Abrir DevTools → Network → WS. Ir a la pagina de Exchange.
2. Verificar que se abre UNA sola conexion WebSocket (singleton).
3. Ver que llegan mensajes de precio en la consola o en la tab WS de DevTools.
4. Apagar el servidor WS → verificar en consola que intenta reconectarse (hasta 5 veces).
5. Levantar el servidor WS de nuevo → la conexion debe restaurarse sin recargar la pagina.
6. Navegar entre paginas (Exchange → Markets → Exchange) → no debe crear conexiones nuevas.

---

### P4 - Servicio Multicall
- [x] Lecturas RPC en batch usando contrato Multicall3. Usado para obtener multiples balances de tokens, allowances y estado de contratos en una sola llamada.
- **Ref vieja:** `multicallService.ts`, `rpcDeduplicationService.ts`
- **Tipo:** Blockchain / optimizacion RPC

**Como testear:**
1. Conectar wallet y navegar a Markets o Swap.
2. Abrir DevTools → Network → filtrar por RPC calls (fetch a nodo BSC).
3. Verificar que los balances de multiples tokens se obtienen en 1-2 llamadas RPC (no 1 por token).
4. Comparar los balances mostrados con los de MetaMask → deben coincidir.
5. Si tienes 10 tokens, no deben aparecer 10 calls separadas a `eth_call`.

---

### P5 - Store de Precio BNB
- [x] Precio global BNB/USD via lectura de `slot0` del pool Uniswap V3, cacheado 5 min. Usado en casi todas las paginas para conversiones a USD.
- **Ref vieja:** `BnbPriceContext.tsx`
- **Tipo:** Lectura blockchain + cache SWR

**Como testear:**
1. Abrir cualquier pagina que muestre valores en USD.
2. Abrir DevTools → Network → buscar la call RPC de `slot0`.
3. El precio BNB debe mostrarse en la UI (ej: en KPI cards, balances).
4. Navegar a otra pagina → NO debe hacer otra call RPC (cache de 5 min).
5. Esperar 5 minutos → la siguiente navegacion si debe refrescar el precio.
6. Comparar el precio mostrado con CoinGecko/CMC → debe ser similar (diferencia < 1%).

---

## Integraciones por Pagina

---

### 1. Markets (Showcase)

**Ruta:** `/[locale]/markets`
**Archivo viejo:** `Showcase.tsx`
**Prioridad:** ALTA - Punto de entrada para que los usuarios descubran tokens

**Contexto de negocio:**
Markets es el hub de descubrimiento donde los usuarios navegan todos los tokens/vaults disponibles. Muestra precio, volumen, liquidez y metricas de salud de cada token. Los usuarios hacen click para ir a Exchange, Liquidity, Stake o Presale. Sin datos reales aqui, toda la app se siente como un demo.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 1.1 | [x] | Obtener todos los vaults desde API | **SSR** (`fetch` + `revalidate: 60`) | `vaultApiService.ts` → `GET /vaults` |
| 1.2 | [x] | Obtener metadata de tokens (nombre, simbolo, logo, descripcion) | **SSR** (`fetch` + `revalidate: 300`) | `tokenApi.ts` → `GET /tokens` |
| 1.3 | [x] | Precio en tiempo real por token | **WS** (client) | `priceWebSocketService.ts` |
| 1.4 | [x] | Balances de tokens para wallet conectada (multicall) | **SWR** (client, depende de wallet) | `useMulticallBalances.ts` |
| 1.5 | [x] | Precio BNB para conversion a USD | **SWR** (client, cache 5min) | `BnbPriceContext.tsx` |

**Reemplaza mock:** `generateMockMarketTokens()`

**Como testear:**
1. Ir a `/en/markets` → ver "View Source" → los tokens deben estar en el HTML (SSR).
2. No deben verse requests XHR para la lista de tokens en la carga inicial.
3. Los nombres, simbolos y logos deben corresponder a tokens reales desplegados.
4. Observar la columna de precio → debe actualizarse en tiempo real sin recargar (WS).
5. Conectar wallet → debe aparecer una columna o indicador con tu balance de cada token (SWR).
6. Los valores en USD deben ser coherentes (precio * cantidad = valor mostrado).
7. Usar el buscador/filtros → debe filtrar sobre datos reales.
8. Click en un token → debe navegar a la pagina correcta (Exchange/Liquidity).
9. Recargar la pagina → los datos deben cargar por SSR (no quedarse vacios).

---

### 2. Exchange (Home / Trade)

**Ruta:** `/[locale]/` (home)
**Archivo viejo:** `Exchange.tsx`
**Prioridad:** ALTA - Interfaz principal de trading

**Contexto de negocio:**
El Exchange es el corazon del protocolo. Los usuarios seleccionan un par de tokens, ven graficos OHLC en tiempo real, observan trades en vivo y ejecutan swaps. El impacto de precio y slippage se calculan en tiempo real. El panel de trade necesita estado preciso del pool para evitar transacciones fallidas. Esta pagina genera la mayoria del volumen del protocolo.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 2.1 | [x] | Datos del vault por slug de URL | **SSR** (`fetch` + `revalidate: 60`) | `useVaultFromUrl.ts` + `vaultApiService.ts` |
| 2.2 | [x] | Datos OHLC de precio en tiempo real | **WS** (client) | `usePriceWebSocket.ts` (canal: `ohlc`) |
| 2.3 | [x] | Stream de trades en tiempo real | **WS** (client) | `usePriceWebSocket.ts` + `websocketService.ts` |
| 2.4 | [x] | Stats 24h (volumen, maximo, minimo, cambio) | **WS** (client) | `usePriceWebSocket.ts` (canal: `stats`) |
| 2.5 | [x] | Simulacion de trade (impacto de precio, slippage, output) | **Blockchain read** (client, bajo demanda) | `tradeSimulation.ts` + Quoter V2 |
| 2.6 | [x] | Ejecutar transaccion de swap | **Blockchain write** (client) | `useContractWriteWithGas.ts` |
| 2.7 | [x] | Verificar allowance de token + aprobar | **SWR** (client, depende de wallet) | `useAllowance.ts` |
| 2.8 | [x] | Balances de tokens del usuario | **SWR** (client, depende de wallet) | `useMulticallBalances.ts` |
| 2.9 | [x] | Tabla de precios (top tokens por volumen) | **SSR** (`fetch` + `revalidate: 60`) | `tokenApi.ts` |

**Reemplaza mocks:** `generateMockOHLCV()`, `generateMockPriceTableTokens()`, calculos mock del panel de trade

**Como testear:**
1. Ir a `/en/` → ver "View Source" → los datos del vault y la tabla de precios deben estar en el HTML.
2. El grafico OHLC debe cargar con velas reales del pool activo (WS, lado del cliente).
3. Esperar unos segundos → deben aparecer nuevas velas o actualizaciones en tiempo real.
4. Cambiar el periodo (1h, 6h, 1d, 1w) → el grafico debe recargar con datos del intervalo.
5. La tabla de trades recientes debe mostrar swaps reales con txHash, address, montos.
6. Los KPIs de 24h (volumen, high, low, cambio %) deben reflejar datos reales del WS.
7. Conectar wallet → el panel de trade debe mostrar tu balance real del token (SWR).
8. Ingresar un monto en el trade panel → debe calcular output, price impact y slippage reales (Quoter V2).
9. Si no tienes allowance → debe aparecer boton "Aprobar" antes de "Swap".
10. Ejecutar un swap en testnet → MetaMask debe abrir, confirmar tx, y la UI debe actualizar balances.
11. La tabla de precios lateral debe mostrar tokens reales ordenados por volumen (SSR).

---

### 3. Liquidity

**Ruta:** `/[locale]/liquidity/[token]`
**Archivo viejo:** `Liquidity.tsx`
**Prioridad:** ALTA - Funcionalidad DeFi clave

**Contexto de negocio:**
Los proveedores de liquidez depositan tokens en pools de liquidez concentrada (estilo V3 con zonas Floor/Anchor/Discovery). Cada zona tiene diferentes perfiles de riesgo/recompensa. Los usuarios necesitan ver el estado real del pool (rangos de ticks, TVL por zona, sus posiciones, fees sin reclamar) para tomar decisiones informadas. Datos incorrectos significan capital mal asignado.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 3.1 | [x] | Datos del vault/pool por token | **SSR** (`fetch` + `revalidate: 60`) | `useVaultFromUrl.ts` + `vaultApiService.ts` |
| 3.2 | [x] | Datos de ticks del pool (tick actual, distribucion de liquidez) | **SSR** (server-side RPC via API route o fetch directo) | Pool `slot0()`, `liquidity()` |
| 3.3 | [x] | Posiciones LP del usuario (tokenId, tickLower, tickUpper, liquidity) | **SWR** (client, depende de wallet) | NonfungiblePositionManager |
| 3.4 | [x] | Fees sin reclamar por posicion | **SWR** (client, depende de wallet) | Simulacion de `collect()` |
| 3.5 | [x] | Transaccion de agregar liquidez | **Blockchain write** (client) | `useContractWriteWithGas.ts` |
| 3.6 | [x] | Transaccion de remover liquidez | **Blockchain write** (client) | `useContractWriteWithGas.ts` |
| 3.7 | [x] | Transaccion de cobrar fees | **Blockchain write** (client) | `useContractWriteWithGas.ts` |
| 3.8 | [x] | Actualizaciones de precio en tiempo real (tick actual) | **WS** (client) | `priceWebSocketService.ts` |
| 3.9 | [x] | Precio BNB para valores en USD | **SWR** (client, cache 5min) | `BnbPriceContext.tsx` |

**Reemplaza mock:** `generateMockLiquidity()`

**Como testear:**
1. Ir a `/en/liquidity/TOKEN` → ver "View Source" → datos del vault y ticks deben estar en el HTML.
2. El grafico de distribucion de liquidez debe reflejar los ticks reales de la blockchain.
3. La linea del precio actual debe coincidir con el tick real del pool.
4. Conectar wallet → si tienes posiciones LP, deben aparecer listadas con sus rangos (SWR).
5. Cada posicion debe mostrar fees acumuladas sin reclamar (verificar vs contrato).
6. Click en "Agregar liquidez" → seleccionar zona, ingresar monto → MetaMask debe abrir.
7. Confirmar tx en testnet → la nueva posicion debe aparecer en la lista.
8. Click en "Remover" en una posicion → MetaMask debe abrir, confirmar, y la posicion desaparece.
9. Click en "Cobrar fees" → tx confirmada, el monto de fees debe bajar a 0.
10. El precio debe actualizarse en tiempo real via WS (observar la linea de precio moverse).

---

### 4. Borrow

**Ruta:** `/[locale]/borrow/[token]`
**Archivo viejo:** `Borrow.tsx`
**Prioridad:** MEDIA - Funcionalidad de prestamos

**Contexto de negocio:**
Los usuarios piden prestado usando sus posiciones LP como colateral. El sistema calcula Valor de Margen Inicial (IMV), Loan-to-Value (LTV), tasas de interes y umbrales de liquidacion. Datos precisos en tiempo real son criticos porque si el LTV excede el umbral, la posicion se liquida. Los usuarios tambien necesitan ver historial de prestamos y gestionar prestamos activos (pagar, renovar, agregar colateral).

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 4.1 | [x] | Datos del vault para el token | **SSR** (`fetch` + `revalidate: 60`) | `vaultApiService.ts` |
| 4.2 | [x] | Prestamos activos del usuario | **SWR** (client, depende de wallet) | `loanService.ts` → `GET /loans/by-user/{address}` |
| 4.3 | [x] | Historial de prestamos del vault | **SSR** (`fetch` + `revalidate: 30`) | `loanService.ts` → `GET /loans/by-vault/{address}` |
| 4.4 | [x] | Eventos de prestamos en tiempo real | **WS** (client) | `loanService.ts` (WebSocket) |
| 4.5 | [x] | Valor de posicion LP (para calculo de colateral) | **SWR** (client, depende de wallet) | Position NFT + tick math |
| 4.6 | [x] | Ejecutar transaccion de prestamo | **Blockchain write** (client) | `hooks/use-lending.ts` → `borrow()` via ExtVault ABI |
| 4.7 | [x] | Transaccion de pago de prestamo | **Blockchain write** (client) | `hooks/use-lending.ts` → `payback()` via ExtVault ABI |
| 4.8 | [x] | Transaccion de renovacion de prestamo | **Blockchain write** (client) | `hooks/use-lending.ts` → `roll()` via ExtVault ABI |
| 4.9 | [x] | Cotizaciones de hedge (opciones para proteccion) | **SWR** (client, bajo demanda) | `hedgeService.ts` → `POST /api/hedge/quote` |
| 4.10 | [x] | Precio BNB | **SWR** (client, cache 5min) | `BnbPriceContext.tsx` |

**Reemplaza mocks:** `generateMockBorrowData()`, `generateMockActiveLoan()`, `generateMockLoanHistory()`

**Como testear:**
1. Ir a `/en/borrow/TOKEN` → ver "View Source" → datos del vault e historial publico deben estar en el HTML.
2. Los KPIs (tasa de interes, LTV max, liquidation threshold) deben ser reales (SSR).
3. Conectar wallet → debe mostrar tus posiciones LP disponibles como colateral (SWR).
4. Seleccionar una posicion LP → el valor del colateral debe calcularse desde la blockchain.
5. Ingresar monto a pedir prestado → el LTV debe calcularse en tiempo real.
6. Si el LTV supera el umbral, el boton de borrow debe deshabilitarse con warning.
7. Ejecutar borrow en testnet → MetaMask abre, confirmar tx, el prestamo aparece en "Activos".
8. La seccion de prestamos activos debe mostrar datos reales (monto, interes, vencimiento).
9. Click "Pagar" → ingresar monto, confirmar tx → el prestamo debe actualizarse o cerrarse.
10. Click "Renovar" → confirmar tx → la fecha de vencimiento debe extenderse.
11. El historial debe mostrar eventos reales (Borrow, Payback, Roll) con timestamps.
12. Si otro usuario hace un borrow → debe aparecer en tiempo real via WS.

---

### 5. Stake

**Ruta:** `/[locale]/stake/[token]`
**Archivo viejo:** `Stake.tsx`
**Prioridad:** MEDIA - Funcionalidad de staking

**Contexto de negocio:**
Los usuarios hacen stake de tokens para ganar recompensas (modelo sToken). Hay un periodo de cooldown antes de hacer unstake. La pagina muestra APR, total en stake, posicion del usuario y actividad historica. APR y timers de cooldown precisos son esenciales para la confianza del usuario. El staking es un mecanismo clave para la acumulacion de valor del token del protocolo.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 5.1 | [x] | Datos del vault para el token | **SSR** (`fetch` + `revalidate: 60`) | `fetchVaultByToken()` en page.tsx |
| 5.2 | [x] | Estado del contrato de staking (totalStaked, rewardRate, cooldown) | **Blockchain read** (client, wagmi) | `hooks/use-staking.ts` → `totalStaked()`, `totalRewards()`, `lockInEpochs()` |
| 5.3 | [x] | Posicion de staking del usuario (staked, sToken balance, rewards, cooldownEnd) | **Blockchain read** (client, wagmi) | `hooks/use-staking.ts` → `stakedBalance()`, `balanceOf()`, `lastOperationTimestamp()` |
| 5.4 | [x] | Transaccion de stake | **Blockchain write** (client) | `hooks/use-staking.ts` → `stake()` via Staking ABI |
| 5.5 | [x] | Transaccion de unstake (solicitar cooldown) | **Blockchain write** (client) | `hooks/use-staking.ts` → `unstake()` via Staking ABI |
| 5.6 | [x] | Transaccion de reclamar recompensas | **Blockchain write** (client) | Unstake devuelve rewards (integrado en `unstake()`) |
| 5.7 | [ ] | Historial de eventos de staking | **SSR** (`fetch` + `revalidate: 30`) | **No existe endpoint API** — requiere indexador de eventos Staked/Unstaked |
| 5.8 | [x] | Allowance de token + aprobar | **Blockchain read+write** (client, wagmi) | `hooks/use-staking.ts` → `approve()` + `needsApproval` |

**Reemplaza mocks:** `generateMockStakeData()`, `generateMockStakeHistory()`

**Como testear:**
1. Ir a `/en/stake/TOKEN` → ver "View Source" → KPIs publicos (APR, total staked) deben estar en el HTML.
2. Conectar wallet → debe mostrar tu balance del token y tu posicion staked actual (SWR).
3. Si no tienes allowance → debe aparecer "Aprobar" primero al intentar stake.
4. Aprobar → confirmar tx → el boton debe cambiar a "Stake".
5. Ingresar monto y hacer stake → confirmar tx → tu posicion staked debe aumentar.
6. Las rewards deben ir acumulandose (verificar que el numero sube con el tiempo).
7. Click "Reclamar recompensas" → confirmar tx → el balance de rewards debe bajar a 0.
8. Click "Unstake" → debe iniciar cooldown. La UI debe mostrar un countdown real.
9. Intentar unstake durante cooldown → debe estar deshabilitado con mensaje de tiempo restante.
10. El historial debe mostrar tus eventos reales de stake/unstake/claim.

---

### 6. Swap

**Ruta:** `/[locale]/swap`
**Archivo viejo:** Parte de `Exchange.tsx` (vista simplificada solo-swap)
**Prioridad:** MEDIA - Interfaz universal de intercambio

**Contexto de negocio:**
Una interfaz simplificada de swap para usuarios que solo quieren intercambiar tokens sin el dashboard completo de trading. Muestra pares de tokens disponibles, calcula montos de salida con slippage y ejecuta swaps. Esta es la accion DeFi mas comun y necesita funcionar de forma confiable con cotizaciones precisas.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 6.1 | [x] | Lista de tokens disponibles | **SSR** (`fetch` + `revalidate: 300`) | `tokenApi.ts` |
| 6.2 | [x] | Cotizar monto de salida (Quoter V2) | **Blockchain read** (client, bajo demanda) | `tradeSimulation.ts` + QuoterV2 |
| 6.3 | [x] | Ejecutar swap | **Blockchain write** (client) | `useContractWriteWithGas.ts` |
| 6.4 | [x] | Balances de tokens | **SWR** (client, depende de wallet) | `useMulticallBalances.ts` |
| 6.5 | [x] | Allowance de token + aprobar | **SWR** (client, depende de wallet) | `useAllowance.ts` |
| 6.6 | [x] | Historial de swaps recientes (usuario) | **WS** (client, Swap events real-time) | WebSocket `Swap` events |
| 6.7 | [x] | Estimacion de precio de gas | **Blockchain read** (parte de trade simulation) | `tradeSimulation.ts` |

**Reemplaza mocks:** `generateMockSwapTokens()`, `generateMockRecentSwaps()`, `calculateSwapOutput()`

**Como testear:**
1. Ir a `/en/swap` → ver "View Source" → la lista de tokens debe estar en el HTML (SSR).
2. Conectar wallet → los balances de cada token deben ser reales (SWR, coincidir con MetaMask).
3. Seleccionar token A y token B → ingresar monto → el output debe calcularse via Quoter V2.
4. Cambiar el monto → el output debe recalcularse (con un pequeno delay por la call al contrato).
5. Verificar que el price impact y slippage mostrados son coherentes.
6. El gas estimado debe reflejar el precio actual de gas en BSC.
7. Si no tienes allowance del token A → debe aparecer "Aprobar" antes de "Swap".
8. Ejecutar swap en testnet → MetaMask abre, confirmar → balances se actualizan post-tx.
9. El swap recien hecho debe aparecer en el historial de swaps recientes.
10. Click en "MAX" → debe poner tu balance completo del token (menos gas si es BNB).

---

### 7. Presale

**Ruta:** `/[locale]/presale/[token]`
**Archivo viejo:** `Presale.tsx`
**Prioridad:** MEDIA - Participacion en lanzamiento de tokens

**Contexto de negocio:**
Los usuarios participan en presales de tokens contribuyendo BNB/WBNB. La pagina muestra progreso de la presale (recaudado vs objetivo), tiempo restante, limites de contribucion y la participacion del usuario. Despues de que termina la presale, los usuarios pueden reclamar tokens. Datos de progreso precisos evitan sobre-contribucion y construyen confianza en el proceso de lanzamiento.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 7.1 | [x] | Datos del contrato de presale (recaudado, objetivo, startTime, endTime, rate) | **Blockchain read** (client, wagmi, refetch 15s) | `hooks/use-presale-contract.ts` → `totalRaised()`, `hardCap()`, `getTimeLeft()`, etc. |
| 7.2 | [x] | Monto de contribucion del usuario | **Blockchain read** (client, wagmi) | `hooks/use-presale-contract.ts` → `contributions(user)` |
| 7.3 | [x] | Metadata del token | **SSR** (`fetch` + `revalidate: 300`) | `services/token.ts` + vault SSR |
| 7.4 | [x] | Transaccion de contribucion | **Blockchain write** (client) | `hooks/use-presale-contract.ts` → `deposit()` via Presale ABI |
| 7.5 | [x] | Transaccion de reclamar tokens (post-presale) | **Blockchain write** (client) | `hooks/use-presale-contract.ts` → `withdraw()` via Presale ABI |
| 7.6 | [x] | Precio BNB para mostrar en USD | **SWR** (client, cache 5min) | Ya integrado (`useBnbPrice`) |

**Reemplaza mock:** `generateMockPresaleData()`

**Como testear:**
1. Ir a `/en/presale/TOKEN` → ver "View Source" → datos de la presale y metadata deben estar en el HTML.
2. La barra de progreso debe reflejar el % real (recaudado / objetivo) renderizado por SSR.
3. El countdown debe mostrar el tiempo restante real hasta el fin de la presale.
4. Conectar wallet → debe mostrar tu contribucion actual (0 si no has contribuido) (SWR).
5. Ingresar un monto de BNB y contribuir → MetaMask abre, confirmar tx.
6. Post-tx → tu contribucion debe aumentar, la barra de progreso debe subir.
7. Si la presale ya termino → el formulario de contribucion debe estar deshabilitado.
8. Si la presale termino y contribuiste → debe aparecer boton "Reclamar tokens".
9. Reclamar tokens → confirmar tx → los tokens deben aparecer en tu wallet.
10. El nombre, simbolo y logo del token deben venir del servidor (no requests del cliente).

---

### 8. Launchpad

**Ruta:** `/[locale]/launchpad/*` (wizard de 4 pasos)
**Archivo viejo:** `Launchpad.tsx`
**Prioridad:** MEDIA - Flujo de creacion de tokens

**Contexto de negocio:**
Los creadores usan el Launchpad para desplegar nuevos tokens con pools y presales opcionales. El wizard de 4 pasos recolecta info del token, config del pool, parametros de presale y luego despliega todo. Este es el lado de oferta del marketplace. Integrar significa desplegar contratos realmente en la blockchain, que es la operacion de escritura mas compleja del protocolo.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 8.1 | [x] | Generacion de texto con IA (descripcion del token) | **API** (client, bajo demanda) | `hooks/use-ai-generation.ts` → `POST /api/ai/generate` |
| 8.2 | [x] | Generacion de imagen con IA (logo del token) | **API** (client, bajo demanda) | `hooks/use-image-generation.ts` → `POST /api/generate` + polling |
| 8.3 | [x] | Desplegar contrato del token | **Blockchain write** (client) | `lib/abis.ts` → Factory ABI `deployVault()` disponible |
| 8.4 | [x] | Crear pool | **Blockchain write** (client) | Integrado en `deployVault()` (pool se crea en la misma tx) |
| 8.5 | [x] | Crear contrato de presale | **Blockchain write** (client) | Integrado en `deployVault()` (presale se crea si `presale=1`) |
| 8.6 | [x] | Guardar metadata del token en API | **SWR mutation** (client, post-deploy) | `services/token.ts` → `POST /tokens` + `launchpadStore.saveTokenMetadata()` |
| 8.7 | [x] | Guardar config del pool en API | **SWR mutation** (client, post-deploy) | `services/pool-api.ts` → `POST /pools` + `launchpadStore.saveTokenMetadata()` |
| 8.8 | [x] | Precio BNB (para calculo de FDV) | **SWR** (client, cache 5min) | Ya integrado (`useBnbPrice`) |

**Reemplaza:** Actualmente usa solo Zustand store (sin datos mock, el wizard es stateful)

**Nota:** Esta pagina es mayormente client-side porque es un wizard interactivo con wallet. No hay datos publicos que pre-renderizar por SSR.

**Como testear:**
1. Ir a `/en/launchpad/token` → paso 1: llenar nombre, simbolo, descripcion.
2. Click en "Generar con IA" (descripcion) → debe llamar a la API y devolver texto generado.
3. Click en "Generar logo con IA" → debe llamar a la API y mostrar la imagen generada.
4. Avanzar a paso 2 (Pool) → configurar precio y supply. El FDV debe calcularse con precio BNB real.
5. Avanzar a paso 3 (Presale) → configurar duracion, soft cap.
6. Avanzar a paso 4 (Preview) → revisar resumen de todo lo configurado.
7. Conectar wallet → click "Desplegar" → MetaMask debe abrir con la tx del token factory.
8. Confirmar tx del token → automaticamente debe pedir confirmar tx del pool.
9. Confirmar tx del pool → si presale habilitada, pedir confirmar tx de presale.
10. Post-deploy → la metadata debe guardarse en la API (verificar con GET /tokens).
11. El token recien creado debe aparecer en Markets.
12. La pagina de presale del token debe ser accesible si se habilito presale.

---

### 9. Dividends

**Ruta:** `/[locale]/dividends` + `/[locale]/dividends/[token]`
**Archivo viejo:** `Dividends.tsx`
**Prioridad:** BAJA - Funcionalidad de ingresos pasivos

**Contexto de negocio:**
Los holders de tokens reciben dividendos de las fees del protocolo proporcional a sus holdings. La pagina muestra montos reclamables, calendarios de vesting (desbloqueo lineal en el tiempo) e historial de distribuciones. Este es un mecanismo clave de retencion - los usuarios que ven acumulacion real de dividendos son menos propensos a vender.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 9.1 | [x] | Lista general de tokens con dividendos | **Blockchain read** (client, wagmi) | `hooks/use-dividends-contract.ts` → `getRewardTokens()` via NomaDividends ABI |
| 9.2 | [x] | Calendario de vesting por token (tramos, tiempos de desbloqueo) | **Blockchain read** (client, wagmi) | `hooks/use-dividends-contract.ts` → `getVestingEntries()` |
| 9.3 | [x] | Monto reclamable del usuario | **Blockchain read** (client, wagmi) | `hooks/use-dividends-contract.ts` → `claimable(token, user)` |
| 9.4 | [x] | Transaccion de reclamar | **Blockchain write** (client) | `hooks/use-dividends-contract.ts` → `claimAll()`, `claim()`, `withdrawVested()`, `withdrawAllVested()` |
| 9.5 | [ ] | Historial de distribuciones | **SSR** (`fetch` + `revalidate: 60`) | **No existe endpoint API** — requiere indexador de eventos Distribute |
| 9.6 | [x] | Precio BNB | **SWR** (client, cache 5min) | Ya integrado (`useBnbPrice`) |

**Reemplaza mocks:** `generateMockDividendTokens()`, `generateMockDividendTokenDetail()`, `generateMockDividendHistory()`

**Como testear:**
1. Ir a `/en/dividends` → ver "View Source" → la lista de tokens con dividendos debe estar en el HTML.
2. El historial de distribuciones tambien debe venir por SSR.
3. Conectar wallet → solo deben resaltarse/mostrarse tokens donde tienes holdings (SWR).
4. Si no tienes holdings → debe mostrar estado vacio o mensaje informativo.
5. Click en un token → ir a `/en/dividends/TOKEN`.
6. El calendario de vesting con tramos reales debe renderizarse por SSR.
7. El monto "Reclamable ahora" debe coincidir con lo que devuelve `claimable()` del contrato (SWR).
8. Click "Reclamar" → MetaMask abre, confirmar tx → el monto reclamable baja a 0.
9. Verificar en MetaMask que los tokens llegaron a tu wallet.
10. Los valores en USD deben usar el precio BNB real.

---

### 10. Studio

**Ruta:** `/[locale]/studio` + `/[locale]/studio/[token]`
**Archivo viejo:** `Studio.tsx`
**Prioridad:** BAJA - Dashboard del creador

**Contexto de negocio:**
El Studio es el centro de control del creador. Muestra todos los tokens que ha desplegado, con estadisticas (volumen, holders, liquidez, ganancias). Los creadores pueden monitorear actividad, ver trades recientes y gestionar sus tokens. Es esencial para el lado de oferta del marketplace - los creadores necesitan visibilidad sobre como se desempenan sus tokens.

**Integraciones necesarias:**

| # | Estado | Integracion | Estrategia | Ref vieja |
|---|--------|-------------|-----------|-----------|
| 10.1 | [x] | Vaults/tokens del creador | **SWR** (client, depende de wallet) | `services/creator.ts` → `GET /api/creator/{address}` + `useStudioData` hook |
| 10.2 | [x] | Stats por token (volumen, holders, TVL) | **SWR** (client, depende de wallet) | `services/creator.ts` → Datos parciales del creator API (earnings) |
| 10.3 | [x] | Actividad de trading reciente por token | **WS** (client) | WebSocket `Swap` events via `useStudioTokenDetail` |
| 10.4 | [x] | Ganancias del creador | **SWR** (client, depende de wallet) | `services/creator.ts` → `totalEarnings` del creator API |
| 10.5 | [x] | Precio BNB | **SWR** (client, cache 5min) | Ya integrado (`useBnbPrice`) |

**Reemplaza mocks:** `generateMockStudioData()`, `generateMockStudioActivity()`

**Nota:** La lista principal de Studio depende de la wallet conectada (muestra TUS tokens), asi que no se puede hacer full SSR. Pero el detalle de un token especifico (`/studio/[token]`) si tiene datos publicos que van por SSR.

**Como testear:**
1. Ir a `/en/studio` sin wallet conectada → debe pedir conectar wallet.
2. Conectar wallet → debe cargar la lista de tokens que TU desplegaste (SWR).
3. Si no has desplegado tokens → debe mostrar estado vacio con link al Launchpad.
4. Si tienes tokens → cada card debe mostrar stats reales (volumen 24h, holders, TVL).
5. Click en un token → ir a `/en/studio/TOKEN` → ver "View Source" → stats publicas en el HTML (SSR).
6. Las estadisticas (volumen, liquidez, ganancias) deben coincidir con la API.
7. El feed de actividad reciente debe mostrar trades reales en tiempo real (WS).
8. Las ganancias del creador deben calcularse correctamente (fees acumuladas, SWR).
9. Los valores en USD deben usar precio BNB real.
10. Desplegar un token nuevo desde Launchpad → al volver a Studio, debe aparecer en la lista.

---

## Orden de Integracion (Recomendado)

```
Fase 0 - Infraestructura
  [x] P1: Server fetchers + Cliente SWR
  [x] P2: Wallet (Wagmi + RainbowKit)
  [x] P3: Servicio WebSocket
  [x] P4: Servicio Multicall
  [x] P5: Store de Precio BNB

Fase 1 - Core (prioridad ALTA)
  [x] 1. Markets    → los usuarios pueden navegar tokens reales
  [x] 2. Exchange   → los usuarios pueden ver precios reales y tradear
  [x] 3. Liquidity  → los usuarios pueden proveer liquidez

Fase 2 - Funcionalidades DeFi (prioridad MEDIA)
  [x] 4. Borrow     → API loans + WS eventos + hedge service + contract writes (borrow/payback/roll)
  [x] 5. Swap       → SSR token list + WS trade history + trade simulation + useSwap
  [x] 6. Stake      → Contract reads/writes via useStaking hook (falta: historial de eventos 5.7)
  [x] 7. Presale    → Contract reads/writes via usePresaleContract hook (completo)
  [x] 8. Launchpad  → AI generation + Factory deploy + API save token/pool (completo)

Fase 3 - Ecosistema (prioridad BAJA)
  [x] 9. Dividends  → Contract reads/writes via useDividendsContract hook (falta: historial 9.5)
  [x] 10. Studio    → Creator API integrado + WS actividad real-time
```

---

## Pendientes de Backend (requieren trabajo en el servidor, no en el frontend)

| # | Item | Que se necesita |
|---|------|-----------------|
| 5.7 | Historial de eventos de staking | Crear indexador de eventos `Staked`/`Unstaked` del contrato de staking y exponerlo como endpoint API (similar a `/api/loans` que indexa eventos de lending). Endpoint sugerido: `GET /api/staking/events/vault/{vaultAddress}` |
| 9.5 | Historial de distribuciones de dividendos | Crear indexador de eventos `Distribute` del contrato NomaDividends y exponerlo como endpoint API. Endpoint sugerido: `GET /api/dividends/history/{tokenAddress}` |

> Una vez creados estos endpoints en el backend, solo hay que reemplazar los mocks en `use-stake-history.tsx` y `use-dividend-history.tsx` con fetches reales (mismo patron que `use-loan-history.tsx`).

---

## Stack Tecnico para Integraciones

| Aspecto | Estrategia | Notas |
|---------|-----------|-------|
| Datos publicos | **Next.js SSR** (Server Components + `fetch` con `revalidate`) | Prioridad #1. Vaults, tokens, metadata, historiales publicos, stats. Se renderizan en servidor. |
| Datos del usuario | **SWR** (client) | Balances, posiciones, allowances, prestamos activos. Dependen de la wallet conectada. |
| Datos en tiempo real | **WebSocket** (client, singleton) | Precios, trades, eventos de blockchain. Auto-reconexion. |
| Lecturas on-demand | **Blockchain read** (client) | Cotizaciones (Quoter V2), simulaciones. Se llaman bajo demanda al interactuar. |
| Transacciones | **Blockchain write** (client, wagmi) | Swap, stake, claim, deploy. Siempre desde el cliente con wallet. |
| Wallet | `wagmi` v2 + `@rainbow-me/rainbowkit` | BSC Testnet/Mainnet, auto-reconexion. |
| Tipos ABI | `abitype` | Interacciones de contrato type-safe. |
