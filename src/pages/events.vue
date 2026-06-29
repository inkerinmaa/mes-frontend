<script setup lang="ts">
import { ref, watch, h, resolveComponent, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import { apiFetch } from '../utils/api'
import type { ProductionEvent, UnacknowledgedStop, EventType, EventSeverity } from '../types'
import { useDashboard } from '../composables/useDashboard'
import { useLines } from '../composables/useLines'
import { useSelectedLines } from '../composables/useSelectedLines'
import EventsAddModal from '../components/events/EventsAddModal.vue'

const { t, locale } = useI18n()

const { stopInserted } = useDashboard()
const { fetchLines } = useLines()
const { visibleLines } = useSelectedLines()
fetchLines()

// Unacknowledged stops
const stops = ref<UnacknowledgedStop[]>([])
const isFetchingStops = ref(false)

async function fetchStops() {
  isFetchingStops.value = true
  try {
    stops.value = await apiFetch<UnacknowledgedStop[]>('/events/unacknowledged')
  } catch (e) {
    console.error('Failed to fetch unacknowledged stops:', e)
  } finally {
    isFetchingStops.value = false
  }
}

watch(stopInserted, () => fetchStops())
fetchStops()

// Production events table
const events = ref<ProductionEvent[]>([])
const isFetchingEvents = ref(false)
const lineFilter = ref('all')
const typeFilter = ref('all')
const severityFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 20 })

async function fetchEvents() {
  isFetchingEvents.value = true
  try {
    const params = new URLSearchParams({ limit: '200' })
    if (lineFilter.value !== 'all') params.set('lineId', lineFilter.value)
    if (typeFilter.value !== 'all') params.set('eventType', typeFilter.value)
    if (severityFilter.value !== 'all') params.set('severity', severityFilter.value)
    events.value = await apiFetch<ProductionEvent[]>(`/events?${params}`)
    pagination.value.pageIndex = 0
  } catch (e) {
    console.error('Failed to fetch events:', e)
  } finally {
    isFetchingEvents.value = false
  }
}

watch([lineFilter, typeFilter, severityFilter], () => fetchEvents())
fetchEvents()

// Modal state
const modalOpen = ref(false)
const modalStop = ref<UnacknowledgedStop | null>(null)

function openAdd() {
  modalStop.value = null
  modalOpen.value = true
}

function openAnnotate(stop: UnacknowledgedStop) {
  modalStop.value = stop
  modalOpen.value = true
}

function onEventCreated() {
  fetchEvents()
  fetchStops()
}

// Formatting helpers
const formatTs = (ts: string) =>
  new Date(ts).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  })

