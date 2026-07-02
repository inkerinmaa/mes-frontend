<script setup lang="ts">
import { h, resolveComponent, ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Order, PkfReportRow } from '../../types'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')
const { fetchLines } = useLines()
const { visibleLines } = useSelectedLines()
onMounted(fetchLines)

// ── filter state ──────────────────────────────────────────────────────────────

const mode     = ref<'period' | 'order'>('period')
const lineId   = ref<number>(visibleLines.value[0]?.id ?? 1)
const startDate = ref('2026-04-01')
const endDate   = ref('2026-04-30')
const orderNumber = ref('')

const lineOptions = computed(() =>
  visibleLines.value.map(l => ({ label: l.name, value: l.id }))
)

// Clamp lineId to first visible line when visibleLines changes (e.g. after lines load)
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
    .map(o => ({ label: `${o.orderNumber} — ${o.productCode}`, value: o.orderNumber }))
)

async function fetchOrders() {
  try { allOrders.value = await apiFetch<Order[]>('/orders') } catch {}
}
fetchOrders()

// ── report fetch ──────────────────────────────────────────────────────────────

const rows       = ref<PkfReportRow[]>([])
const isLoading  = ref(false)
const generated  = ref(false)

async function generateReport() {
  isLoading.value = true
  generated.value = false
  try {
    let url = '/reports/pkf'
    if (mode.value === 'order') {
      if (!orderNumber.value) return
      url += `?orderNumber=${encodeURIComponent(orderNumber.value)}`
    } else {
      url += `?lineId=${lineId.value}&startDate=${startDate.value}&endDate=${endDate.value}`
    }
    rows.value = await apiFetch<PkfReportRow[]>(url)
    generated.value = true
  } catch (e) {
    console.error('PKF report error:', e)
  } finally {
    isLoading.value = false
  }
}

// ── table columns ─────────────────────────────────────────────────────────────

const columns: TableColumn<PkfReportRow>[] = [
  {
    accessorKey: 'orderNumber',
    header: () => t('reports.pkf.columns.order'),
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.orderNumber)
  },
  {
    accessorKey: 'productCode',
    header: () => t('reports.pkf.columns.sku'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.productCode ?? '—')
  },
  {
    accessorKey: 'productName',
    header: () => t('reports.pkf.columns.product'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.productName ?? '—')
  },
  {
    accessorKey: 'startTs',
    header: () => t('reports.pkf.columns.start'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.startTs.replace('T', ' '))
  },
  {
    accessorKey: 'durationH',
    header: () => t('reports.pkf.columns.duration'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.durationH.toFixed(1))
  },
  {
    accessorKey: 'basaltT',
    header: () => t('reports.pkf.columns.basalt'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.basaltT.toFixed(3))
  },
  {
    accessorKey: 'binderKg',
    header: () => t('reports.pkf.columns.binder'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.binderKg.toFixed(1))
  },
  {
    accessorKey: 'woolT',
    header: () => t('reports.pkf.columns.wool'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums font-medium' }, row.original.woolT.toFixed(3))
  },
  {
    accessorKey: 'wasteKg',
    header: () => t('reports.pkf.columns.waste'),
    cell: ({ row }) => h('span', { class: 'text-sm tabular-nums' }, row.original.wasteKg.toFixed(1))
  },
  {
    accessorKey: 'avgEfficiency',
    header: () => t('reports.pkf.columns.efficiency'),
    cell: ({ row }) => {
      const v = row.original.avgEfficiency
      const color = v >= 88 ? 'success' : v >= 80 ? 'warning' : 'error'
      return h(UBadge, { color, variant: 'subtle', label: `${v.toFixed(1)}%` })
    }
  },
]

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv() {
  const headers = [
    'Order', 'SKU', 'Product', 'Start', 'End', 'Duration (h)',
    'Basalt (t)', 'Binder (kg)', 'Wool (t)', 'Waste (kg)', 'Efficiency (%)'
  ]
  const csvRows = rows.value.map(r => [
    r.orderNumber, r.productCode ?? '', r.productName ?? '',
    r.startTs, r.endTs, r.durationH.toFixed(1),
    r.basaltT.toFixed(3), r.binderKg.toFixed(1), r.woolT.toFixed(3),
    r.wasteKg.toFixed(1), r.avgEfficiency.toFixed(1)
  ].map(v => `"${v}"`).join(','))

  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pkf-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
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

    <!-- Results table -->
    <div v-if="generated">
      <p v-if="rows.length === 0" class="text-sm text-muted">
        {{ t('reports.pkf.empty') }}
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
