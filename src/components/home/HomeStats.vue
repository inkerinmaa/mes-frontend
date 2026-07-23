<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDashboard } from '../../composables/useDashboard'
import { apiFetch } from '../../utils/api'
import type { Period, Range, Order } from '../../types'

const { t } = useI18n()

const props = defineProps<{
  period: Period
  range: Range
  line: number
}>()

const { statsSignalR, ordersSignalR } = useDashboard()

const uptime = ref({ value: 0, variation: 0 })
const waste  = ref({ value: 0, variation: 0 })
const currentOrder = ref<Order | null>(null)
const efficiencyAvg = ref(0)

async function fetchStats() {
  try {
    const data = await apiFetch<{
      lineUptime:      { value: number; variation: number }
      wastePercentage: { value: number; variation: number }
    }>(`/dashboard/stats?lineId=${props.line}`)
    uptime.value = data.lineUptime
    waste.value  = data.wastePercentage
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchCurrentOrder() {
  try {
    const orders = await apiFetch<Order[]>('/orders')
    currentOrder.value = orders.find(o => o.line === props.line && o.status === 'running') ?? null
  } catch (e) {
    console.error('Failed to fetch orders for progress:', e)
  }
}

async function fetchEfficiency() {
  try {
    const startDate = props.range.start.toISOString().split('T')[0]
    const endDate   = props.range.end.toISOString().split('T')[0]
    const raw = await apiFetch<{ date: string; value: number }[]>(
      `/dashboard/efficiency?period=${props.period}&startDate=${startDate}&endDate=${endDate}&lineId=${props.line}`
    )
    efficiencyAvg.value = raw.length
      ? Math.round(raw.reduce((a, r) => a + r.value, 0) / raw.length * 10) / 10
      : 0
  } catch (e) {
    console.error('Failed to fetch efficiency:', e)
  }
}

watch([() => props.period, () => props.range, () => props.line], () => {
  fetchStats()
  fetchCurrentOrder()
  fetchEfficiency()
}, { immediate: true })

watch(statsSignalR, (data) => {
  if (!data) return
  uptime.value = { value: data.lineUptime,      variation: data.lineUptimeVariation }
  waste.value  = { value: data.wastePercentage, variation: data.wastePercentageVariation }
})

watch(ordersSignalR, () => fetchCurrentOrder())

const progress = computed(() => {
  const o = currentOrder.value
  if (!o) return { pct: 0, label: null, orderNumber: null }
  let pct: number
  let label: string
  pct   = o.volume > 0 ? Math.round(o.producedVolume / o.volume * 100) : 0
  label = `${o.producedVolume.toLocaleString()} / ${o.volume.toLocaleString()} ${o.uomCode}`
  return { pct, label, orderNumber: o.orderNumber }
})
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <!-- Line Uptime -->
    <UPageCard
      icon="i-lucide-timer"
      :title="t('home.stats.lineUptime')"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">{{ uptime.value }}%</span>
        <UBadge
          :color="uptime.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ uptime.variation > 0 ? '+' : '' }}{{ uptime.variation }}%
        </UBadge>
      </div>
    </UPageCard>

    <!-- Production Progress -->
    <UPageCard
      icon="i-lucide-trending-up"
      :title="t('home.stats.productionProgress')"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <template v-if="progress.orderNumber">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-2xl font-semibold text-highlighted">{{ progress.pct }}%</span>
          <UBadge
            :color="progress.pct > 100 ? 'warning' : 'success'"
            variant="subtle"
            class="text-xs"
          >
            {{ progress.pct > 100 ? t('home.stats.over') : t('home.stats.running') }}
          </UBadge>
        </div>
        <p class="text-xs text-muted">{{ progress.label }}</p>
        <p class="text-xs text-muted font-mono truncate">{{ progress.orderNumber }}</p>
      </template>
      <span v-else class="text-2xl font-semibold text-muted">—</span>
    </UPageCard>

    <!-- Waste % -->
    <UPageCard
      icon="i-lucide-trash-2"
      :title="t('home.stats.wastePct')"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">{{ waste.value }}%</span>
        <UBadge
          :color="waste.variation < 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ waste.variation > 0 ? '+' : '' }}{{ waste.variation }}%
        </UBadge>
      </div>
    </UPageCard>

    <!-- Line Efficiency -->
    <UPageCard
      icon="i-lucide-gauge"
      :title="t('home.stats.lineEfficiency')"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted">{{ efficiencyAvg }}%</span>
    </UPageCard>
  </UPageGrid>
</template>
