# Project: mes-frontend

## Stack
- Vue 3 + Vite (plain SPA, not Nuxt SSR)
- Nuxt UI v4 (headless components + Tailwind CSS v4)
- TypeScript, Vue Router
- oidc-client-ts for Keycloak OIDC (Authorization Code + PKCE)
- @microsoft/signalr for real-time dashboard updates
- @unovis/vue for charts
- pnpm v10.29.2 as package manager

## Commands
- Dev server: `pnpm dev` → http://localhost:5173
- Production build: `pnpm build` → `dist/`
- Preview build: `pnpm preview`
- Type-check: `pnpm typecheck`
- Docker image: `docker build -t mes-frontend .` (from `mes-frontend/`)
- Full stack: `docker compose up -d --build` (from `~/projects/`)

## Deploy (manual — requires sudo, /var/www is root-owned)
```bash
pnpm build
sudo rm -rf /var/www/mes-frontend/dist/assets
sudo cp -r dist/* /var/www/mes-frontend/dist/
```

## Runtime config (Docker)

Keycloak coordinates are **not** baked into the build. Instead:
- `public/config.json` — loaded by Vite in dev (`pnpm dev`); edit this for local Keycloak URL. **Excluded from Docker image** via `.dockerignore`.
- In the container, `docker-entrypoint.sh` generates `/usr/share/nginx/html/config.json` from `KEYCLOAK_AUTHORITY` and `KEYCLOAK_CLIENT_ID` env vars at startup.
- `src/config.ts` — `loadConfig()` fetches `/config.json`; must be awaited in `main.ts` before `useAuth()` is called.
- `src/composables/useAuth.ts` — calls `getConfig()` to get authority and clientId when creating `UserManager`.

## Architecture
- `src/main.ts` — app entry, router + UI plugin setup
- `src/App.vue` — root component (sidebar layout)
- `src/pages/` — route-level views
  - `index.vue` — dashboard home (KPI stats, machine state timeline, line efficiency chart, events log, order queue)
  - `login.vue` — OIDC redirect
  - `orders.vue` — orders table (TanStack Table, filters, pagination)
  - `orders/[id].vue` — order detail + cage scanning
  - `events.vue` — production events: unacknowledged stops alert + events table with Add Event / Annotate buttons
  - `system-log.vue` — admin-only application log viewer (from `logs` table); redirects to `/` if not admin
  - `settings.vue` — settings layout with nested routes
  - `master-data.vue` — Master Data layout with nested routes (same pattern as settings.vue)
  - `master-data/products.vue` — product list table (number, SKU, description, code)
  - `master-data/products/[id].vue` — product detail + all six setpoint sections; editable by admins only
  - `reports.vue` — Reports layout with nested routes
  - `reports/pkf.vue` — PKF report: line/period or order filter → basalt, binder, wool, waste, efficiency table; CSV export
  - `reports/energy.vue` — Energy report: line/period or order filter → gas, electricity, water table + totals cards; CSV export
  - `production.vue` — Production monitoring layout; submenu = all production lines (dynamic from `/api/lines`)
  - `production/[lineId].vue` — Per-unit process data; Lines 1–2 → tabs: Curing / ACON / Binder; Lines 3–6 → Main / Package; fetches `/api/production/lines/{id}/units/{unit}/latest` from ClickHouse historian; auto-refreshes every 30 s
  - `auth/callback.vue` — OAuth callback; syncs user to DB via `POST /api/me`
- `src/components/`
  - `orders/OrdersAddModal.vue` — new order form (SKU, volume, UOM, cage config)
  - `orders/OrdersDeleteModal.vue` — bulk cancel confirmation
  - `events/EventsAddModal.vue` — add/annotate production event; controlled via `v-model:open` + optional `stop` prop; when `stop` provided: annotate mode (links to machine state); otherwise: standalone with line/time selectors
  - `home/HomeStats.vue` — 4 KPI cards, line-scoped, updated via SignalR
  - `home/HomeChart.vue` — line efficiency chart (unovis)
  - `home/HomeStateTimeline.vue` — machine state bar (running/warning/stopped) from `machine_states` table
  - `home/HomeSales.vue` — last 5 production events from `/api/events`; columns: Time, Line, Type (badge), Duration, Title
  - `home/HomeOrders.vue` — line-scoped order queue (Prev-1, Prev, Current, Next, Next+1); receives `line` prop
  - `home/HomePeriodSelect.vue`, `home/HomeDateRangePicker.vue` — date controls
  - `NotificationsSlideover.vue`, `UserMenu.vue`
