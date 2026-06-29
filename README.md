# mes-frontend

Vue 3 SPA frontend for the MES (Manufacturing Execution System) dashboard. Provides a real-time production monitoring UI with order management, event logging, and master data editing.

## Stack

- Vue 3 + Vite (SPA, not Nuxt SSR)
- Nuxt UI v4 (headless components + Tailwind CSS v4)
- TypeScript + Vue Router
- oidc-client-ts — Keycloak OIDC (Authorization Code + PKCE)
- @microsoft/signalr — real-time WebSocket push
- @unovis/vue — charts
- pnpm v10.29.2

## Quick Start (local dev)

```bash
# Prerequisites: backend + Keycloak running
cd ~/projects/mes-frontend
pnpm install
pnpm dev
# → http://localhost:5173
```

Edit `public/config.json` to point at your local Keycloak:
```json
{
  "authority": "https://keycloak.test.local/realms/mes-realm",
  "clientId": "mes-frontend"
}
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server at http://localhost:5173 |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm typecheck` | TypeScript type check (vue-tsc) |

## Deploy (manual — requires sudo)

`/var/www/mes-frontend/dist/` is owned by root:

```bash
pnpm build
sudo rm -rf /var/www/mes-frontend/dist/assets
sudo cp -r dist/* /var/www/mes-frontend/dist/
```

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `index.vue` | Home dashboard — stats, timeline, chart, events, orders |
| `/login` | `login.vue` | OIDC redirect |
| `/auth/callback` | `auth/callback.vue` | OAuth callback; calls `POST /api/me` |
| `/orders` | `orders.vue` | Order table with multi-select status filter |
| `/orders/:id` | `orders/[id].vue` | Order detail + cage tracking |
| `/events` | `events.vue` | Production events + unacknowledged stops alert |
| `/system-log` | `system-log.vue` | Admin-only app log viewer |
| `/settings` | `settings.vue` | Settings layout |
| `/settings` (exact) | `settings/index.vue` | General settings + team members |
| `/settings/notifications` | `settings/notifications.vue` | Per-user alert preferences |
| `/reports` | `reports.vue` | Reports layout (redirects to /pkf) |
| `/reports/pkf` | `reports/pkf.vue` | PKF report: consumption, waste, efficiency |
| `/reports/energy` | `reports/energy.vue` | Energy report: gas, electricity, water |
| `/master-data` | `master-data.vue` | Master Data layout (redirects to /products) |
| `/master-data/products` | `master-data/products.vue` | Product list |
| `/master-data/products/:id` | `master-data/products/[id].vue` | Product detail + all setpoints |

## Authentication

- Provider: Keycloak (`oidc-client-ts`, Authorization Code + PKCE)
- Tokens stored in localStorage; silent renewal enabled
- `apiFetch()` injects JWT automatically; 401 → auto logout
- Keycloak coordinates loaded at runtime from `/config.json` (not baked into the build)

## Real-time (SignalR)

Single shared connection at `/hubs/dashboard` (JWT via `?access_token=` query param):

| Event | Trigger | Used by |
|-------|---------|---------|
| `OrdersUpdated` | Every 5 s | Orders page |
| `StatsUpdated` | Every 3 s | `HomeStats` |
| `ProcessDataUpdated` | Every 3 s | `HomeStats` |
| `MachineStateUpdated { lineId }` | New state row | `HomeStateTimeline` |
| `StopInserted { lineId }` | New stopped state | Events page |
| `AlertsUpdated` | Every log write | `NotificationsSlideover` |

## Home screen components

| Component | Data source |
|-----------|-------------|
| `HomeStats` | `GET /api/dashboard/stats?lineId=` + `StatsUpdated` SignalR |
| `HomeStateTimeline` | `GET /api/dashboard/states?lineId=&hours=` |
| `HomeChart` | `GET /api/dashboard/efficiency?...&lineId=` (shown/hidden via `showEfficiencyChart` setting) |
| `HomeSales` | `GET /api/events?limit=5` — last 5 production events |
| `HomeOrders` | `GET /api/orders` — filtered to selected line, shows Prev-1 / Prev / Current / Next / Next+1 |

## Global Settings (`useSettings`)

Settings are loaded from `GET /api/settings` and persisted via `PATCH /api/settings/{key}`:

| Key | Default | Description |
|-----|---------|-------------|
| `timeline_auto_refresh_enabled` | `true` | Auto-refresh machine state timeline |
| `timeline_refresh_interval_seconds` | `60` | Refresh interval in seconds |
| `show_efficiency_chart` | `true` | Show/hide line efficiency chart on home page |

