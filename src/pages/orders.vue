<script setup lang="ts">
import { useTemplateRef, h, ref, computed, watch, resolveComponent, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { upperFirst } from 'scule'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type Row } from '@tanstack/table-core'
import { apiFetch } from '../utils/api'
import type { Order, OrderStatus } from '../types'
import { useMesUser } from '../composables/useMesUser'
import { useLines } from '../composables/useLines'
import { useSelectedLines } from '../composables/useSelectedLines'
import { useLocalizedField } from '../composables/useLocalizedField'
import { useSettings } from '../composables/useSettings'

const { t, locale } = useI18n()
const { localize } = useLocalizedField()

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const router = useRouter()

const toast = useToast()
const table = useTemplateRef('table')
const { canSeeAdminUi } = useMesUser()
const { lines, lineName, fetchLines } = useLines()
const { visibleLines } = useSelectedLines()
const { orderColorRunning, orderColorCompleted, orderColorQueued } = useSettings()
onMounted(fetchLines)

const columnFilters = ref([{
  id: 'productCode',
  value: ''
}])
const columnVisibility = useStorage('mes_orders_cols', { priority: false, productName: false, plannedCompleteAt: false, status: false })
const rowSelection = ref({})

const data = ref<Order[]>([])
const isFetching = ref(true)

async function fetchOrders() {
  isFetching.value = true
  try {
    data.value = await apiFetch<Order[]>('/orders')
  } catch (e) {
    console.error('Failed to fetch orders:', e)
  } finally {
    isFetching.value = false
  }
}

fetchOrders()

const statusConfig = computed<Record<OrderStatus, { label: string; color: 'primary' | 'warning' | 'success' | 'error' | 'neutral' }>>(() => ({
  created:   { label: t('orders.status.created'),   color: 'neutral' },
  running:   { label: t('orders.status.running'),   color: 'primary' },
  paused:    { label: t('orders.status.paused'),    color: 'warning' },
  completed: { label: t('orders.status.completed'), color: 'success' },
  cancelled: { label: t('orders.status.cancelled'), color: 'error' }
}))

async function resequenceOrder(orderId: number, direction: 'up' | 'down') {
  try {
    await apiFetch(`/orders/${orderId}/resequence`, {
      method: 'PATCH',
      body: JSON.stringify({ direction })
    })
    await fetchOrders()
  } catch (e: any) {
    toast.add({ title: t('orders.toast.resequenceFailed'), description: e?.message, color: 'error' })
  }
}

async function transitionStatus(order: Order, action: 'start' | 'pause' | 'complete') {
  try {
    await apiFetch(`/orders/${order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action })
    })
    await fetchOrders()
  } catch (e: any) {
    toast.add({ title: t('orders.toast.statusFailed'), description: e?.message, color: 'error' })
  }
}

function getRowItems(row: Row<Order>) {
  return [
    {
      type: 'label',
      label: t('common.actions')
    },
    {
      label: t('orders.actions.copyOrderNumber'),
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.orderNumber)
        toast.add({
          title: t('orders.toast.copied'),
          description: t('orders.toast.copiedDesc')
        })
      }
    },
    {
      type: 'separator'
    },
    {
      label: t('orders.actions.viewDetails'),
      icon: 'i-lucide-list',
      onSelect() {
        router.push(`/orders/${row.original.id}`)
      }
    },
    {
      label: t('orders.actions.reschedule'),
      icon: 'i-lucide-calendar',
      onSelect() {
        rescheduleOrder.value = row.original
        rescheduleOpen.value  = true
      }
    },
    ...(canSeeAdminUi.value ? [
      {
        type: 'separator' as const
      },
      {
        label: t('orders.actions.cancel'),
        icon: 'i-lucide-trash',
        color: 'error' as const,
        async onSelect() {
          try {
            await apiFetch(`/orders/${row.original.id}`, { method: 'DELETE' })
            toast.add({ title: t('orders.toast.cancelled'), description: `Order #${row.original.orderNumber} has been cancelled.`, color: 'success' })
            await fetchOrders()
          } catch {
            toast.add({ title: t('common.error'), description: t('orders.toast.cancelFailed'), color: 'error' })
          }
        }
      }
    ] : [])
  ]
}

