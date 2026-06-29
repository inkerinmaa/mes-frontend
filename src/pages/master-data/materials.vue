<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Material } from '../../types'
import { useLocalizedField } from '../../composables/useLocalizedField'

const { t } = useI18n()
const { localize } = useLocalizedField()

const data = ref<Material[]>([])
const isFetching = ref(true)

async function fetchMaterials() {
  isFetching.value = true
  try {
    data.value = await apiFetch<Material[]>('/materials')
  } catch (e) {
    console.error('Failed to fetch materials:', e)
  } finally {
    isFetching.value = false
  }
}
onMounted(fetchMaterials)

const columns: TableColumn<Material>[] = [
  {
    accessorKey: 'code',
    header: () => t('masterData.materials.columns.code'),
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.code)
  },
  {
    accessorKey: 'name',
    header: () => t('masterData.materials.columns.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-sm' }, localize(row.original.name, row.original.nameEng))
  },
  {
    accessorKey: 'unit',
    header: () => t('masterData.materials.columns.unit'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.unit)
  },
  {
    accessorKey: 'stockQuantity',
    header: () => h('div', { class: 'text-right' }, t('masterData.materials.columns.stock')),
    cell: ({ row }) =>
      h('div', { class: 'text-right tabular-nums text-sm' },
        `${row.original.stockQuantity.toLocaleString()} ${row.original.unit}`)
  },
]
</script>

<template>
  <div class="p-6 space-y-4 shrink-0">
    <UTable
      :data="data"
      :columns="columns"
      :loading="isFetching"
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
    <p class="text-xs text-muted">{{ t('masterData.materials.count', { n: data.length }) }}</p>
  </div>
</template>