Settings keys must pre-exist in the DB (`seed.sql`) — the backend endpoint does a plain UPDATE.

## Per-user Line Visibility (`useSelectedLines`)

Users can choose which production lines they work with in **Settings → Production Lines**. The preference is stored per user in localStorage (`mes_selected_lines_<userId>`).

- Empty array (default) = no preference = all lines visible.
- Saving with all lines checked also stores an empty array, so new lines added later appear automatically.
- `visibleLines` computed is used everywhere a line selector or list appears: sidebar production links, `TeamsMenu` dropdown, home toolbar line picker, new order modal, orders filter, events filter, add-event modal, and all three report pages.

## Role model

Two roles: `admin` and `viewer`. The backend enforces all checks; the frontend hides controls.

`canSeeAdminUi` (from `useMesUser`) is `true` for any non-viewer role. Used to gate:
- New order, Start/Pause/Complete, Cancel buttons
- System settings card
- Team members table
- "Save changes" button on product detail page

## Key patterns

**API calls:** always use `apiFetch()` from `src/utils/api.ts`, never raw `fetch`.

**Shared state:** composables using `createSharedComposable` (`useAuth`, `useMesUser`, `useLine`, `useSelectedLines`, `useDashboard`, `useSettings`, `useNotifications`) share a single instance across all components.

**TanStack Table filtering:** status and date filters are applied in a `displayedData` computed before the data reaches `<UTable>`, not via TanStack's built-in `filterFn`.

**UDashboardPanel body slot:** direct children default-shrink to zero. Add `class="shrink-0"` to all direct children of `#body`.

**Product setpoints:** `PATCH /api/products/{id}` upserts only the sections included in the request. Sections not sent are left unchanged.

**Reports (PKF + Energy):** Filter form at top (line + period or order), table generated on demand, CSV export client-side via `Blob` + `URL.createObjectURL`. Both pages pre-load all orders from `/api/orders` for the order-mode dropdown. Data comes from ClickHouse historian via backend aggregation.

## Project structure

```
mes-frontend/
├── public/
│   └── config.json              Keycloak config (dev only; excluded from Docker image)
├── src/
│   ├── main.ts                  App entry, router setup, plugin registration
│   ├── App.vue                  Root: sidebar layout, nav links, OIDC guard
│   ├── config.ts                loadConfig() — fetches /config.json at startup
│   ├── pages/
│   │   ├── index.vue            Home dashboard
│   │   ├── login.vue
│   │   ├── orders.vue
│   │   ├── orders/[id].vue
│   │   ├── events.vue
│   │   ├── system-log.vue
│   │   ├── settings.vue         Layout
│   │   ├── settings/index.vue
│   │   ├── settings/notifications.vue
│   │   ├── reports.vue          Layout
│   │   ├── reports/pkf.vue
│   │   ├── reports/energy.vue
│   │   ├── master-data.vue      Layout
│   │   ├── master-data/products.vue
│   │   └── master-data/products/[id].vue
│   ├── components/
│   │   ├── home/
│   │   │   ├── HomeStats.vue
│   │   │   ├── HomeChart.vue
│   │   │   ├── HomeStateTimeline.vue
│   │   │   ├── HomeSales.vue
│   │   │   ├── HomeOrders.vue
│   │   │   ├── HomePeriodSelect.vue
│   │   │   └── HomeDateRangePicker.vue
│   │   ├── orders/
│   │   │   ├── OrdersAddModal.vue
│   │   │   └── OrdersDeleteModal.vue
│   │   ├── events/
│   │   │   └── EventsAddModal.vue
│   │   ├── NotificationsSlideover.vue
│   │   ├── UserMenu.vue
│   │   └── TeamsMenu.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useMesUser.ts
│   │   ├── useLine.ts           Selected home line (persisted localStorage)
│   │   ├── useSelectedLines.ts  Per-user visible line preference (localStorage)
│   │   ├── useDashboard.ts
│   │   ├── useSettings.ts
│   │   └── useNotifications.ts
│   ├── utils/
│   │   └── api.ts               apiFetch<T>() with JWT injection
│   └── types/
│       └── index.d.ts           All TypeScript interfaces
├── docker-entrypoint.sh         Generates /config.json from env vars in container
├── Dockerfile
└── vite.config.ts               Color theme: primary=green, neutral=zinc
```
