<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const links = computed(() => [[{
  label: t('nav.general'),
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
}, {
  label: t('nav.notifications'),
  icon: 'i-lucide-bell',
  to: '/settings/notifications'
}, {
  label: t('nav.shifts'),
  icon: 'i-lucide-clock',
  to: '/settings/shifts'
}]] satisfies NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="t('nav.settings')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <RouterView />
      </div>
    </template>
  </UDashboardPanel>
</template>
