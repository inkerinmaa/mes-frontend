<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { OrderDetail, CageEntry, OrderAttribute, BinderType, PkfGroup } from '../../types'
import { useLines } from '../../composables/useLines'
import { useLocalizedField } from '../../composables/useLocalizedField'
import { useDashboard } from '../../composables/useDashboard'
import { useMesUser } from '../../composables/useMesUser'

const { t } = useI18n()
const { canSeeAdminUi, isAdmin, role } = useMesUser()

const UButton = resolveComponent('UButton')

const route = useRoute()
const router = useRouter()
const toast = useToast()

const orderId = computed(() => Number(route.params.id))

const order = ref<OrderDetail | null>(null)
const loading = ref(true)
const error = ref('')

async function fetchOrder() {
  loading.value = true
  error.value = ''
  try {
    order.value = await apiFetch<OrderDetail>(`/orders/${orderId.value}`)
  } catch (e: any) {
    error.value = e?.message || 'Failed to load order'
  } finally {
    loading.value = false
  }
}

const { lines, lineName, fetchLines } = useLines()
const { localize } = useLocalizedField()
const { orderProducedUpdated } = useDashboard()

// Order attributes
const attributes = ref<OrderAttribute[]>([])
const binderTypes = ref<BinderType[]>([])
const pkfGroups = ref<PkfGroup[]>([])
const editingAttributeId = ref<number | null>(null)
const attributeDraft = ref('')
const savingAttribute = ref(false)

async function fetchAttributes() {
  try {
    const [attrs, bts, pkfs] = await Promise.all([
      apiFetch<OrderAttribute[]>(`/orders/${orderId.value}/attributes`),
      apiFetch<BinderType[]>('/binder-types'),
      apiFetch<PkfGroup[]>('/pkf-groups')
    ])
    attributes.value = attrs
    binderTypes.value = bts
    pkfGroups.value = pkfs
  } catch {
    // no attributes for this product — leave empty
  }
}

function startEditAttribute(attr: OrderAttribute) {
  editingAttributeId.value = attr.attributeId
  attributeDraft.value = attr.value ?? attr.defaultValue ?? ''
}

