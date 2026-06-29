<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const links = computed(() => [[{
  label: t('nav.pkf'),
  icon: 'i-lucide-bar-chart-2',
  to: '/reports/pkf'
}, {
  label: t('nav.energy'),
  icon: 'i-lucide-zap',
  to: '/reports/energy'
}, {
  label: t('nav.waste'),
  icon: 'i-lucide-trash-2',
  to: '/reports/waste'
}]] satisfies NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="reports" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="t('nav.reports')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>
