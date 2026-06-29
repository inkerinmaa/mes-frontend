# nuxt-app — Agent Reference

## Project overview
Manufacturing Execution System (MES) frontend SPA. Built with Vue 3 + Vite + Nuxt UI v4. Authenticates via Keycloak (OIDC, PKCE), fetches data from the .NET API, and shows real-time telemetry via SignalR.

## How to run
```bash
cd ~/projects/nuxt-app
pnpm install        # first time only
pnpm dev            # http://localhost:5173
```

## How to build & deploy
```bash
pnpm build
sudo rm -rf /var/www/mes-frontend/dist/assets
sudo cp -r dist/* /var/www/mes-frontend/dist/
# Access at https://mes.test.local
```

## Key files
| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite + Vue + Nuxt UI plugin config |
| `src/main.ts` | App bootstrap, plugin registration |
| `src/composables/useAuth.ts` | OIDC login/logout/token refresh |
| `src/composables/useDashboard.ts` | SignalR connection + reactive state |
| `src/utils/api.ts` | `apiFetch<T>()` — authenticated fetch wrapper |
| `src/pages/` | Route-level page components |
| `src/components/` | Feature-scoped UI components |

## Conventions
- Package manager: **pnpm only**
- All backend requests: use `apiFetch<T>(path, options)` from `src/utils/api.ts`
- Components are scoped by feature inside `src/components/<feature>/`
- UI theme: `primary: 'green'`, `neutral: 'zinc'` — do not override without updating `vite.config.ts`
- TypeScript strict mode is on — all props and return types must be typed

## Known gotcha — UDashboardPanel
The `#body` slot is `flex flex-col flex-1 overflow-y-auto`. Children shrink by default.
Add `class="shrink-0"` to all direct children of `#body` or they will be invisible when content overflows.

## Do not
- Use `npm` or `yarn` — always use `pnpm`
- Call the API with raw `fetch()` — always use `apiFetch()`
- Commit the `dist/` directory
- Add Nuxt SSR features — this is a Vite SPA, not a Nuxt app
- Modify `pnpm-lock.yaml` manually
