<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Period, Range, Order, OrderStatus } from '../../types'

const { t } = useI18n()

const props = defineProps<{
  period: Period
  range: Range
  line: number
}>()

const UBadge = resolveComponent('UBadge')

const allOrders = ref<Order[]>([])
const error = ref('')

watch([() => props.period, () => props.range, () => props.line], async () => {
  error.value = ''
  try {
    allOrders.value = await apiFetch<Order[]>('/orders')
  } catch (e: any) {
    error.value = e?.message || 'Unknown error'
    console.error('Failed to fetch orders:', e)
  }
}, { immediate: true })

type QueueEntry = {
  order: Order
  label: string
  labelColor: 'success' | 'info' | 'warning' | 'neutral'
}

const queueOrders = computed<QueueEntry[]>(() => {
  const lineOrders = allOrders.value.filter(o => o.line === props.line)

  const current = lineOrders.find(o => o.status === 'running')

  // Backend already sorts by seq_order for created/paused
  const queued = lineOrders
    .filter(o => o.status === 'created' || o.status === 'paused')
    .slice(0, 2)

  const recent = lineOrders
    .filter(o => o.status === 'completed' && o.completeAt)
    .sort((a, b) => new Date(b.completeAt!).getTime() - new Date(a.completeAt!).getTime())
    .slice(0, 2)
    .reverse()

  const result: QueueEntry[] = []
  recent.forEach((o, i) => result.push({ order: o, label: i === 0 ? t('home.orders.labels.prev1') : t('home.orders.labels.prev'), labelColor: 'neutral' }))
  if (current) result.push({ order: current, label: t('home.orders.labels.current'), labelColor: 'success' })
  queued.forEach((o, i) => result.push({ order: o, label: i === 0 ? t('home.orders.labels.next') : t('home.orders.labels.next1'), labelColor: i === 0 ? 'info' : 'warning' }))

  return result
})

const statusConfig = computed<Record<OrderStatus, { label: string; color: 'primary' | 'warning' | 'success' | 'error' | 'neutral' }>>(() => ({
  created:   { label: t('orders.status.created'),   color: 'neutral' },
  running:   { label: t('orders.status.running'),   color: 'primary' },
  paused:    { label: t('orders.status.paused'),    color: 'warning' },
  completed: { label: t('orders.status.completed'), color: 'success' },
  cancelled: { label: t('orders.status.cancelled'), color: 'error' }
}))

const columns: TableColumn<QueueEntry>[] = [
  {
    id: 'position',
    header: () => t('home.orders.columns.position'),
    cell: ({ row }) => h(UBadge, { variant: 'subtle', color: row.original.labelColor }, () => row.original.label)
  },
  {
    id: 'orderNumber',
    header: () => t('home.orders.columns.orderNumber'),
    cell: ({ row }) => h('span', { class: 'text-sm font-medium font-mono' }, row.original.order.orderNumber)
  },
  {
    id: 'productCode',
    header: () => t('home.orders.columns.productCode'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.order.productCode)
  },
  {
    id: 'status',
    header: () => t('home.orders.columns.status'),
    cell: ({ row }) => {
      const cfg = statusConfig.value[row.original.order.status] ?? { label: row.original.order.status, color: 'neutral' as const }
      return h(UBadge, { variant: 'subtle', color: cfg.color, class: 'text-xs' }, () => cfg.label)
    }
  },
  {
    id: 'dueDate',
    header: () => t('home.orders.columns.dueDate'),
    cell: ({ row }) => {
      if (!row.original.order.dueDate) return h('span', { class: 'text-muted text-xs' }, '—')
      return new Date(row.original.order.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1">{{ t('home.orders.title') }}</p>
        <p class="text-sm text-dimmed">{{ t('home.orders.subtitle') }}</p>
      </div>
    </template>

    <div v-if="error" class="text-sm text-error p-4 border border-error/20 rounded-lg">
      Error loading orders: {{ error }}
    </div>

    <div v-else-if="queueOrders.length === 0" class="flex items-center justify-center h-16 text-sm text-dimmed">
      {{ t('home.orders.empty') }}
    </div>

    <UTable
      v-else
      :data="queueOrders"
      :columns="columns"
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
