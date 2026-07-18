<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useDashboard } from '../composables/useDashboard'
import { useLine } from '../composables/useLine'
import { useSelectedLines } from '../composables/useSelectedLines'
import { useNotifications } from '../composables/useNotifications'
import { useSettings } from '../composables/useSettings'
import type { Period, Range } from '../types'

const { t } = useI18n()
const { isNotificationsSlideoverOpen } = useDashboard()
const { alerts } = useNotifications()
const { selectedLine, setLine } = useLine()
const { visibleLines } = useSelectedLines()
const { showEfficiencyChart, showStatsCards, showUptimeDiagram } = useSettings()

// If the persisted line is no longer visible, switch to the first visible one
watch(visibleLines, (vl) => {
  if (vl.length > 0 && !vl.some(l => l.id === selectedLine.value)) {
    setLine(vl[0].id)
  }
}, { immediate: true })

const lineOptions = computed(() =>
  visibleLines.value.map(l => ({ label: l.name, value: l.id }))
)

const items = computed<DropdownMenuItem[][]>(() => [[{
  label: t('home.newOrder'),
  icon: 'i-lucide-clipboard-plus',
  to: '/orders'
}]])

const today = new Date()
const range = shallowRef<Range>({
  start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  end: today
})
const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="t('home.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip :text="t('home.notifications')" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset :show="alerts.length > 0" :text="alerts.length > 9 ? '9+' : String(alerts.length)">
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
          <USelect
            v-if="lineOptions.length > 1"
            :model-value="selectedLine"
            :items="lineOptions"
            class="w-40"
            @update:model-value="setLine"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <HomeStats         v-if="showStatsCards" :period="period" :range="range" :line="selectedLine" class="shrink-0" />
      <HomeStateTimeline v-if="showUptimeDiagram" :period="period" :range="range" :line="selectedLine" class="shrink-0" />
      <HomeChart         v-if="showEfficiencyChart" :period="period" :range="range" :line="selectedLine" class="shrink-0" />
      <HomeEvents        :line="selectedLine" class="shrink-0" />
      <HomeOrders        :line="selectedLine" :range="range" class="shrink-0" />
    </template>
  </UDashboardPanel>
</template>
