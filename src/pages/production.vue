<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useLines } from '../composables/useLines'

const { t } = useI18n()
const route = useRoute()
const { lines } = useLines()

const lineId = computed(() => Number(route.params.lineId))

const activeLineName = computed(() => lines.value.find(l => l.id === lineId.value)?.name ?? t('production.title'))

const unitKeys = computed(() =>
  [1, 2].includes(lineId.value)
    ? ['curing', 'acon', 'binder']
    : ['main', 'package']
)

const unitLinks = computed(() => [unitKeys.value.map(u => ({
  label: t(`production.units.${u}`),
  to: `/production/${lineId.value}/${u}`,
} as NavigationMenuItem))])
</script>

<template>
  <UDashboardPanel id="production">
    <template #header>
      <UDashboardNavbar :title="activeLineName">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="unitLinks" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <RouterView />
    </template>
  </UDashboardPanel>
</template>
