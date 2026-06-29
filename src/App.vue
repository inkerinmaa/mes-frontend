<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

import { useAuth } from './composables/useAuth'
import { useMesUser } from './composables/useMesUser'
import { useLines } from './composables/useLines'
import { useSelectedLines } from './composables/useSelectedLines'

const toast = useToast()
const { isAuthenticated } = useAuth()
const { syncUser, isAdmin } = useMesUser()
const { t } = useI18n()
const { fetchLines } = useLines()
const { visibleLines } = useSelectedLines()

onMounted(async () => {
  if (isAuthenticated.value) {
    await syncUser()
    await fetchLines()
  }
})

const open = ref(false)

const links = computed(() => [[{
  label: t('nav.home'),
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => { open.value = false }
}, {
  label: t('nav.orders'),
  icon: 'i-lucide-clipboard-list',
  to: '/orders',
  onSelect: () => { open.value = false }
}, {
  label: t('nav.events'),
  icon: 'i-lucide-activity',
  to: '/events',
  onSelect: () => { open.value = false }
}, {
  label: t('nav.production'),
  icon: 'i-lucide-factory',
  to: '/production',
  defaultOpen: true,
  type: 'trigger' as const,
  children: visibleLines.value.map(l => ({
    label: l.name,
    to: `/production/${l.id}`,
    onSelect: () => { open.value = false },
  }))
},
...(isAdmin.value ? [{
  label: t('nav.systemLog'),
  icon: 'i-lucide-scroll-text',
  to: '/system-log',
  onSelect: () => { open.value = false }
} as NavigationMenuItem] : []),
{
  label: t('nav.reports'),
  to: '/reports',
  icon: 'i-lucide-chart-column',
  defaultOpen: true,
  type: 'trigger' as const,
  children: [{
    label: t('nav.pkf'),
    to: '/reports/pkf',
    onSelect: () => { open.value = false }
  }, {
    label: t('nav.energy'),
    to: '/reports/energy',
    onSelect: () => { open.value = false }
  }, {
    label: t('nav.waste'),
    to: '/reports/waste',
    onSelect: () => { open.value = false }
  }]
},
{
  label: t('nav.masterData'),
  to: '/master-data',
  icon: 'i-lucide-database',
  defaultOpen: true,
  type: 'trigger' as const,
  children: [{
    label: t('nav.products'),
    to: '/master-data/products',
    onSelect: () => { open.value = false }
  }, {
    label: t('nav.materials'),
    to: '/master-data/materials',
    onSelect: () => { open.value = false }
  }]
},
{
  label: t('nav.settings'),
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger' as const,
  children: [{
    label: t('nav.general'),
    to: '/settings',
    exact: true,
    onSelect: () => { open.value = false }
  }, {
    label: t('nav.notifications'),
    to: '/settings/notifications',
    onSelect: () => { open.value = false }
  }]
}]] satisfies NavigationMenuItem[][])

const groups = computed(() => [{
  id: 'links',
  label: t('nav.goTo'),
  items: links.value.flat()
}])

const cookie = useStorage('cookie-consent', 'pending')
if (cookie.value !== 'accepted') {
  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
}
</script>

<template>
  <Suspense>
    <UApp>
      <UDashboardGroup v-if="isAuthenticated" unit="rem" storage="local">
        <UDashboardSidebar
          id="default"
          v-model:open="open"
          collapsible
          resizable
          class="bg-elevated/25"
          :ui="{ footer: 'lg:border-t lg:border-default' }"
        >
          <template #default="{ collapsed }">
            <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

            <UNavigationMenu
              :collapsed="collapsed"
              :items="links[0]"
              orientation="vertical"
              tooltip
              popover
            />


          </template>

          <template #footer="{ collapsed }">
            <UserMenu :collapsed="collapsed" />
          </template>
        </UDashboardSidebar>

        <UDashboardSearch :groups="groups" />

        <RouterView />

        <NotificationsSlideover />
      </UDashboardGroup>

      <RouterView v-else />
    </UApp>
  </Suspense>
</template>