- `src/composables/`
  - `useAuth.ts` — OIDC login/logout, token management (`createSharedComposable`)
  - `useMesUser.ts` — role, userId, fullName in localStorage (`createSharedComposable`)
  - `useLine.ts` — `selectedLine: ref<number>` for home dashboard, persisted in localStorage (`mes_home_line`); use `setLine(id)` to update (`createSharedComposable`)
  - `useLines.ts` — fetches all production lines from `/api/lines`; `lines`, `lineMap`, `lineName(id)` (`createSharedComposable`)
  - `useSelectedLines.ts` — per-user visible line preference stored in localStorage (`mes_selected_lines_<userId>`); `selectedLineIds`, `visibleLines` (computed subset of `lines`), `setSelectedLines(ids)`, `isLineVisible(id)`; empty array = no preference = all lines visible (`createSharedComposable`)
  - `useDashboard.ts` — SignalR connection + notifications slideover state + `alertsUpdated` counter (`createSharedComposable`)
  - `useSettings.ts` — global settings (auto-refresh toggle, interval, showEfficiencyChart) from `/api/settings` (`createSharedComposable`)
  - `useNotifications.ts` — alert list, notification prefs, ack; watches `alertsUpdated` with 2 s debounce (`createSharedComposable`)
- `src/utils/api.ts` — `apiFetch<T>(path, options)` with JWT injection + 401 → logout
- `src/types/index.d.ts` — all TypeScript interfaces

## Route structure
```
/                          → index.vue (home dashboard)
/login                     → login.vue
/auth/callback             → callback.vue
/orders                    → orders.vue
/orders/:id                → orders/[id].vue
/events                    → events.vue (production events + unacknowledged stops)
/system-log                → system-log.vue (admin only — redirects to / if not admin)
/settings                  → settings.vue (layout)
  /                        → settings/index.vue  (name + role; production line visibility selector; system settings)
  /notifications           → settings/notifications.vue
/reports                   → reports.vue (layout, redirects to /reports/pkf)
  /pkf                     → reports/pkf.vue
  /energy                  → reports/energy.vue
/production                → production.vue (layout, redirects to /production/1)
  /:lineId                 → production/[lineId].vue (unit tabs + process param cards)
/master-data               → master-data.vue (layout, redirects to /master-data/products)
  /products                → master-data/products.vue (product list)
/master-data/products/:id  → master-data/products/[id].vue (product detail + setpoints)
```

## Authentication (useAuth.ts)
- Provider: Keycloak at `https://keycloak.test.local/realms/mes-realm`
- Client ID: `mes-frontend` (public client, PKCE)
- Tokens stored in localStorage; silent renewal enabled
- On 401: `apiFetch` auto-calls logout

## Real-time (useDashboard.ts)
- Single shared SignalR connection via `createSharedComposable`
- JWT passed as `?access_token=` query param
- Events: `OrdersUpdated` (5 s), `StatsUpdated` (3 s), `ProcessDataUpdated` (3 s), `MachineStateUpdated` (on every new DB row), `StopInserted` (when state=stopped)
- Reactive refs: `ordersSignalR`, `statsSignalR`, `processDataSignalR`, `machineStateUpdated`, `stopInserted`

## TypeScript types (`src/types/index.d.ts`)