const columns = computed<TableColumn<Order>[]>(() => [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
  {
    accessorKey: 'orderNumber',
    header: () => t('orders.columns.orderNumber'),
    cell: ({ row }) =>
      h(UButton, {
        variant: 'link',
        color: 'primary',
        label: row.original.orderNumber,
        class: 'px-0 font-medium',
        onClick: () => router.push(`/orders/${row.original.id}`)
      })
  },
  {
    accessorKey: 'productCode',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: t('orders.columns.productCode'),
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'productName',
    header: () => t('orders.columns.productName'),
    cell: ({ row }) => localize(row.original.productName, row.original.productNameEng) ?? '—'
  },
  {
    accessorKey: 'priority',
    header: () => t('orders.columns.priority'),
    filterFn: 'equals',
    cell: ({ row }) => {
      const color = {
        High: 'error' as const,
        Medium: 'warning' as const,
        Low: 'success' as const
      }[row.original.priority] || 'neutral' as const

      return h(UBadge, { variant: 'subtle', color }, () => t(`orders.priority.${row.original.priority}`))
    }
  },
  {
    accessorKey: 'volume',
    header: () => h('div', { class: 'text-right' }, t('orders.columns.volume')),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, `${row.original.volume.toLocaleString()} ${row.original.uomCode}`)
  },
  {
    accessorKey: 'producedPackages',
    header: () => h('div', { class: 'text-right' }, t('orders.columns.produced')),
    cell: ({ row }) => {
      const o = row.original
      if (o.cage) {
        const pct = o.volume > 0 ? Math.round(o.producedPackages / o.volume * 100) : 0
        return h('div', { class: 'text-right' }, [
          h('span', { class: 'font-medium' }, o.producedPackages.toLocaleString()),
          h('span', { class: 'text-muted text-xs ml-1' }, `(${pct}%)`)
        ])
      }
      if (!o.producedVolume) return h('div', { class: 'text-right text-muted text-xs' }, '—')
      const pct = o.volume > 0 ? Math.round(o.producedVolume / o.volume * 100) : 0
      return h('div', { class: 'text-right' }, [
        h('span', { class: 'font-medium' }, `${o.producedVolume.toLocaleString()} ${o.uomCode}`),
        h('span', { class: 'text-muted text-xs ml-1' }, `(${pct}%)`)
      ])
    }
  },
  {
    accessorKey: 'line',
    header: () => t('orders.columns.line'),
    filterFn: 'equals',
    cell: ({ row }) => lineName(row.original.line)
  },
  {
    accessorKey: 'dueDate',
    header: () => t('orders.columns.dueDate'),
    cell: ({ row }) => {
      if (!row.original.dueDate) return h('span', { class: 'text-muted text-xs' }, '—')
      return new Date(row.original.dueDate).toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
  },
  {
    accessorKey: 'sequence',
    header: () => t('orders.columns.queue'),
    cell: ({ row }) => {
      const s = row.original.status as OrderStatus
      const seq = row.original.sequence

      let badge
      if (s === 'created' || s === 'paused') {
        let label: string
        let color: 'warning' | 'neutral'
        if (seq === 'Next') {
          label = t('orders.queue.next')
          color = 'warning'
        } else if (seq.startsWith('Next+')) {
          label = t('orders.queue.nextPlus', { n: seq.slice(5) })
          color = 'neutral'
        } else {
          label = seq
          color = 'neutral'
        }
        badge = h(UBadge, { variant: 'subtle', color }, () => label)
      } else {
        const cfg = statusConfig.value[s] ?? { label: s, color: 'neutral' as const }
        badge = h(UBadge, { variant: 'subtle', color: cfg.color }, () => cfg.label)
      }

      const isQueued = s === 'created' || s === 'paused'
      if (!canSeeAdminUi.value || !isQueued) return badge

      return h('div', { class: 'flex items-center gap-1.5' }, [
        badge,
        h('div', { class: 'flex flex-col' }, [
          h(UButton, {
            icon: 'i-lucide-chevron-up',
            size: 'xs',
            color: 'neutral',
            variant: 'ghost',
            class: 'h-4 w-4 p-0',
            onClick: (e: Event) => { e.stopPropagation(); resequenceOrder(row.original.id, 'up') }
          }),
          h(UButton, {
            icon: 'i-lucide-chevron-down',
            size: 'xs',
            color: 'neutral',
            variant: 'ghost',
            class: 'h-4 w-4 p-0',
            onClick: (e: Event) => { e.stopPropagation(); resequenceOrder(row.original.id, 'down') }
          })
        ])
      ])
    }
  },
  {
    accessorKey: 'plannedStartAt',
    header: () => t('orders.columns.plannedStart'),
    cell: ({ row }) => {
      if (!row.original.plannedStartAt) return h('span', { class: 'text-muted text-xs' }, '—')
      return new Date(row.original.plannedStartAt).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    }
  },
  {
    accessorKey: 'startAt',
    header: () => t('orders.columns.startAt'),
    cell: ({ row }) => {
      if (!row.original.startAt) return h('span', { class: 'text-muted text-xs' }, '—')
      return new Date(row.original.startAt).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    }
  },
  {
    accessorKey: 'plannedCompleteAt',
    header: () => t('orders.columns.plannedComplete'),
    cell: ({ row }) => {
      if (!row.original.plannedCompleteAt) return h('span', { class: 'text-muted text-xs' }, '—')
      return new Date(row.original.plannedCompleteAt).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    }
  },
  {
    accessorKey: 'status',
    header: () => t('orders.columns.status'),
    enableHiding: true,
    cell: ({ row }) => {
      const cfg = statusConfig.value[row.original.status as OrderStatus] ?? { label: row.original.status, color: 'neutral' as const }
      return h(UBadge, { variant: 'subtle', color: cfg.color }, () => cfg.label)
    }
  },
  {
    id: 'startStop',
    header: () => t('orders.columns.control'),
    cell: ({ row }) => {
      const s = row.original.status as OrderStatus
      const lineData = lines.value.find(l => l.id === row.original.line)
      if (!canSeeAdminUi.value || lineData?.orderControlEnabled === false) return null
      if (s === 'created' || s === 'paused') {
        return h(UButton, { size: 'xs', color: 'primary', variant: 'subtle', label: t('orders.control.start'), onClick: () => transitionStatus(row.original, 'start') })
      }
      if (s === 'running') {
        return h('div', { class: 'flex gap-1' }, [
          h(UButton, { size: 'xs', color: 'warning', variant: 'subtle', label: t('orders.control.pause'), onClick: () => transitionStatus(row.original, 'pause') }),
          h(UButton, { size: 'xs', color: 'success', variant: 'subtle', label: t('orders.control.complete'), onClick: () => transitionStatus(row.original, 'complete') })
        ])
      }
      return h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', label: s === 'completed' ? t('orders.control.done') : '—', disabled: true })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: {
              align: 'end'
            },
            items: getRowItems(row)
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
])

const lineFilter = ref('all')
const statusFilter = ref<string[]>([])

const statusFilterItems = computed(() =>
  (Object.entries(statusConfig.value) as Array<[string, { label: string; color: string }]>).map(([value, cfg]) => ({
    label: cfg.label,
    type: 'checkbox' as const,
    checked: statusFilter.value.includes(value),
    onUpdateChecked: (checked: boolean) => {
      statusFilter.value = checked
        ? [...statusFilter.value, value]
        : statusFilter.value.filter(s => s !== value)
    },
    onSelect: (e?: Event) => e?.preventDefault()
  }))
)

// Date range filter (pre-filters data before TanStack Table sees it)
const dateField = ref<'plannedStartAt' | 'dueDate' | 'plannedCompleteAt'>('plannedStartAt')

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
const tomorrow  = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
const dateFrom = ref(isoDate(yesterday))
const dateTo   = ref(isoDate(tomorrow))

function sortOrders(orders: Order[]): Order[] {
  const priority = (s: string) => s === 'completed' ? 0 : s === 'running' ? 1 : (s === 'created' || s === 'paused') ? 2 : 3
  return [...orders].sort((a, b) => {
    const pa = priority(a.status), pb = priority(b.status)
    if (pa !== pb) return pa - pb
    if (a.status === 'completed' && b.status === 'completed')
      return (b.completeAt ?? '').localeCompare(a.completeAt ?? '')
    if ((a.status === 'created' || a.status === 'paused') && (b.status === 'created' || b.status === 'paused')) {
      if (!a.plannedStartAt && !b.plannedStartAt) return 0
      if (!a.plannedStartAt) return 1
      if (!b.plannedStartAt) return -1
      return a.plannedStartAt.localeCompare(b.plannedStartAt)
    }
    return 0
  })
}

function getRowStyle(order: Order): Record<string, string> {
  if (order.status === 'completed')                                  return { backgroundColor: orderColorCompleted.value }
  if (order.status === 'running')                                    return { backgroundColor: orderColorRunning.value }
  if (order.status === 'created' || order.status === 'paused')      return { backgroundColor: orderColorQueued.value }
  return {}
}

const displayedData = computed(() => {
  let result = data.value

  if (statusFilter.value.length > 0) {
    result = result.filter(o => statusFilter.value.includes(o.status))
  }

  if (dateFrom.value || dateTo.value) {
    const from = dateFrom.value ? new Date(dateFrom.value) : null
    const to   = dateTo.value   ? new Date(dateTo.value + 'T23:59:59') : null
    result = result.filter(order => {
      const val = order[dateField.value]
      if (!val) return false
      const d = new Date(val)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }

  return sortOrders(result)
})

// Reschedule modal state
const rescheduleOpen  = ref(false)
const rescheduleOrder = ref<Order | null>(null)

watch(() => lineFilter.value, (newVal) => {
  if (!table?.value?.tableApi) return
  const col = table.value.tableApi.getColumn('line')
  col?.setFilterValue(newVal === 'all' ? undefined : Number(newVal))
})

const productFilter = computed({
  get: (): string => {
    return (table.value?.tableApi?.getColumn('productCode')?.getFilterValue() as string) || ''
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn('productCode')?.setFilterValue(value || undefined)
  }
})

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

function clearRowSelection() {
  rowSelection.value = {}
}
</script>

<template>
  <UDashboardPanel id="orders">
    <template #header>
      <UDashboardNavbar :title="t('orders.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <OrdersAddModal v-if="canSeeAdminUi" @created="fetchOrders" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="productFilter"
          class="max-w-sm"
          icon="i-lucide-search"
          :placeholder="t('orders.filterProduct')"
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <OrdersDeleteModal
            :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            :order-ids="table?.tableApi?.getFilteredSelectedRowModel().rows.map((r: any) => r.original.id)"
            @cancelled="() => { fetchOrders(); clearRowSelection() }"
          >
            <UButton
              v-if="canSeeAdminUi && table?.tableApi?.getFilteredSelectedRowModel().rows.length"
              :label="t('common.cancel')"
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
            >
              <template #trailing>
                <UKbd>
                  {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                </UKbd>
              </template>
            </UButton>
          </OrdersDeleteModal>

          <USelect
            v-model="lineFilter"
            :items="[
              { label: t('orders.allLines'), value: 'all' },
              ...visibleLines.map(l => ({ label: l.name, value: String(l.id) }))
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            placeholder="Filter line"
            class="min-w-28"
          />
          <UDropdownMenu
            :items="statusFilterItems"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
              class="min-w-32 justify-between"
            >
              {{ statusFilter.length === 0 ? t('orders.allStatuses') : t('orders.statusesSelected', { n: statusFilter.length }, statusFilter.length) }}
            </UButton>
          </UDropdownMenu>
          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              :label="t('orders.display')"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Date filter row -->
      <div class="flex flex-wrap items-center gap-1.5 shrink-0">
        <USelect
          v-model="dateField"
          :items="[
            { label: t('orders.dates.plannedStart'),    value: 'plannedStartAt' },
            { label: t('orders.dates.plannedComplete'), value: 'plannedCompleteAt' },
            { label: t('orders.dates.dueDate'),         value: 'dueDate' },
          ]"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
          class="min-w-40"
        />
        <UInput v-model="dateFrom" type="date" class="w-36" :placeholder="t('common.from')" />
        <span class="text-sm text-muted">—</span>
        <UInput v-model="dateTo" type="date" class="w-36" :placeholder="t('common.to')" />
        <UButton
          v-if="dateFrom || dateTo"
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="dateFrom = ''; dateTo = ''"
        />
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        :meta="{ style: { tr: (row: any) => getRowStyle(row.original) } }"
        class="shrink-0"
        :data="displayedData"
        :columns="columns"
        :loading="isFetching"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ t('orders.rowsSelected', { n: table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }) }}
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <OrdersRescheduleModal
    v-model:open="rescheduleOpen"
    :order="rescheduleOrder"
    @rescheduled="fetchOrders"
  />
</template>
