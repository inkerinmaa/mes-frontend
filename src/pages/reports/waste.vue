<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Order, WasteReportRow } from '../../types'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')
const { fetchLines } = useLines()
const { visibleLines } = useSelectedLines()
onMounted(fetchLines)

// ── filter state ──────────────────────────────────────────────────────────────

const mode        = ref<'period' | 'order'>('period')
const lineId      = ref<number>(visibleLines.value[0]?.id ?? 1)
const startDate   = ref('2026-04-01')
const endDate     = ref('2026-04-30')
const orderNumber = ref('')

const lineOptions = computed(() =>
  visibleLines.value.map(l => ({ label: l.name, value: l.id }))
)

watch(visibleLines, (vl) => {
  if (vl.length > 0 && !vl.some(l => l.id === lineId.value)) {
    lineId.value = vl[0].id
  }
})

const modeOptions = computed(() => [
  { label: t('common.period'), value: 'period' },
  { label: t('common.order'),  value: 'order'  },
])

// ── orders for dropdown ───────────────────────────────────────────────────────

const allOrders = ref<Order[]>([])
const orderOptions = computed(() =>
  allOrders.value
    .filter(o => o.line === lineId.value && o.status === 'completed')
    .map(o => ({ label: `${o.orderNumber} — ${o.sku}`, value: o.orderNumber }))
)

async function fetchOrders() {
  try { allOrders.value = await apiFetch<Order[]>('/orders') } catch {}
}
fetchOrders()

// ── report fetch ──────────────────────────────────────────────────────────────

const rows      = ref<WasteReportRow[]>([])
const isLoading = ref(false)
const generated = ref(false)

async function generateReport() {
  isLoading.value = true
  generated.value = false
  try {
    let url = '/reports/waste'
    if (mode.value === 'order') {
      if (!orderNumber.value) return
      url += `?orderNumber=${encodeURIComponent(orderNumber.value)}`
    } else {
      url += `?lineId=${lineId.value}&startDate=${startDate.value}&endDate=${endDate.value}`
    }
    rows.value = await apiFetch<WasteReportRow[]>(url)
    generated.value = true
  } catch (e) {
    console.error('Waste report error:', e)
  } finally {
    isLoading.value = false
  }
}

// ── table columns ─────────────────────────────────────────────────────────────

