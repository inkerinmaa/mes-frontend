<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Order, OrderStatus, Range } from '../../types'
import { useLocalizedField } from '../../composables/useLocalizedField'
import { orderRowClass } from '../../utils/orderRowClass'

const { t, locale } = useI18n()
const { localize } = useLocalizedField()

const props = defineProps<{ line: number; range: Range }>()

const UBadge = resolveComponent('UBadge')

const allOrders = ref<Order[]>([])
const error = ref('')

watch(() => props.line, async () => {
  error.value = ''
  try {
    allOrders.value = await apiFetch<Order[]>('/orders')
  } catch (e: any) {
    error.value = e?.message || 'Unknown error'
    console.error('Failed to fetch orders:', e)
  }
}, { immediate: true })

const displayedOrders = computed<Order[]>(() => {
  const from = new Date(props.range.start)
  from.setHours(0, 0, 0, 0)
  const to = new Date(props.range.end)
  to.setHours(23, 59, 59, 999)

  const lineOrders = allOrders.value.filter(o => {
    if (o.line !== props.line) return false
    if (o.status === 'cancelled') return false
    if (o.status === 'running') return true
    const val = o.plannedStartAt ?? o.completeAt ?? o.startAt
    if (!val) return false
    const d = new Date(val)
    return d >= from && d <= to
  })

  const completed = [...lineOrders]
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.completeAt ?? 0).getTime() - new Date(a.completeAt ?? 0).getTime())

  const running = lineOrders.filter(o => o.status === 'running')

  const queued = [...lineOrders]
    .filter(o => o.status !== 'completed' && o.status !== 'running')
    .sort((a, b) => {
      const ta = a.plannedStartAt ? new Date(a.plannedStartAt).getTime() : Infinity
      const tb = b.plannedStartAt ? new Date(b.plannedStartAt).getTime() : Infinity
      return ta - tb
    })

  return [...completed, ...running, ...queued]
})

const statusConfig = computed<Record<OrderStatus, { label: string; color: 'primary' | 'warning' | 'success' | 'error' | 'neutral' }>>(() => ({
  created:   { label: t('orders.status.created'),   color: 'neutral' },
  running:   { label: t('orders.status.running'),   color: 'primary' },
  paused:    { label: t('orders.status.paused'),    color: 'warning' },
  completed: { label: t('orders.status.completed'), color: 'success' },
  cancelled: { label: t('orders.status.cancelled'), color: 'error' }
}))

const columns: TableColumn<Order>[] = [
  {
    id: 'position',
    header: () => t('home.orders.columns.position'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted font-mono' }, String(row.index + 1))
  },
  {
    id: 'orderNumber',
    header: () => t('home.orders.columns.orderNumber'),
    cell: ({ row }) => h('span', { class: 'text-sm font-medium font-mono' }, row.original.orderNumber)
  },
  {
    id: 'productCode',
    header: () => t('home.orders.columns.productCode'),
    cell: ({ row }) => h('span', { class: 'text-sm font-mono' }, row.original.productCode)
  },
  {
    id: 'productName',
    header: () => t('home.orders.columns.productName'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted truncate' }, localize(row.original.productName, row.original.productNameEng) ?? '—')
  },
  {
    id: 'plannedStartAt',
    header: () => t('home.orders.columns.plannedStart'),
    cell: ({ row }) => {
      if (!row.original.plannedStartAt) return h('span', { class: 'text-muted text-xs' }, '—')
      return h('span', { class: 'text-sm' }, new Date(row.original.plannedStartAt).toLocaleString(
        locale.value === 'ru' ? 'ru-RU' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
      ))
    }
  },
  {
    id: 'volume',
    header: () => h('div', { class: 'text-right' }, t('home.orders.columns.volume')),
    cell: ({ row }) => h('div', { class: 'text-right text-sm font-medium' }, `${Number(row.original.volume).toLocaleString()} ${row.original.uomCode}`)
  },
  {
    id: 'status',
    header: () => t('home.orders.columns.status'),
    cell: ({ row }) => {
      const cfg = statusConfig.value[row.original.status as OrderStatus] ?? { label: row.original.status, color: 'neutral' as const }
      return h(UBadge, { variant: 'subtle', color: cfg.color }, () => cfg.label)
    }
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-xs text-muted uppercase">{{ t('home.orders.title') }}</p>
    </template>

    <div v-if="error" class="text-sm text-error p-4 border border-error/20 rounded-lg">
      Error loading orders: {{ error }}
    </div>

    <div v-else-if="!displayedOrders.length" class="flex items-center justify-center h-16 text-sm text-dimmed">
      {{ t('home.orders.empty') }}
    </div>

    <UTable
      v-else
      :data="displayedOrders"
      :columns="columns"
      :meta="{ class: { tr: (row: any) => orderRowClass(row.original.status) } }"
      class="shrink-0"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default'
      }"
    />
  </UCard>
</template>
