<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const links = computed(() => [[{
  label: t('nav.products'),
  icon: 'i-lucide-package',
  to: '/master-data/products'
}, {
  label: t('nav.materials'),
  icon: 'i-lucide-flask-conical',
  to: '/master-data/materials'
}, {
  label: t('nav.productGroups'),
  icon: 'i-lucide-layers',
  to: '/master-data/product-groups'
}]] satisfies NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="master-data" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="t('nav.masterData')">
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
