<script setup lang="ts">
import { h, resolveComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { ProductListItem } from '../../types'
import { useLocalizedField } from '../../composables/useLocalizedField'

const { t } = useI18n()
const { localize } = useLocalizedField()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const router = useRouter()

const data = ref<ProductListItem[]>([])
const isFetching = ref(true)

async function fetchProducts() {
  isFetching.value = true
  try {
    data.value = await apiFetch<ProductListItem[]>('/products')
  } catch (e) {
    console.error('Failed to fetch products:', e)
  } finally {
    isFetching.value = false
  }
}

fetchProducts()

function openDetail(id: number) {
  router.push(`/master-data/products/${id}`)
}

const columns: TableColumn<ProductListItem>[] = [
  {
    accessorKey: 'number',
    header: () => t('masterData.products.columns.number'),
    cell: ({ row }) => h('span', { class: 'text-sm font-mono font-medium' }, row.original.number)
  },
  {
    accessorKey: 'name',
    header: () => t('masterData.products.columns.name'),
    cell: ({ row }) =>
      h(UButton, {
        variant: 'link',
        color: 'primary',
        label: localize(row.original.name, row.original.nameEng) ?? '—',
        class: 'px-0',
        onClick: () => openDetail(row.original.id)
      })
  },
  {
    accessorKey: 'groupName',
    header: () => t('masterData.products.columns.group'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, localize(row.original.groupName, row.original.groupNameEng) ?? '—')
  },
  {
    accessorKey: 'coverCode',
    header: () => t('masterData.products.columns.coverCode'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted font-mono' }, row.original.coverCode ?? '—')
  },
  {
    accessorKey: 'thickness',
    header: () => t('masterData.products.columns.thickness'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.thickness != null ? `${row.original.thickness} mm` : '—')
  },
  {
    accessorKey: 'density',
    header: () => t('masterData.products.columns.density'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.density != null ? `${row.original.density} kg/m³` : '—')
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h('div', { class: 'text-right' },
        h(UDropdownMenu, {
          content: { align: 'end' },
          items: [[{
            label: t('masterData.products.actions.viewDetails'),
            icon: 'i-lucide-file-text',
            onSelect: () => openDetail(row.original.id)
          }]]
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          class: 'ml-auto'
        }))
      )
  }
]
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-muted">{{ t('masterData.products.count', { n: data.length }) }}</p>
    </div>

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
  </div>
</template>
