# @oikos/ui-mcp

In-process MCP server exposing the Oikos React UI as tools to the
in-browser `oikos-agent` (running inside StackBlitz's WebContainer at
`/terminal`).

## Why "in-process"

The agent runs in a sandboxed Node runtime inside the user's browser
tab. It has no `window`, no React, no Zustand, no wagmi. To let the
agent drive the actual user-facing UI — navigate routes, prefill swap
forms, open modals, submit transactions — the MCP server has to live
where that React state already is: inside the page's React tree.

The agent talks to this server over the same long-poll + SSE bridge
pattern used by `/api/wallet-bridge/*`. From the agent's perspective,
it's just another MCP server registered in its `MCPRegistry`.

## Wiring

```
StackBlitz container          Next prod app                 React tree
─────────────────────         ──────────────────            ──────────
agent → MCP client →─POST─→  /api/ui-mcp/<sid>/   →─SSE→   useUiMcpServer
                              {request,pending,             ↓
                               respond}                     UiContext (refs)
                                ↑                           ↓
                                └─ POST respond ←─result─── tool handler
                                                            (router.push,
                                                             store.dispatch,
                                                             modal.open, …)
```

## Layout

```
src/
├── index.ts           — re-exports
├── server.ts          — createUiMcpServer({ context })
├── transport-http.ts  — agent-side custom MCP transport
├── context.ts         — UiContext type (refs + callbacks the page mounts)
└── tools/
    ├── index.ts       — registry
    ├── navigation.ts  — ui_navigate, ui_get_route
    ├── wallet.ts      — ui_get_connected_account, ui_open_wallet_panel
    ├── swap.ts        — ui_get_swap_state, ui_set_swap_form, ui_submit_swap
    ├── markets.ts     — ui_get_visible_markets, ui_select_token
    └── modals.ts      — ui_open_modal, ui_close_modal
```

## Phases

- **Phase 1**  reads + navigation (route, account, markets, swap state, navigate)
- **Phase 2**  form prefill + modal control (set_swap_form, open_modal, ...)
- **Phase 3**  submit actions (submit_swap, submit_borrow, ...) — MetaMask
              gatekeeps via the existing wallet-bridge, no new signing infra

## Consumers

- `apps/app/hooks/use-ui-mcp-server.ts` mounts the server on `/terminal`
- `apps/app/components/organism/agent-shell.tsx` mints a session id and
  passes `OIKOS_UI_MCP_URL=${tunnel}/api/ui-mcp/<sid>` to the agent env
- `oikos-agent` registers it in its `MCPRegistry` alongside the
  oikos-mcp-server (chain tools). Tools surface as `ui__<name>` in the
  agent's tool list.