async function saveAttribute(attr: OrderAttribute) {
  if (savingAttribute.value) return
  savingAttribute.value = true
  try {
    await apiFetch(`/orders/${orderId.value}/attributes/${attr.attributeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ value: String(attributeDraft.value) })
    })
    const idx = attributes.value.findIndex(a => a.attributeId === attr.attributeId)
    if (idx >= 0) attributes.value[idx] = { ...attributes.value[idx], value: attributeDraft.value }
    editingAttributeId.value = null
    toast.add({ title: t('orderDetail.parameters.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('orderDetail.parameters.toast.failed'), color: 'error' })
  } finally {
    savingAttribute.value = false
  }
}

function resolveAttributeLabel(attr: OrderAttribute): string {
  const val = attr.value ?? attr.defaultValue ?? ''
  if (attr.valueType === 'binder_type') {
    const bt = binderTypes.value.find(b => String(b.id) === val)
    if (bt) return localize(bt.name, bt.nameEng) ?? val
  }
  if (attr.valueType === 'pkf_group') {
    const pg = pkfGroups.value.find(g => String(g.id) === val)
    if (pg) return localize(pg.name, pg.nameEng) ?? val
  }
  return val
}

onMounted(() => { fetchOrder(); fetchLines(); fetchAttributes() })

// Real-time produced counter update from OPC UA via NATS → SignalR
// Re-fetch the full order so shiftProductions also refreshes alongside the counter
watch(orderProducedUpdated, (data) => {
  if (data && data.orderId === orderId.value) fetchOrder()
})

// Comment editing
const editingComment = ref(false)
const commentDraft = ref('')
function startEditComment() {
  commentDraft.value = order.value?.comment ?? ''
  editingComment.value = true
}
async function saveComment() {
  try {
    await apiFetch(`/orders/${orderId.value}/comment`, {
      method: 'PATCH',
      body: JSON.stringify({ comment: commentDraft.value || null })
    })
    if (order.value) order.value.comment = commentDraft.value || null
    editingComment.value = false
    toast.add({ title: t('orderDetail.comment.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('orderDetail.comment.toast.failed'), color: 'error' })
  }
}

// Waste recording (completed orders only)
const wasteDraft = ref<number | null>(null)
const savingWaste = ref(false)

watch(order, (o) => {
  if (o) wasteDraft.value = o.wasteQuantity
}, { immediate: true })

async function saveWaste() {
  if (wasteDraft.value === null || wasteDraft.value < 0) return
  savingWaste.value = true
  try {
    const result = await apiFetch<{ wasteQuantity: number; goodQuantity: number }>(
      `/orders/${orderId.value}/waste`,
      { method: 'PATCH', body: JSON.stringify({ wasteQuantity: wasteDraft.value }) }
    )
    if (order.value) {
      order.value.wasteQuantity = result.wasteQuantity
      order.value.goodQuantity = result.goodQuantity
    }
    toast.add({ title: t('orderDetail.waste.toast.saved'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('orderDetail.waste.toast.failed'), description: e?.message, color: 'error' })
  } finally {
    savingWaste.value = false
  }
}

// Add cage
const addingCage = ref(false)
async function addCage() {
  addingCage.value = true
  try {
    const cage = await apiFetch<CageEntry>(`/orders/${orderId.value}/cages`, { method: 'POST' })
    toast.add({ title: t('orderDetail.cages.toast.added', { n: cage.packages }), color: 'success' })
    await fetchOrder()
  } catch (e: any) {
    toast.add({ title: t('orderDetail.cages.toast.addFailed'), description: e?.message, color: 'error' })
  } finally {
    addingCage.value = false
  }
}

// Cage packages inline editing
const editingCageId = ref<number | null>(null)
const cagePackagesDraft = ref(0)
function startEditPackages(cage: CageEntry) {
  editingCageId.value = cage.id
  cagePackagesDraft.value = cage.packages
}
async function saveCagePackages(cage: CageEntry) {
  if (cagePackagesDraft.value <= 0) return
  try {
    await apiFetch(`/orders/${orderId.value}/cages/${cage.id}/packages`, {
      method: 'PATCH',
      body: JSON.stringify({ packages: cagePackagesDraft.value })
    })
    editingCageId.value = null
    toast.add({ title: t('orderDetail.cages.toast.packagesUpdated'), color: 'success' })
    await fetchOrder()
  } catch {
    toast.add({ title: t('orderDetail.cages.toast.packagesFailed'), color: 'error' })
  }
}

async function deleteCage(cage: CageEntry) {
  try {
    await apiFetch(`/orders/${orderId.value}/cages/${cage.id}`, { method: 'DELETE' })
    if (order.value) {
      order.value.cages = order.value.cages.filter(c => c.id !== cage.id)
      order.value.producedPackages -= cage.packages
    }
    toast.add({ title: t('orderDetail.cages.toast.removed'), color: 'success' })
  } catch {
    toast.add({ title: t('orderDetail.cages.toast.removeFailed'), color: 'error' })
  }
}

const formatTimestamp = (ts: string) =>
  new Date(ts).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

const producedTotal = computed(() => {
  if (!order.value) return 0
  return order.value.uomCode === 'pcs' ? order.value.producedPackages : Number(order.value.producedVolume)
})

const hasGoodQuantity = computed(() => order.value?.goodQuantity != null)

const producedCaption = computed(() =>
  hasGoodQuantity.value ? t('orderDetail.produced.captionWithGood') : t('orderDetail.produced.caption')
)

const progressPct = computed(() => {
  if (!order.value || order.value.volume === 0) return 0
  return Math.round(producedTotal.value / order.value.volume * 100)
})

// Admins can add cages/waste in any order state; operators only while running or paused
const canEditProduction = computed(() => {
  if (!order.value) return false
  if (isAdmin.value) return true
  if (role.value === 'operator') return order.value.status === 'running' || order.value.status === 'paused'
  return false
})

const manualWasteEnabled = computed(() =>
  lines.value.find(l => l.id === order.value?.line)?.manualWasteEnabled ?? true
)

const detailStatusColor = (s: string): any => ({
  created: 'neutral',
  running: 'success',
  paused:  'warning',
  completed: 'info',
  cancelled: 'error'
}[s] ?? 'neutral')

const cageColumns: TableColumn<CageEntry>[] = [
  {
    accessorKey: 'cageGuid',
    header: () => t('orderDetail.cages.columns.cageId'),
    cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.cageGuid)
  },
  {
    accessorKey: 'cageSize',
    header: () => h('div', { class: 'text-right' }, t('orderDetail.cages.columns.size')),
    cell: ({ row }) => h('div', { class: 'text-right text-muted text-sm' }, row.original.cageSize)
  },
  {
    accessorKey: 'packages',
    header: () => h('div', { class: 'text-right' }, t('orderDetail.cages.columns.packages')),
    cell: ({ row }) => {
      if (editingCageId.value === row.original.id) {
        return h('div', { class: 'flex items-center justify-end gap-1' }, [
          h('input', {
            type: 'number', min: 1, value: cagePackagesDraft.value,
            onInput: (e: Event) => { cagePackagesDraft.value = Number((e.target as HTMLInputElement).value) },
            class: 'w-16 text-right border border-default rounded px-2 py-0.5 text-sm bg-elevated text-highlighted',
            onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') saveCagePackages(row.original); if (e.key === 'Escape') editingCageId.value = null }
          }),
          h(UButton, { icon: 'i-lucide-check', color: 'success', variant: 'ghost', size: 'xs', onClick: () => saveCagePackages(row.original) }),
          h(UButton, { icon: 'i-lucide-x', color: 'neutral', variant: 'ghost', size: 'xs', onClick: () => { editingCageId.value = null } })
        ])
      }
      return h('div', { class: 'text-right flex items-center justify-end gap-1' }, [
        h('span', { class: 'font-medium' }, row.original.packages),
        h(UButton, { icon: 'i-lucide-pencil', color: 'neutral', variant: 'ghost', size: 'xs', onClick: () => startEditPackages(row.original) })
      ])
    }
  },
  {
    accessorKey: 'completedAt',
    header: () => t('orderDetail.cages.columns.completedAt'),
    cell: ({ row }) => formatTimestamp(row.original.completedAt)
  },
  {
    accessorKey: 'completedBy',
    header: () => t('orderDetail.cages.columns.completedBy'),
    cell: ({ row }) => row.original.completedBy || '—'
  },
  {
    id: 'remove',
    header: '',
    cell: ({ row }) => h(UButton, {
      icon: 'i-lucide-trash-2', color: 'error', variant: 'ghost', size: 'xs',
      onClick: () => deleteCage(row.original)
    })
  }
]
</script>

<template>
  <UDashboardPanel id="order-detail">
    <template #header>
      <UDashboardNavbar :title="order ? order.orderNumber : t('orderDetail.title')">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="router.push('/orders')" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center h-40 text-muted shrink-0">
        {{ t('orderDetail.loading') }}
      </div>

      <div v-else-if="error" class="text-error text-sm p-4 shrink-0">
        {{ error }}
      </div>

      <template v-else-if="order">
        <!-- Info cards: product number | product name | line | status | produced -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.product') }}</p>
            <p class="font-semibold text-highlighted font-mono">{{ order.productCode }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.productName') }}</p>
            <p class="font-semibold text-highlighted text-sm">{{ localize(order.productName, order.productNameEng) ?? '—' }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.line') }}</p>
            <p class="font-semibold text-highlighted">{{ lineName(order.line) }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.status') }}</p>
            <UBadge :color="detailStatusColor(order.status)" variant="subtle">
              {{ t(`orders.status.${order.status}`) }}
            </UBadge>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.produced') }}</p>
            <p class="font-semibold text-highlighted">
              {{ producedTotal.toLocaleString() }}<template v-if="hasGoodQuantity"> / {{ Number(order.goodQuantity).toLocaleString() }}</template> / {{ order.volume.toLocaleString() }} {{ order.uomCode }}
            </p>
            <p class="text-xs text-muted">{{ progressPct }}% · {{ producedCaption }}</p>
          </UCard>
        </div>

        <!-- Production Info table (2 columns) + Product Dimensions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
          <!-- Production Info -->
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <p class="text-xs text-muted uppercase">{{ t('orderDetail.productionInfo.title') }}</p>
            </template>
            <div class="grid grid-cols-2 divide-x divide-default">
              <!-- Column 1 -->
              <table class="w-full text-sm">
                <tbody>
                  <tr v-if="order.productPcsInPack != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.pcsInPack') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productPcsInPack }}</td>
                  </tr>
                  <tr v-if="order.productPacksInPackage != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.packsInPackage') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productPacksInPackage }}</td>
                  </tr>
                  <tr class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.totalVolume') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.volume.toLocaleString() }} {{ order.uomCode }}</td>
                  </tr>
                  <tr v-if="order.productPacksInPackage != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.totalPacks') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ Math.round(order.volume * order.productPacksInPackage).toLocaleString() }}</td>
                  </tr>
                  <tr v-if="order.productPcsInPack != null && order.productLength != null && order.productWidth != null && order.productThickness != null && order.productDensity != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.amount') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">
                      {{ Math.round(order.volume * order.productPcsInPack * (order.productLength / 1000) * (order.productWidth / 1000) * (order.productThickness / 1000) * order.productDensity).toLocaleString() }}
                    </td>
                  </tr>
                  <tr v-if="order.productNormWaste != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.normWaste') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productNormWaste }}</td>
                  </tr>
                  <tr v-if="order.productLineWidth != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.productLineWidth') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productLineWidth }}</td>
                  </tr>
                  <tr v-if="order.productEdgeTrimWidth != null" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.edgeTrimWidth') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productEdgeTrimWidth }}</td>
                  </tr>
                  <tr v-if="order.productWetEdgeTrimWidth != null">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col1.wetEdgeTrimWidth') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productWetEdgeTrimWidth }}</td>
                  </tr>
                </tbody>
              </table>
              <!-- Column 2 -->
              <table class="w-full text-sm">
                <tbody>
                  <tr v-if="order.productInstruction" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col2.instruction') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productInstruction }}</td>
                  </tr>
                  <tr v-if="order.productUnit" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col2.package') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productUnit }}</td>
                  </tr>
                  <tr v-if="order.productCategory" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col2.category') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productCategory }}</td>
                  </tr>
                  <tr v-if="order.productComment" class="border-b border-default">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col2.comment') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productComment }}</td>
                  </tr>
                  <tr v-if="order.productLayers != null">
                    <td class="px-3 py-1.5 text-muted">{{ t('orderDetail.productionInfo.col2.layers') }}</td>
                    <td class="px-3 py-1.5 font-medium text-highlighted text-right">{{ order.productLayers }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>

          <!-- Product Info (dimensions) -->
          <UCard :ui="{ body: 'p-0' }">
            <template #header>
              <p class="text-xs text-muted uppercase">{{ t('orderDetail.productInfo.title') }}</p>
            </template>
            <table class="w-full text-sm">
              <tbody>
                <tr v-if="order.productLength != null" class="border-b border-default">
                  <td class="px-4 py-2 text-muted w-1/2">{{ t('orderDetail.productInfo.length') }}</td>
                  <td class="px-4 py-2 font-medium text-highlighted text-right">{{ order.productLength }}</td>
                </tr>
                <tr v-if="order.productWidth != null" class="border-b border-default">
                  <td class="px-4 py-2 text-muted">{{ t('orderDetail.productInfo.width') }}</td>
                  <td class="px-4 py-2 font-medium text-highlighted text-right">{{ order.productWidth }}</td>
                </tr>
                <tr v-if="order.productThickness != null" class="border-b border-default">
                  <td class="px-4 py-2 text-muted">{{ t('orderDetail.productInfo.thickness') }}</td>
                  <td class="px-4 py-2 font-medium text-highlighted text-right">{{ order.productThickness }}</td>
                </tr>
                <tr v-if="order.productDensity != null">
                  <td class="px-4 py-2 text-muted">{{ t('orderDetail.productInfo.density') }}</td>
                  <td class="px-4 py-2 font-medium text-highlighted text-right">{{ order.productDensity }}</td>
                </tr>
              </tbody>
            </table>
          </UCard>
        </div>

        <!-- Order Parameters -->
        <UCard v-if="attributes.length" class="shrink-0" :ui="{ body: 'p-0' }">
          <template #header>
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.parameters.title') }}</p>
          </template>
          <table class="w-full text-sm">
            <tbody>
              <tr
                v-for="attr in attributes"
                :key="attr.attributeId"
                class="border-b border-default last:border-b-0"
              >
                <td class="px-3 py-1.5 text-muted w-1/2">{{ localize(attr.name, attr.nameEng) }}</td>
                <td class="px-3 py-1.5 text-right">
                  <template v-if="isAdmin && editingAttributeId === attr.attributeId">
                    <div class="flex items-center justify-end gap-1">
                      <template v-if="attr.valueType === 'binder_type'">
                        <select
                          v-model="attributeDraft"
                          class="border border-default rounded px-2 py-0.5 text-sm bg-elevated text-highlighted"
                        >
                          <option v-for="bt in binderTypes" :key="bt.id" :value="String(bt.id)">
                            {{ localize(bt.name, bt.nameEng) }}
                          </option>
                        </select>
                      </template>
                      <template v-else-if="attr.valueType === 'pkf_group'">
                        <select
                          v-model="attributeDraft"
                          class="border border-default rounded px-2 py-0.5 text-sm bg-elevated text-highlighted"
                        >
                          <option v-for="pg in pkfGroups" :key="pg.id" :value="String(pg.id)">
                            {{ localize(pg.name, pg.nameEng) }}
                          </option>
                        </select>
                      </template>
                      <template v-else>
                        <input
                          v-model="attributeDraft"
                          :type="attr.valueType === 'integer' || attr.valueType === 'numeric' ? 'number' : 'text'"
                          class="w-28 text-right border border-default rounded px-2 py-0.5 text-sm bg-elevated text-highlighted"
                          @keydown.enter="saveAttribute(attr)"
                          @keydown.escape="editingAttributeId = null"
                        />
                      </template>
                      <UButton icon="i-lucide-check" color="success" variant="ghost" size="xs" :loading="savingAttribute" @click="saveAttribute(attr)" />
                      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="editingAttributeId = null" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex items-center justify-end gap-2">
                      <span class="font-medium text-highlighted">{{ resolveAttributeLabel(attr) }}</span>
                      <UButton
                        v-if="isAdmin"
                        icon="i-lucide-pencil"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="startEditAttribute(attr)"
                      />
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>

        <!-- Production progress + shift breakdown -->
        <UCard class="shrink-0">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('orderDetail.progressBar.label') }}</span>
              <span class="font-medium text-highlighted">
                {{ producedTotal.toLocaleString() }}<template v-if="hasGoodQuantity"> / {{ Number(order.goodQuantity).toLocaleString() }}</template> / {{ order.volume.toLocaleString() }} {{ order.uomCode }}
              </span>
            </div>
            <div class="w-full bg-elevated rounded-full h-3 overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all duration-500" :style="{ width: `${Math.min(progressPct, 100)}%` }" />
            </div>
            <p v-if="progressPct > 100" class="text-xs text-warning font-medium">{{ t('orderDetail.progressBar.exceeded', { pct: progressPct }) }}</p>
            <p class="text-xs text-muted">{{ producedCaption }}</p>

            <!-- Shift breakdown -->
            <div v-if="order.shiftProductions.length" class="pt-2 border-t border-default space-y-1.5">
              <p class="text-xs text-muted uppercase mb-1">{{ t('orderDetail.shiftProductions.title') }}</p>
              <div
                v-for="sp in order.shiftProductions"
                :key="`${sp.shiftId}-${sp.date}`"
                class="flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0"
                    :style="{ background: sp.shiftColor }"
                  >{{ sp.shiftCode }}</span>
                  <span class="text-muted">{{ sp.shiftName }}</span>
                  <span class="text-xs text-dimmed">{{ new Date(sp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) }}</span>
                </div>
                <span class="font-medium text-highlighted">{{ Number(sp.produced).toLocaleString() }} {{ order.uomCode }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Waste -->
        <UCard v-if="canSeeAdminUi" class="shrink-0">
          <template #header>
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.waste.title') }}</p>
          </template>
          <div v-if="canEditProduction && manualWasteEnabled" class="flex items-end gap-3">
            <UFormField :label="t('orderDetail.waste.label', { uom: order.uomCode })" class="flex-1">
              <UInput v-model.number="wasteDraft" type="number" min="0" :placeholder="t('orderDetail.waste.placeholder')" class="w-full" />
            </UFormField>
            <UButton
              :label="t('orderDetail.waste.confirm')"
              color="primary"
              :loading="savingWaste"
              :disabled="wasteDraft === null || wasteDraft < 0"
              @click="saveWaste"
            />
          </div>
          <p v-else-if="!manualWasteEnabled" class="text-sm text-muted">
            {{ t('orderDetail.waste.disabledForLine') }}
          </p>
          <p v-else class="text-sm text-muted">
            {{ t('orderDetail.waste.locked') }}
          </p>
          <p v-if="order.goodQuantity !== null" class="text-sm text-muted mt-2">
            {{ t('orderDetail.waste.recorded', { waste: order.wasteQuantity, good: order.goodQuantity, uom: order.uomCode }) }}
          </p>
        </UCard>

        <!-- Completed cages (cage orders only) -->
        <UCard v-if="order.cage" class="shrink-0">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-muted uppercase">{{ t('orderDetail.cages.title') }}</p>
                <span class="text-sm text-dimmed">{{ t('orderDetail.cages.subtitle', { n: order.cages.length }, order.cages.length) }}</span>
              </div>
              <UButton
                v-if="canSeeAdminUi"
                :label="t('orderDetail.cages.add')"
                icon="i-lucide-plus"
                color="primary"
                :loading="addingCage"
                :disabled="!canEditProduction"
                @click="addCage"
              />
            </div>
          </template>
          <p v-if="canSeeAdminUi && !canEditProduction" class="text-sm text-muted mb-2">
            {{ t('orderDetail.cages.locked') }}
          </p>
          <div v-if="!order.cages.length" class="text-sm text-dimmed py-4 text-center">
            {{ t('orderDetail.cages.empty') }}
          </div>
          <UTable
            v-else
            :data="order.cages"
            :columns="cageColumns"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
              td: 'border-b border-default'
            }"
          />
        </UCard>

        <!-- Comment -->
        <UCard class="shrink-0">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="text-xs text-muted uppercase">{{ t('orderDetail.comment.title') }}</p>
              <UButton v-if="!editingComment" icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" @click="startEditComment" />
            </div>
          </template>
          <div v-if="editingComment" class="space-y-2">
            <UTextarea v-model="commentDraft" :rows="3" :placeholder="t('orderDetail.comment.placeholder')" autofocus />
            <div class="flex gap-2">
              <UButton :label="t('common.save')" color="primary" size="sm" @click="saveComment" />
              <UButton :label="t('common.cancel')" color="neutral" variant="ghost" size="sm" @click="editingComment = false" />
            </div>
          </div>
          <p v-else class="text-sm text-dimmed">{{ order.comment || t('orderDetail.comment.empty') }}</p>
        </UCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
