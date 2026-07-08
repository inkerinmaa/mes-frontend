<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { OrderDetail, CageEntry } from '../../types'
import { useLines } from '../../composables/useLines'
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

const { lineName, fetchLines } = useLines()
const { orderProducedUpdated } = useDashboard()

onMounted(() => { fetchOrder(); fetchLines() })

// Real-time produced counter update from OPC UA via NATS → SignalR
watch(orderProducedUpdated, (data) => {
  if (data && data.orderId === orderId.value && order.value) {
    order.value.producedPackages = data.producedPackages
  }
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
  const diff = cagePackagesDraft.value - cage.packages
  try {
    await apiFetch(`/orders/${orderId.value}/cages/${cage.id}/packages`, {
      method: 'PATCH',
      body: JSON.stringify({ packages: cagePackagesDraft.value })
    })
    cage.packages = cagePackagesDraft.value
    if (order.value) order.value.producedPackages += diff
    editingCageId.value = null
    toast.add({ title: t('orderDetail.cages.toast.packagesUpdated'), color: 'success' })
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
  return order.value.uomCode === 'pkg' ? order.value.producedPackages : Number(order.value.producedVolume)
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

const statusColor = (s: string) => ({ queued: 'neutral', in_progress: 'primary', completed: 'success', cancelled: 'error' }[s] || 'neutral') as any

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
        <!-- Info cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.product') }}</p>
            <p class="font-semibold text-highlighted">{{ order.productCode }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.status') }}</p>
            <UBadge :color="statusColor(order.status)" variant="subtle">
              {{ order.status.replace('_', ' ') }}
            </UBadge>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.line') }}</p>
            <p class="font-semibold text-highlighted">{{ lineName(order.line) }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.dueDate') }}</p>
            <p class="font-semibold text-highlighted">
              {{ order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }}
            </p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.volume') }}</p>
            <p class="font-semibold text-highlighted">{{ order.volume.toLocaleString() }} {{ order.uomCode }}</p>
          </UCard>
          <UCard v-if="order.cage" :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.cageSize') }}</p>
            <p class="font-semibold text-highlighted">{{ order.cageSize }} pkg</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.produced') }}</p>
            <p class="font-semibold text-highlighted">
              {{ producedTotal.toLocaleString() }}<template v-if="hasGoodQuantity"> / {{ Number(order.goodQuantity).toLocaleString() }}</template> / {{ order.volume.toLocaleString() }} {{ order.uomCode }}
            </p>
            <p class="text-xs text-muted">{{ producedCaption }}</p>
          </UCard>
          <UCard :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.progress') }}</p>
            <p class="font-semibold text-highlighted">{{ progressPct }}%</p>
          </UCard>
          <UCard v-if="order.uomCode !== 'pkg'" :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.packagesProduced') }}</p>
            <p class="font-semibold text-highlighted">{{ order.pkgProduced.toLocaleString() }} pcs</p>
          </UCard>
          <UCard v-if="order.shiftCode" :ui="{ body: 'space-y-1' }">
            <p class="text-xs text-muted uppercase">{{ t('orderDetail.cards.shift') }}</p>
            <div class="flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full" :style="{ background: order.shiftColor ?? '#6366f1' }" />
              <p class="font-semibold text-highlighted">{{ order.shiftName ?? order.shiftCode }}</p>
            </div>
          </UCard>
        </div>

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
          <div v-if="canEditProduction" class="flex items-end gap-3">
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
