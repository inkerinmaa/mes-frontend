How your Vue SPA frontend works

### The big picture

It's a **Single Page Application** — the browser loads one HTML file (`index.html`) and one JavaScript bundle (`main.ts`). After that, **no full page reloads ever happen**. Navigation between Home, Orders, Settings etc. is handled entirely in JavaScript, with Vue Router swapping components in and out.

---

### Startup sequence (`main.ts`)

When the browser loads the app, `main.ts` runs top to bottom:

1. Creates the **Vue app** (`createApp(App)`)
2. Registers two plugins: `router` (Vue Router) and `ui` (Nuxt UI component library)
3. Calls `auth.initialize()` — checks localStorage for an existing Keycloak session
4. Only after auth resolves, calls `app.mount("#app")` — this is when the UI appears

The router guard (`router.beforeEach`) runs on every navigation: if you're not authenticated and you try to go to `/orders`, it redirects you to `/login` first.

---

### Component tree

Everything in Vue is a **component** — a self-contained unit of HTML + logic + styles in a `.vue` file. Your app is a tree of them:

```
App.vue                          ← root, always mounted
├── UDashboardGroup              ← Nuxt UI layout shell (sidebar + content)
│   ├── UDashboardSidebar
│   │   ├── TeamsMenu.vue        ← top of sidebar
│   │   └── UserMenu.vue         ← bottom of sidebar
│   └── <RouterView />           ← SLOT: current page goes here
│       ├── pages/index.vue      ← when URL = /
│       │   ├── HomeStats.vue
│       │   ├── HomeStateTimeline.vue
│       │   ├── HomeChart.vue
│       │   ├── HomeSales.vue
│       │   └── HomeOrders.vue
│       ├── pages/orders.vue     ← when URL = /orders
│       └── pages/orders/[id].vue ← when URL = /orders/123
└── NotificationsSlideover.vue   ← always mounted, hidden until toggled
```

`<RouterView />` is the magic — it's a placeholder that Vue Router replaces with whatever page matches the current URL. The sidebar and `App.vue` shell stay mounted the whole time.

---

### Pages vs Components

This is an important distinction:

**Pages** (`src/pages/`) — one per URL route. They define the layout structure for a screen. They're just components, but by convention they own the data fetching and pass data down as props.

**Components** (`src/components/`) — reusable building blocks that a page assembles. They receive `props` from their parent and don't know what URL they're on.

Example: `pages/index.vue` (home dashboard) fetches nothing itself — it just passes `period`, `range`, and `selectedLine` as props down to `HomeStats`, `HomeStateTimeline`, etc. Each of those fetches its own data independently.

**To add a new page:**
1. Create `src/pages/mypage.vue`
2. Add a route in `main.ts`: `{ path: '/mypage', component: () => import('./pages/mypage.vue') }`
3. Add a link in `App.vue`'s `links` array: `{ label: 'My Page', icon: 'i-lucide-...', to: '/mypage' }`

That's it. The sidebar and layout wrap it automatically.

---

### Props and data flow

Data flows **downward** through props, events flow **upward**:

```
index.vue
  selectedLine = 2          ← state lives here
  │
  ├── <HomeStats :line="selectedLine" />       ← receives line as prop
  └── <HomeStateTimeline :line="selectedLine" /> ← also receives line as prop
```

When `selectedLine` changes (user picks a different line), Vue automatically re-renders both children because they depend on it. Each child component watches its props and re-fetches data when they change — that's the `watch([() => props.line], fetchStates)` you see in `HomeStateTimeline.vue`.

---

### Composables — what they actually are

A **composable** is a plain TypeScript function that uses Vue's reactive primitives (`ref`, `computed`, `watch`) and returns reactive state + functions. It's Vue's answer to "how do I share logic between components."

Your composables in `src/composables/`:

| Composable | What it holds |
|------------|--------------|
| `useAuth` | Keycloak token, `isAuthenticated`, `login()`, `logout()`, `getAccessToken()` |
| `useMesUser` | `role`, `userId`, `fullName`, `canSeeAdminUi`, `syncUser()` |
| `useLine` | `selectedLine` — the currently selected production line (1/2/3) |
| `useDashboard` | SignalR connection, `isNotificationsSlideoverOpen`, real-time data refs |

The key detail: all four use `createSharedComposable` from VueUse. Without that, every component that calls `useAuth()` would get its own **separate** copy of all the state — so `UserMenu.vue` and `HomeStats.vue` would each have their own disconnected `isAuthenticated`. `createSharedComposable` ensures the function runs **once** and every component gets the same instance. They're effectively singletons.

Usage in any component is just:
```ts
const { isAuthenticated, logout } = useAuth()  // same object everywhere
```

---

### `apiFetch` — the API layer

All backend calls go through `src/utils/api.ts`:

```ts
apiFetch<Order[]>('/orders')
// → GET /api/orders
//   Authorization: Bearer <token>
```

It automatically:
- Prepends `/api` to the path
- Injects the JWT from `useAuth()`
- On 401: calls `logout()` and throws
- Parses JSON response

**Rule**: never use raw `fetch()` for backend calls — always `apiFetch`.

---

### Real-time updates (SignalR)

`useDashboard.ts` opens one WebSocket connection to `/hubs/dashboard` when the composable first runs. Because it's `createSharedComposable`, there's exactly **one connection** per browser tab regardless of how many components call `useDashboard()`.

When the backend broadcasts an event, the relevant `ref` in `useDashboard` updates:
```
Backend sends "MachineStateUpdated"
  → useDashboard.machineStateUpdated.value = { lineId: 1 }
  → HomeStateTimeline watches this ref
  → sees lineId matches current line
  → calls fetchStates()
  → UI updates
```

---

### Nuxt UI — the component library

`UDashboardPanel`, `UCard`, `UButton`, `UTable` etc. are all from Nuxt UI v4. You use them like HTML tags. They handle styling, accessibility, dark mode. Your code just provides data and event handlers.

Icons follow the pattern `i-lucide-<name>` — browse at lucide.dev.

---

### The `<script setup>` pattern

Every `.vue` file uses this:
```vue
<script setup lang="ts">
// everything here is automatically available in the template
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

`<script setup>` is syntactic sugar — no need to `export default { ... }`. Everything you declare is automatically exposed to the template. `lang="ts"` means TypeScript.

---

### Summary: adding a new feature

Say you want to add a "Materials" page at `/materials`:

1. **Create** `src/pages/materials.vue` — page layout + data fetching via `apiFetch`
2. **Register route** in `main.ts`: `{ path: '/materials', component: () => import('./pages/materials.vue') }`
3. **Add sidebar link** in `App.vue`'s `links` array
4. **Add types** to `src/types/index.d.ts` if the API returns new shapes
5. If it has complex sub-components, put them in `src/components/materials/`

No build config changes, no plugin registration — Vue Router's lazy imports (`() => import(...)`) handle code splitting automatically.
