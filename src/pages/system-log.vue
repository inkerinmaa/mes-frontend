<script setup lang="ts">
import { useTemplateRef, h, resolveComponent, ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import { useRouter } from 'vue-router'
import { apiFetch } from '../utils/api'
import type { LogEntry, LogType, LogLevel } from '../types'
import { useMesUser } from '../composables/useMesUser'

const { t, locale } = useI18n()

const router = useRouter()
const { canSeeAdminUi } = useMesUser()

onMounted(() => {
  if (!canSeeAdminUi.value) router.replace('/')
})

const table = useTemplateRef('table')
const data = ref<LogEntry[]>([])
const isFetching = ref(true)

async function fetchLogs() {
  isFetching.value = true
  try {
    data.value = await apiFetch<LogEntry[]>('/logs?limit=1000')
  } catch (e) {
    console.error('Failed to fetch logs:', e)
  } finally {
    isFetching.value = false
  }
}

fetchLogs()

const typeColors: Record<LogType, 'primary' | 'info' | 'neutral' | 'warning' | 'success'> = {
  USER:        'primary',
  PROCESS:     'info',
  APP:         'neutral',
  EQUIPMENT:   'warning',
  INTEGRATION: 'success'
}

const levelColors: Record<LogLevel, 'neutral' | 'primary' | 'warning' | 'error'> = {
  DEBUG:    'neutral',
  INFO:     'primary',
  WARNING:  'warning',
  ERROR:    'error',
  CRITICAL: 'error'
}

const formatTs = (ts: string) =>
  new Date(ts).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })

const columns = computed<TableColumn<LogEntry>[]>(() => [
  {
    accessorKey: 'ts',
    header: () => t('systemLog.columns.time'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted whitespace-nowrap' }, formatTs(row.original.ts))
  },
  {
    accessorKey: 'type',
    header: () => t('systemLog.columns.type'),
    filterFn: 'equals',
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      const color = typeColors[row.original.type as LogType] ?? 'neutral'
      return h(UBadge, { variant: 'subtle', color, class: 'text-xs' }, () => row.original.type)
    }
  },
  {
    accessorKey: 'level',
    header: () => t('systemLog.columns.level'),
    filterFn: 'equals',
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      const color = levelColors[row.original.level as LogLevel] ?? 'neutral'
      const variant = row.original.level === 'CRITICAL' ? 'solid' : 'subtle'
      return h(UBadge, { variant, color, class: 'text-xs' }, () => row.original.level)
    }
  },
  {
    accessorKey: 'message',
    header: () => t('systemLog.columns.message'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, row.original.message)
  }
])

const typeFilter = ref('all')
const levelFilter = ref('all')

watch(typeFilter, (val) => {
  table.value?.tableApi?.getColumn('type')?.setFilterValue(val === 'all' ? undefined : val)
})

watch(levelFilter, (val) => {
  table.value?.tableApi?.getColumn('level')?.setFilterValue(val === 'all' ? undefined : val)
})

const pagination = ref({ pageIndex: 0, pageSize: 20 })
</script>

<template>
  <UDashboardPanel id="system-log">
    <template #header>
      <UDashboardNavbar :title="t('systemLog.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="typeFilter"
            :items="[
              { label: t('systemLog.allTypes'), value: 'all' },
              { label: 'USER',                  value: 'USER' },
              { label: 'PROCESS',               value: 'PROCESS' },
              { label: 'APP',                   value: 'APP' },
              { label: 'EQUIPMENT',             value: 'EQUIPMENT' },
              { label: 'INTEGRATION',           value: 'INTEGRATION' }
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            class="min-w-36"
          />
          <USelect
            v-model="levelFilter"
            :items="[
              { label: t('systemLog.allLevels'), value: 'all' },
              { label: 'DEBUG',                  value: 'DEBUG' },
              { label: 'INFO',                   value: 'INFO' },
              { label: 'WARNING',                value: 'WARNING' },
              { label: 'ERROR',                  value: 'ERROR' },
              { label: 'CRITICAL',               value: 'CRITICAL' }
            ]"
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            class="min-w-36"
          />
        </div>
        <span class="text-sm text-muted">
          {{ t('systemLog.entries', { n: table?.tableApi?.getFilteredRowModel().rows.length ?? data.length }) }}
        </span>
      </div>

      <UTable
        ref="table"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="shrink-0"
        :data="data"
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

      <div class="flex items-center justify-end gap-3 border-t border-default pt-4 mt-auto shrink-0">
        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
