<script setup lang="ts">
import { h, resolveComponent, ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { ProductionEvent, EventType } from '../../types'

const props = defineProps<{ line: number }>()

const { t } = useI18n()
const UBadge = resolveComponent('UBadge')

const typeColor: Record<EventType, string> = {
  downtime_unplanned: 'error',
  downtime_planned:   'warning',
  changeover:         'info',
  quality_hold:       'warning',
  maintenance:        'primary',
  operator_note:      'neutral',
  safety:             'error',
}

const typeLabel = computed<Record<EventType, string>>(() => ({
  downtime_unplanned: t('events.types.downtime_unplanned'),
  downtime_planned:   t('events.types.downtime_planned'),
  changeover:         t('events.types.changeover'),
  quality_hold:       t('events.types.quality_hold'),
  maintenance:        t('events.types.maintenance'),
  operator_note:      t('events.types.operator_note'),
  safety:             t('events.types.safety'),
}))

const data = ref<ProductionEvent[]>([])
const loading = ref(true)

function formatDuration(startAt: string, endAt: string | null): string {
  const ms = (endAt ? new Date(endAt) : new Date()).getTime() - new Date(startAt).getTime()
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

async function fetchEvents() {
  loading.value = true
  try {
    data.value = await apiFetch<ProductionEvent[]>(`/events?limit=5&lineId=${props.line}`)
  } catch (e) {
    console.error('Failed to fetch production events:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchEvents)
watch(() => props.line, fetchEvents)

const columns: TableColumn<ProductionEvent>[] = [
  {
    accessorKey: 'createdAt',
    header: () => t('home.events.columns.time'),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    })
  },
  {
    accessorKey: 'lineName',
    header: () => t('home.events.columns.line'),
    cell: ({ row }) => h('span', { class: 'text-sm whitespace-nowrap' }, row.original.lineName)
  },
  {
    accessorKey: 'eventType',
    header: () => t('home.events.columns.type'),
    cell: ({ row }) => h(UBadge, {
      variant: 'subtle',
      color: typeColor[row.original.eventType] ?? 'neutral',
      class: 'text-xs'
    }, () => typeLabel.value[row.original.eventType] ?? row.original.eventType)
  },
  {
    id: 'duration',
    header: () => t('home.events.columns.duration'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted whitespace-nowrap' },
      formatDuration(row.original.startAt, row.original.endAt))
  },
  {
    accessorKey: 'title',
    header: () => t('home.events.columns.title'),
    cell: ({ row }) => h('span', {
      class: 'text-sm font-medium truncate block max-w-xs',
      title: row.original.title
    }, row.original.title)
  }
]
</script>

<template>
  <UCard class="shrink-0">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted uppercase mb-1">{{ t('home.events.title') }}</p>
          <p class="text-sm text-dimmed">{{ t('home.events.subtitle') }}</p>
        </div>
        <UButton
          to="/events"
          :label="t('common.viewAll')"
          color="neutral"
          variant="ghost"
          size="sm"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-16 text-sm text-dimmed">
      {{ t('home.events.loading') }}
    </div>

    <div v-else-if="!data.length" class="flex items-center justify-center h-16 text-sm text-dimmed">
      {{ t('home.events.empty') }}
    </div>

    <UTable
      v-else
      :data="data"
      :columns="columns"
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
