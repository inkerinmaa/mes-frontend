import "./assets/css/main.css";

import { addCollection } from "@iconify/vue";
import lucideIcons from "@iconify-json/lucide/icons.json";
addCollection(lucideIcons);

import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import ui from "@nuxt/ui/vue-plugin";

import App from "./App.vue";
import { i18n } from "./i18n";
import { loadConfig } from "./config";
import { useAuth } from "./composables/useAuth";
import { useMesUser } from "./composables/useMesUser";

async function bootstrap() {
  // Must complete before useAuth() so getConfig() has values
  await loadConfig();

  const router = createRouter({
    routes: [
      { path: "/login", component: () => import("./pages/login.vue") },
      { path: "/auth/callback", component: () => import("./pages/auth/callback.vue") },
      { path: "/", component: () => import("./pages/index.vue") },
      { path: "/orders", component: () => import("./pages/orders.vue") },
      { path: "/orders/:id", component: () => import("./pages/orders/[id].vue") },
      { path: "/events", component: () => import("./pages/events.vue") },
      { path: "/system-log", component: () => import("./pages/system-log.vue"), meta: { requiresAdmin: true } },
      {
        path: "/production",
        component: () => import("./pages/production.vue"),
        children: [
          { path: "", redirect: "/production/1" },
          {
            path: ":lineId",
            redirect: (to) => {
              const id = Number(to.params.lineId)
              const unit = [1, 2].includes(id) ? 'curing' : 'main'
              return `/production/${id}/${unit}`
            }
          },
          { path: ":lineId/:unit", component: () => import("./pages/production/[lineId].vue") },
        ],
      },
      {
        path: "/master-data",
        component: () => import("./pages/master-data.vue"),
        children: [
          { path: "", redirect: "/master-data/products" },
          { path: "products",  component: () => import("./pages/master-data/products.vue") },
          { path: "materials", component: () => import("./pages/master-data/materials.vue") },
        ],
      },
      { path: "/master-data/products/:id", component: () => import("./pages/master-data/products/[id].vue") },
      {
        path: "/reports",
        component: () => import("./pages/reports.vue"),
        children: [
          { path: "", redirect: "/reports/pkf" },
          { path: "pkf",    component: () => import("./pages/reports/pkf.vue") },
          { path: "energy", component: () => import("./pages/reports/energy.vue") },
          { path: "waste",  component: () => import("./pages/reports/waste.vue") },
        ],
      },
      {
        path: "/settings",
        component: () => import("./pages/settings.vue"),
        children: [
          { path: "", component: () => import("./pages/settings/index.vue") },
          { path: "notifications", component: () => import("./pages/settings/notifications.vue") },
          { path: "shifts", component: () => import("./pages/settings/shifts.vue") },
        ],
      },
    ],
    history: createWebHistory(),
  });

  const app = createApp(App);
  app.use(router);
  app.use(ui);
  app.use(i18n);

  const auth = useAuth();
  const mesUser = useMesUser();
  const publicRoutes = ["/login", "/auth/callback"];

  router.beforeEach((to) => {
    if (auth.isLoading.value) return true;
    if (to.path === "/auth/callback") return true;
    if (auth.isAuthenticated.value && to.path === "/login") return "/";
    if (!auth.isAuthenticated.value && !publicRoutes.includes(to.path)) return "/login";
    if (to.meta.requiresAdmin && mesUser.role.value !== 'admin') return "/";
    return true;
  });

  await auth.initialize();
  app.mount("#app");
}

bootstrap().catch(console.error);