const columns: TableColumn<WasteReportRow>[] = [
  {
    accessorKey: 'orderNumber',
    header: () => t('reports.waste.columns.order'),
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.orderNumber)
  },
  {
    accessorKey: 'skuCode',
    header: () => t('reports.waste.columns.sku'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.skuCode ?? '—')
  },
  {
    accessorKey: 'skuName',
    header: () => t('reports.waste.columns.product'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.skuName ?? '—')
  },
  {
    accessorKey: 'startTs',
    header: () => t('reports.waste.columns.start'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.startTs.replace('T', ' '))
  },
  {
    accessorKey: 'durationH',
    header: () => t('reports.waste.columns.duration'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.durationH.toFixed(1))
  },
  {
    accessorKey: 'trimmingKg',
    header: () => t('reports.waste.columns.trimming'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.trimmingKg.toFixed(1))
  },
  {
    accessorKey: 'startupKg',
    header: () => t('reports.waste.columns.startup'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.startupKg.toFixed(1))
  },
  {
    accessorKey: 'rejectedKg',
    header: () => t('reports.waste.columns.rejected'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.rejectedKg.toFixed(1))
  },
  {
    accessorKey: 'totalKg',
    header: () => t('reports.waste.columns.total'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums font-medium' }, row.original.totalKg.toFixed(1))
  },
  {
    accessorKey: 'wastePct',
    header: () => t('reports.waste.columns.wastePct'),
    cell: ({ row }) => {
      const v = row.original.wastePct
      const color = v <= 12 ? 'success' : v <= 16 ? 'warning' : 'error'
      return h(UBadge, { color, variant: 'subtle', label: `${v.toFixed(1)}%` })
    }
  },
]

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv() {
  const headers = [
    'Order', 'SKU', 'Product', 'Start', 'End', 'Duration (h)',
    'Trimming (kg)', 'Startup (kg)', 'Rejected (kg)', 'Total (kg)', 'Waste %'
  ]
  const csvRows = rows.value.map(r => [
    r.orderNumber, r.skuCode ?? '', r.skuName ?? '',
    r.startTs, r.endTs, r.durationH.toFixed(1),
    r.trimmingKg.toFixed(1), r.startupKg.toFixed(1),
    r.rejectedKg.toFixed(1), r.totalKg.toFixed(1), r.wastePct.toFixed(1)
  ].map(v => `"${v}"`).join(','))

  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `waste-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── totals ────────────────────────────────────────────────────────────────────

const totals = computed(() => ({
  trimming: rows.value.reduce((s, r) => s + r.trimmingKg, 0),
  startup:  rows.value.reduce((s, r) => s + r.startupKg, 0),
  rejected: rows.value.reduce((s, r) => s + r.rejectedKg, 0),
  total:    rows.value.reduce((s, r) => s + r.totalKg, 0),
  avgPct:   rows.value.length ? rows.value.reduce((s, r) => s + r.wastePct, 0) / rows.value.length : 0,
}))
</script>

<template>
  <div class="p-6 space-y-6 shrink-0">
    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-4">
      <UFormField :label="t('common.line')">
        <USelect
          v-model="lineId"
          :items="lineOptions"
          value-key="value"
          label-key="label"
          class="w-52"
        />
      </UFormField>

      <UFormField :label="t('common.filterBy')">
        <USelect
          v-model="mode"
          :items="modeOptions"
          value-key="value"
          label-key="label"
          class="w-32"
        />
      </UFormField>

      <template v-if="mode === 'period'">
        <UFormField :label="t('common.from')">
          <UInput v-model="startDate" type="date" class="w-40" />
        </UFormField>
        <UFormField :label="t('common.to')">
          <UInput v-model="endDate" type="date" class="w-40" />
        </UFormField>
      </template>

      <template v-else>
        <UFormField :label="t('common.order')">
          <USelect
            v-model="orderNumber"
            :items="orderOptions"
            value-key="value"
            label-key="label"
            placeholder="Select order…"
            class="w-72"
          />
        </UFormField>
      </template>

      <div class="flex gap-2 items-end">
        <UButton
          :label="t('common.generate')"
          icon="i-lucide-play"
          :loading="isLoading"
          @click="generateReport"
        />
        <UButton
          v-if="rows.length > 0"
          :label="t('common.exportCsv')"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          @click="exportCsv"
        />
      </div>
    </div>

    <!-- Summary cards -->
    <div v-if="generated && rows.length > 0" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <UPageCard>
        <template #title><span class="text-sm text-muted">{{ t('reports.waste.cards.totalWaste') }}</span></template>
        <p class="text-2xl font-semibold tabular-nums">{{ totals.total.toFixed(0) }} <span class="text-sm font-normal text-muted">kg</span></p>
      </UPageCard>
      <UPageCard>
        <template #title><span class="text-sm text-muted">{{ t('reports.waste.cards.trimming') }}</span></template>
        <p class="text-2xl font-semibold tabular-nums">{{ totals.trimming.toFixed(0) }} <span class="text-sm font-normal text-muted">kg</span></p>
      </UPageCard>
      <UPageCard>
        <template #title><span class="text-sm text-muted">{{ t('reports.waste.cards.startupLosses') }}</span></template>
        <p class="text-2xl font-semibold tabular-nums">{{ totals.startup.toFixed(0) }} <span class="text-sm font-normal text-muted">kg</span></p>
      </UPageCard>
      <UPageCard>
        <template #title><span class="text-sm text-muted">{{ t('reports.waste.cards.avgWastePct') }}</span></template>
        <p class="text-2xl font-semibold tabular-nums">{{ totals.avgPct.toFixed(1) }}<span class="text-sm font-normal text-muted">%</span></p>
      </UPageCard>
    </div>

    <!-- Results table -->
    <div v-if="generated">
      <p v-if="rows.length === 0" class="text-sm text-muted">
        {{ t('reports.waste.empty') }}
      </p>

      <UTable
        v-else
        :data="rows"
        :columns="columns"
        :loading="isLoading"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

    </div>
  </div>
</template>