| Type | Key fields |
|------|-----------|
| `Order` | id, orderNumber, sku, status, priority, volume, uomCode, line, dueDate, startAt, finishAt, sequence, cage, producedPackages, producedVolume, pkgProduced, comment |
| `OrderStatus` | `'created' \| 'running' \| 'paused' \| 'completed' \| 'cancelled'` |
| `OrderDetail` | + uomName, status, startAt, finishAt, cageSize, cages: CageEntry[], producedVolume, pkgProduced |
| `CageEntry` | id, cageGuid, cageSize, packages, completedAt, completedBy |
| `Uom` | id, code, name, type |
| `MachineState` | timestamp, state, durationMinutes |
| `LogEntry` | id, type (LogType), message, level (LogLevel), ts |
| `Sku` | id, code, name, unit |
| `Stat` | title, icon, value, variation |
| `ProductionEvent` | id, lineId, lineName, orderId?, machineStateId?, eventType, severity, title, description?, startAt, endAt?, createdBy?, createdAt |
| `UnacknowledgedStop` | id, lineId, lineName, startAt, durationMinutes |
| `EventType` | downtime_unplanned \| downtime_planned \| changeover \| quality_hold \| maintenance \| operator_note \| safety |
| `EventSeverity` | info \| warning \| critical |
| `ProductListItem` | id, number, sku?, description?, code? |
| `GeneralSp` | package?, abcCat?, wasteSuply?, drumPressure?, sawCross?, productType?, energyClass?, binderType?, … |
| `SawsSp` | trimmingWasteOws?, platesInPkg?, cutDirection?, layers?, sheetWidth?, cutWidth?, rawEdgeWidth?, … |
| `TahuSp` | tahuFinishPackHeight?, tahuOutputHeight?, tahuFilmWidth?, tahuFoilCode?, tahuVacuum?, tahuSmartDate?, … |
| `BundlerSp` | bundlerPacksPerBundle?, bundlerCompLength?, bundlerOutputLength?, productTurnPos608?, groupProductPos608? |
| `ConsumablesSp` | bundlePlasticCode?, hooderPlasticCode?, wrapperPlasticCode?, checkLayers? |
| `UlSp` | ulProductPerLayer?, ulPalletLayers?, ulPalletDim?, ulPalletHeight?, ulUseHooding?, ulUseGlue?, ulUseWrapping?, … |
| `ProductDetail` | all `products` columns + general?, saws?, tahu?, bundler?, consumables?, ul? (all setpoint objects nullable) |
| `PkfReportRow` | orderNumber, skuCode?, skuName?, startTs, endTs, durationH, basaltT, binderKg, woolT, wasteKg, avgEfficiency |
| `EnergyReportRow` | orderNumber, skuCode?, skuName?, startTs, endTs, durationH, totalGasM3, totalElecKwh, totalWaterM3 |

## Home screen components and their data sources

| Component | Endpoint | Notes |
|-----------|----------|-------|
| `HomeStats` | `/api/dashboard/stats?lineId=` | 4 KPI cards: Line Uptime, Production Progress, Waste %, Line Efficiency; also updated via `StatsUpdated` SignalR |
| `HomeStateTimeline` | `/api/dashboard/states?lineId=&hours=` | Real data from `machine_states` table; `hours` = range duration in hours, computed from the date range picker; backend anchors to `NOW() - hours`; re-fetches on range/line change |
| `HomeChart` | `/api/dashboard/efficiency?...&lineId=` | Mock; shown/hidden via `showEfficiencyChart` setting; re-fetches on period/range/line change |
| `HomeSales` | `/api/events?limit=5&lineId=` | Last 5 production events from `production_events` table, line-scoped; columns: Time, Line, Type (badge), Duration, Title; re-fetches on line change; takes `line` prop |
| `HomeOrders` | `/api/orders` | Line-scoped queue showing Prev-1, Prev, Current (running), Next, Next+1; takes `line` prop |

## Machine State Timeline
`HomeStateTimeline.vue` renders a horizontal bar divided into proportional coloured segments (green=running, yellow=warning, red=stopped). Data from `machine_states` table via `GET /api/dashboard/states?lineId=&from=`. The `hours` parameter is derived from `range.end - range.start` (rounded to nearest hour). The backend anchors the window at `NOW() - hours`, so the timeline always covers exactly the selected duration. Each segment shows duration in minutes. Legend shows running/warning/stopped percentages.