function formatDuration(startAt: string, endAt: string | null): string {
  const ms = (endAt ? new Date(endAt) : new Date()).getTime() - new Date(startAt).getTime()
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

const eventTypeLabel = computed<Record<EventType, string>>(() => ({
  downtime_unplanned: t('events.types.downtime_unplanned'),
  downtime_planned:   t('events.types.downtime_planned'),
  changeover:         t('events.types.changeover'),
  quality_hold:       t('events.types.quality_hold'),
  maintenance:        t('events.types.maintenance'),
  operator_note:      t('events.types.operator_note'),
  safety:             t('events.types.safety'),
}))

const severityColor: Record<EventSeverity, 'neutral' | 'warning' | 'error'> = {
  info:     'neutral',
  warning:  'warning',
  critical: 'error',
}

const typeColor: Record<EventType, 'neutral' | 'info' | 'warning' | 'error' | 'primary' | 'success'> = {
  downtime_unplanned: 'error',
  downtime_planned:   'warning',
  changeover:         'info',
  quality_hold:       'warning',
  maintenance:        'primary',
  operator_note:      'neutral',
  safety:             'error',
}

const columns = computed<TableColumn<ProductionEvent>[]>(() => [
  {
    accessorKey: 'createdAt',
    header: () => t('events.columns.time'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' }, formatTs(row.original.createdAt))
  },
  {
    accessorKey: 'lineName',
    header: () => t('events.columns.line'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm whitespace-nowrap' }, row.original.lineName)
  },
  {
    accessorKey: 'eventType',
    header: () => t('events.columns.type'),
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      const color = typeColor[row.original.eventType] ?? 'neutral'
      return h(UBadge, { variant: 'subtle', color, class: 'text-xs' },
        () => eventTypeLabel.value[row.original.eventType] ?? row.original.eventType)
    }
  },
  {
    accessorKey: 'severity',
    header: () => t('events.columns.severity'),
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      const color = severityColor[row.original.severity] ?? 'neutral'
      return h(UBadge, { variant: 'subtle', color, class: 'text-xs capitalize' },
        () => row.original.severity)
    }
  },
  {
    accessorKey: 'title',
    header: () => t('events.columns.title'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm font-medium' }, row.original.title)
  },
  {
    id: 'duration',
    header: () => t('events.columns.duration'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        formatDuration(row.original.startAt, row.original.endAt))
  },
  {
    accessorKey: 'endAt',
    header: () => t('events.columns.status'),
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      return row.original.endAt
        ? h(UBadge, { variant: 'subtle', color: 'neutral', class: 'text-xs' }, () => t('events.status.closed'))
        : h(UBadge, { variant: 'subtle', color: 'success', class: 'text-xs' }, () => t('events.status.open'))
    }
  },
  {
    accessorKey: 'createdBy',
    header: () => t('events.columns.by'),
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted' }, row.original.createdBy ?? '—')
  },
])
</script>

<template>
  <UDashboardPanel id="events">
    <template #header>
      <UDashboardNavbar :title="t('events.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton :label="t('events.addEvent')" icon="i-lucide-plus" size="sm" @click="openAdd" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Unacknowledged stops alert -->
      <div v-if="stops.length > 0" class="shrink-0 rounded-lg border border-error/30 bg-error/5 p-4 space-y-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" class="text-error size-4" />
          <p class="text-sm font-semibold text-error">
            {{ t('events.unacknowledgedStops', { n: stops.length }, stops.length) }}
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="stop in stops"
            :key="stop.id"
            class="flex items-center justify-between gap-3 rounded-md border border-default bg-background px-3 py-2"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-sm font-medium text-muted shrink-0">{{ stop.lineName }}</span>
              <span class="text-sm text-muted truncate">{{ formatTs(stop.startAt) }}</span>
              <span class="text-xs text-muted shrink-0">{{ stop.durationMinutes }} min</span>
            </div>
            <UButton
              :label="t('events.annotate')"
              size="xs"
              color="neutral"
              variant="outline"
              @click="openAnnotate(stop)"
            />
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="lineFilter"
            :items="[
              { label: t('events.allLines'), value: 'all' },
              ...visibleLines.map(l => ({ label: l.name, value: String(l.id) }))
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            class="min-w-32"
          />
          <USelect
            v-model="typeFilter"
            :items="[
              { label: t('events.allTypes'),                         value: 'all' },
              { label: t('events.types.downtime_unplanned'),         value: 'downtime_unplanned' },
              { label: t('events.types.downtime_planned'),           value: 'downtime_planned' },
              { label: t('events.types.changeover'),                 value: 'changeover' },
              { label: t('events.types.quality_hold'),               value: 'quality_hold' },
              { label: t('events.types.maintenance'),                value: 'maintenance' },
              { label: t('events.types.operator_note'),              value: 'operator_note' },
              { label: t('events.types.safety'),                     value: 'safety' },
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            class="min-w-40"
          />
          <USelect
            v-model="severityFilter"
            :items="[
              { label: t('events.allSeverities'),           value: 'all' },
              { label: t('events.severities.info'),         value: 'info' },
              { label: t('events.severities.warning'),      value: 'warning' },
              { label: t('events.severities.critical'),     value: 'critical' },
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            class="min-w-36"
          />
        </div>
        <span class="text-sm text-muted">{{ t('events.count', { n: events.length }, events.length) }}</span>
      </div>

      <!-- Events table -->
      <UTable
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="shrink-0"
        :data="events"
        :columns="columns"
        :loading="isFetchingEvents"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-end gap-3 border-t border-default pt-4 mt-auto shrink-0">
        <UPagination
          :default-page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="events.length"
          @update:page="(p: number) => pagination.pageIndex = p - 1"
        />
      </div>
    </template>
  </UDashboardPanel>

  <EventsAddModal v-model:open="modalOpen" :stop="modalStop" @created="onEventCreated" />
</template>
