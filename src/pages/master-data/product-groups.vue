<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiFetch } from '../../utils/api'
import type { ProductGroup, Setpoint, ProductListItem } from '../../types'
import { useMesUser } from '../../composables/useMesUser'
import { useLocalizedField } from '../../composables/useLocalizedField'

const { t } = useI18n()
const { canSeeAdminUi } = useMesUser()
const { localize } = useLocalizedField()
const toast = useToast()

const groups   = ref<ProductGroup[]>([])
const products = ref<ProductListItem[]>([])
const setpoints = ref<Setpoint[]>([])
const selectedGroupId = ref<number | undefined>(undefined)
const productSearch   = ref('')
const isFetchingSetpoints = ref(false)

const editingId    = ref<number | null>(null)
const editingValue = ref('')

onMounted(async () => {
  try {
    ;[groups.value, products.value] = await Promise.all([
      apiFetch<ProductGroup[]>('/product-groups'),
      apiFetch<ProductListItem[]>('/products'),
    ])
  } catch (e) {
    console.error('Failed to fetch product groups or products:', e)
  }
})

watch(selectedGroupId, async (id) => {
  setpoints.value = []
  editingId.value = null
  if (!id) return
  isFetchingSetpoints.value = true
  try {
    setpoints.value = await apiFetch<Setpoint[]>(`/product-groups/${id}/setpoints`)
  } catch (e) {
    console.error('Failed to fetch setpoints:', e)
  } finally {
    isFetchingSetpoints.value = false
  }
})

watch(productSearch, (val) => {
  const trimmed = val.trim()
  if (!trimmed) return
  const match = products.value.find(p =>
    p.number.toLowerCase().includes(trimmed.toLowerCase())
  )
  if (match?.groupId) selectedGroupId.value = match.groupId
})

const groupOptions = computed(() =>
  groups.value.map(g => ({
    value: g.id,
    label: localize(g.name, g.nameEng) ?? g.name,
  }))
)

const setpointGroups = computed(() => {
  const map = new Map<string, Setpoint[]>()
  for (const sp of setpoints.value) {
    const key = localize(sp.unitName, sp.unitNameEng) ?? sp.unitName ?? '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(sp)
  }
  return Array.from(map.entries()).map(([unitName, items]) => ({ unitName, items }))
})

function startEdit(sp: Setpoint) {
  if (!canSeeAdminUi.value) return
  editingId.value = sp.id
  editingValue.value = sp.value ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(sp: Setpoint) {
  const newVal = editingValue.value.trim() || null
  try {
    await apiFetch(`/setpoints/${sp.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ value: newVal }),
    })
    sp.value = newVal
    toast.add({ title: t('masterData.productGroups.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('masterData.productGroups.toast.saveFailed'), color: 'error' })
  } finally {
    editingId.value = null
  }
}
</script>

<template>
  <div class="p-6 space-y-6 shrink-0">
    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="selectedGroupId"
        :items="groupOptions"
        :placeholder="t('masterData.productGroups.filterGroup')"
        class="w-56"
      />
      <UInput
        v-model="productSearch"
        :placeholder="t('masterData.productGroups.filterProduct')"
        class="w-56"
        icon="i-lucide-search"
      />
    </div>

    <!-- No group selected -->
    <p v-if="!selectedGroupId" class="text-sm text-muted py-4">
      {{ t('masterData.productGroups.noGroup') }}
    </p>

    <!-- Loading -->
    <div v-else-if="isFetchingSetpoints" class="py-8 text-center text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <!-- Setpoints per unit -->
    <template v-else>
      <div
        v-for="group in setpointGroups"
        :key="group.unitName"
        class="space-y-2"
      >
        <p class="text-xs font-semibold text-muted uppercase tracking-wider">
          {{ group.unitName }}
        </p>
        <div class="rounded-lg border border-default overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50">
              <tr>
                <th class="text-left px-3 py-2 font-medium text-muted border-b border-default w-72">
                  {{ t('masterData.productGroups.columns.parameter') }}
                </th>
                <th class="text-left px-3 py-2 font-medium text-muted border-b border-default w-28">
                  {{ t('masterData.productGroups.columns.correctionType') }}
                </th>
                <th class="text-left px-3 py-2 font-medium text-muted border-b border-default">
                  {{ t('masterData.productGroups.columns.value') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sp in group.items"
                :key="sp.id"
                class="border-b border-default last:border-b-0 hover:bg-elevated/30 transition-colors"
              >
                <td class="px-3 py-2">
                  {{ localize(sp.name, sp.nameEng) ?? sp.name }}
                </td>
                <td class="px-3 py-2 text-muted text-xs">
                  {{ sp.correctionTypeName ?? '—' }}
                </td>
                <td class="px-3 py-2">
                  <div v-if="editingId === sp.id" class="flex items-center gap-2">
                    <UInput
                      v-model="editingValue"
                      size="xs"
                      class="w-28"
                      @keyup.enter="saveEdit(sp)"
                      @keyup.escape="cancelEdit"
                    />
                    <UButton
                      size="xs"
                      color="success"
                      variant="ghost"
                      icon="i-lucide-check"
                      @click="saveEdit(sp)"
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      @click="cancelEdit"
                    />
                  </div>
                  <div
                    v-else
                    class="flex items-center gap-2 group/cell"
                    :class="canSeeAdminUi ? 'cursor-pointer' : ''"
                    @click="startEdit(sp)"
                  >
                    <span class="font-mono">{{ sp.value ?? '—' }}</span>
                    <UIcon
                      v-if="canSeeAdminUi"
                      name="i-lucide-pencil"
                      class="size-3 text-muted opacity-0 group-hover/cell:opacity-100 transition-opacity"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