**Update strategy — two triggers:**
1. **SignalR `MachineStateUpdated { lineId }`** — immediate re-fetch when a new state row is inserted (sent by `ProcessDataService` when state changes, or by `POST /api/machine-states` for real machines). Only re-fetches if `lineId` matches the currently selected line.
2. **Auto-refresh interval** — periodic re-fetch controlled by the global settings (auto-refresh toggle + interval).

## Cage tracking (orders/[id].vue)
- Only shown when `order.cage === true` (pkg UOM orders only)
- Operator presses "Add Cage" — server auto-generates `cage_guid` via `gen_random_uuid()`
- POST `/api/orders/{id}/cages` — no body required
- Cages table: `cageSize` read-only (set at order creation), `packages` editable inline
- Totals update reactively on add/edit/delete without page reload

## Order progress tracking

All orders show a production progress bar and Produced/Progress cards, regardless of UOM.

| UOM | Produced card | Progress calculation | Extra card |
|-----|---------------|----------------------|------------|
| `pkg` | `produced_packages / volume pkg` | `produced_packages / volume` | — |
| other | `produced_volume / volume <uom>` | `produced_volume / volume` | Packages Produced (`pkg_produced`) |

- `produced_packages` — derived from `SUM(cages.packages)` for cage orders; 0 for non-cage
- `produced_volume` — in the order's UOM; randomly set at creation for non-pkg orders; updated later by OPC UA/NATS
- `pkg_produced` — discrete package count; for `pkg` orders equals `produced_packages`; for non-pkg orders randomly set (1–500) at creation; updated later by OPC UA/NATS
- Progress % can exceed 100% (displayed as warning if it does; the bar is capped at 100% visually)

## UI gotcha — UDashboardPanel flex shrink
The `#body` slot renders as `flex flex-col flex-1 overflow-y-auto`.
Direct children shrink to zero height when content overflows.
**Fix: add `class="shrink-0"` to every direct child of `#body`.**

## Per-user line visibility (`useSelectedLines`)

Users select which production lines they work with in **Settings → Production Lines**. The preference is stored per user in localStorage under `mes_selected_lines_<userId>`.

- `selectedLineIds: ref<number[]>` — explicit list of checked line IDs. Empty = no preference = all lines shown.
- `visibleLines: computed<ProductionLine[]>` — the filtered subset of `lines`; returns all lines when `selectedLineIds` is empty.
- `setSelectedLines(ids)` — updates the ref and persists to localStorage. Saving with all lines checked stores `[]` (so new lines added to the DB appear automatically).
- `isLineVisible(id)` — convenience predicate.

**Where `visibleLines` is used** (must be kept in sync if new line selectors are added):
`index.vue` toolbar, `OrdersAddModal.vue`, `orders.vue` filter, `events.vue` filter, `EventsAddModal.vue`, `reports/pkf.vue`, `reports/energy.vue`, `reports/waste.vue`, `App.vue` production sidebar children.

Each page that needs a line scope has its own local line selector — there is no global sidebar line switcher (`TeamsMenu.vue` was removed for being redundant with per-page selectors).

## Role model

Two roles: `admin` and `viewer`. The backend enforces all role checks — the frontend only hides controls for usability.

`canSeeAdminUi` (from `useMesUser`) is `true` unless role is explicitly `'viewer'`. Gates:
- "New order" button (`OrdersAddModal`)
- Start / Pause / Complete buttons per order row
- Bulk cancel button + Cancel item in row dropdown
- System settings card (auto-refresh, interval, show efficiency chart)
- Team Members table
- "Save changes" button in product detail page (`master-data/products/[id].vue`)

Users are created in Keycloak, provisioned on first MES login via `POST /api/me`. The first user ever gets `admin`; all others start as `viewer`. Role changes via Settings → General → Team Members (admin only).

## Rules
- Use `pnpm`, never `npm` or `yarn`
- All API calls go through `apiFetch()` — never raw `fetch` for backend requests
- Color theme: `primary: 'green'`, `neutral: 'zinc'` (set in `vite.config.ts`)
- Route pages live in `src/pages/`
- Never commit `dist/` — it is a build artifact
- `OrdersAddModal` emits `created` — parent must call `fetchOrders()` in response
- `canSeeAdminUi` (from `useMesUser`) gates all admin-only UI elements
