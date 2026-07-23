<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { apiFetch } from '../../../utils/api'
import { useMesUser } from '../../../composables/useMesUser'
import { useLocalizedField } from '../../../composables/useLocalizedField'
import type { ProductDetail, Uom } from '../../../types'

const route  = useRoute()
const router = useRouter()
const { t }  = useI18n()
const toast  = useToast()
const { isAdmin } = useMesUser()
const { localize } = useLocalizedField()

const id      = Number(route.params.id)
const product = ref<ProductDetail | null>(null)
const uoms    = ref<Uom[]>([])
const loading = ref(true)
const saving  = ref(false)

onMounted(async () => {
  uoms.value = await apiFetch<Uom[]>('/uoms').catch(() => [])
})

function n(v: string): number | null { return v === '' ? null : Number(v) }
function str(v: string): string | null { return v.trim() === '' ? null : v.trim() }

const s = reactive({
  name: '', nameEng: '', coverCode: '', packageCode: '',
  sequence: '', productionInstruction: '', uomId: undefined as number | undefined,
  pcsInPack: '', packsInPackage: '',
  length: '', width: '', thickness: '', density: '',
  layers: '', grindingWaste: '', normWaste: '', grindingWasteOw: '',
  category: '', comment: '', directRecycleMode: '',
  info1: '', info2: '', info3: '', info4: '', info5: '', info6: '',
  productLineWidth: '', edgeTrimWidth: '', wetEdgeTrimMode: '',
  mark: '', state: '',
})

function populate(p: ProductDetail) {
  s.name                  = p.name ?? ''
  s.nameEng               = p.nameEng ?? ''
  s.coverCode             = p.coverCode ?? ''
  s.packageCode           = p.packageCode ?? ''
  s.sequence              = p.sequence?.toString() ?? ''
  s.productionInstruction = p.productionInstruction ?? ''
  s.uomId                 = p.uomId ?? undefined
  s.pcsInPack             = p.pcsInPack?.toString() ?? ''
  s.packsInPackage        = p.packsInPackage?.toString() ?? ''
  s.length                = p.length?.toString() ?? ''
  s.width                 = p.width?.toString() ?? ''
  s.thickness             = p.thickness?.toString() ?? ''
  s.density               = p.density?.toString() ?? ''
  s.layers                = p.layers?.toString() ?? ''
  s.grindingWaste         = p.grindingWaste?.toString() ?? ''
  s.normWaste             = p.normWaste?.toString() ?? ''
  s.grindingWasteOw       = p.grindingWasteOw?.toString() ?? ''
  s.category              = p.category ?? ''
  s.comment               = p.comment ?? ''
  s.directRecycleMode     = p.directRecycleMode?.toString() ?? ''
  s.info1                 = p.info1 ?? ''
  s.info2                 = p.info2 ?? ''
  s.info3                 = p.info3 ?? ''
  s.info4                 = p.info4 ?? ''
  s.info5                 = p.info5 ?? ''
  s.info6                 = p.info6 ?? ''
  s.productLineWidth      = p.productLineWidth?.toString() ?? ''
  s.edgeTrimWidth         = p.edgeTrimWidth?.toString() ?? ''
  s.wetEdgeTrimMode       = p.wetEdgeTrimMode?.toString() ?? ''
  s.mark                  = p.mark?.toString() ?? ''
  s.state                 = p.state?.toString() ?? ''
}

async function fetchProduct() {
  loading.value = true
  try {
    product.value = await apiFetch<ProductDetail>(`/products/${id}`)
    populate(product.value)
  } catch {
    toast.add({ title: 'Product not found', color: 'error' })
    router.push('/master-data/products')
  } finally {
    loading.value = false
  }
}

fetchProduct()

async function save() {
  saving.value = true
  try {
    await apiFetch(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name:                  str(s.name),
        nameEng:               str(s.nameEng),
        coverCode:             str(s.coverCode),
        packageCode:           str(s.packageCode),
        sequence:              n(s.sequence),
        productionInstruction: str(s.productionInstruction),
        uomId:                 s.uomId,
        pcsInPack:             n(s.pcsInPack),
        packsInPackage:        n(s.packsInPackage),
        length:                n(s.length),
        width:                 n(s.width),
        thickness:             n(s.thickness),
        density:               n(s.density),
        layers:                n(s.layers),
        grindingWaste:         n(s.grindingWaste),
        normWaste:             n(s.normWaste),
        grindingWasteOw:       n(s.grindingWasteOw),
        category:              str(s.category),
        comment:               str(s.comment),
        directRecycleMode:     n(s.directRecycleMode),
        info1:                 str(s.info1),
        info2:                 str(s.info2),
        info3:                 str(s.info3),
        info4:                 str(s.info4),
        info5:                 str(s.info5),
        info6:                 str(s.info6),
        productLineWidth:      n(s.productLineWidth),
        edgeTrimWidth:         n(s.edgeTrimWidth),
        wetEdgeTrimMode:       n(s.wetEdgeTrimMode),
        mark:                  n(s.mark),
        state:                 n(s.state),
      })
    })
    if (product.value) populate({ ...product.value, ...s } as any)
    toast.add({ title: t('masterData.products.toast.saved'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('masterData.products.toast.saveFailed'), description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="product-detail">
    <template #header>
      <UDashboardNavbar :title="product ? product.number : t('masterData.products.detail.title')">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="router.push('/master-data/products')" />
        </template>
        <template #right>
          <UButton v-if="isAdmin" :label="t('common.saveChanges')" color="primary" :loading="saving" @click="save" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center h-32 text-sm text-muted shrink-0">
        {{ t('common.loading') }}
      </div>

      <template v-else-if="product">
        <!-- Identity (read-only) -->
        <UPageCard :title="t('masterData.products.detail.identity')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p class="text-xs text-muted uppercase mb-1">{{ t('masterData.products.columns.number') }}</p>
              <p class="text-sm font-mono font-medium text-highlighted">{{ product.number }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">{{ t('masterData.products.columns.group') }}</p>
              <p class="text-sm text-highlighted">{{ localize(product.groupName, product.groupNameEng) ?? '—' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted uppercase mb-1">{{ t('masterData.products.columns.name') }}</p>
              <p class="text-sm text-highlighted">{{ localize(product.name, product.nameEng) ?? '—' }}</p>
            </div>
          </div>
        </UPageCard>

        <!-- Basic info -->
        <UPageCard :title="t('masterData.products.detail.basicInfo')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.name') }}</label>
              <UInput v-model="s.name" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.nameEng') }}</label>
              <UInput v-model="s.nameEng" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.coverCode') }}</label>
              <UInput v-model="s.coverCode" :disabled="!isAdmin" size="sm" class="font-mono" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.packageCode') }}</label>
              <UInput v-model="s.packageCode" :disabled="!isAdmin" size="sm" class="font-mono" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.sequence') }}</label>
              <UInput v-model="s.sequence" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.unit') }}</label>
              <USelect
                v-model="s.uomId"
                :items="uoms.map(u => ({ label: u.code, value: u.id }))"
                :disabled="!isAdmin"
                size="sm"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.mark') }}</label>
              <UInput v-model="s.mark" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.state') }}</label>
              <UInput v-model="s.state" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="col-span-2 lg:col-span-4 flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.productionInstruction') }}</label>
              <UInput v-model="s.productionInstruction" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.category') }}</label>
              <UInput v-model="s.category" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.comment') }}</label>
              <UInput v-model="s.comment" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.directRecycleMode') }}</label>
              <UInput v-model="s.directRecycleMode" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- Dimensions -->
        <UPageCard :title="t('masterData.products.detail.dimensions')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.length') }} (mm)</label>
              <UInput v-model="s.length" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.width') }} (mm)</label>
              <UInput v-model="s.width" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.thickness') }} (mm)</label>
              <UInput v-model="s.thickness" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.density') }} (kg/m³)</label>
              <UInput v-model="s.density" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- Packaging -->
        <UPageCard :title="t('masterData.products.detail.packaging')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.pcsInPack') }}</label>
              <UInput v-model="s.pcsInPack" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.packsInPackage') }}</label>
              <UInput v-model="s.packsInPackage" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.layers') }}</label>
              <UInput v-model="s.layers" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- Process parameters -->
        <UPageCard :title="t('masterData.products.detail.processParams')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.normWaste') }}</label>
              <UInput v-model="s.normWaste" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.grindingWaste') }}</label>
              <UInput v-model="s.grindingWaste" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.grindingWasteOw') }}</label>
              <UInput v-model="s.grindingWasteOw" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.productLineWidth') }}</label>
              <UInput v-model="s.productLineWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.edgeTrimWidth') }}</label>
              <UInput v-model="s.edgeTrimWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.wetEdgeTrimMode') }}</label>
              <UInput v-model="s.wetEdgeTrimMode" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- Info fields -->
        <UPageCard :title="t('masterData.products.detail.info')" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">{{ t('masterData.products.fields.info', { n: i }) }}</label>
              <UInput v-model="(s as any)[`info${i}`]" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <p v-if="product.modifiedAt" class="text-xs text-dimmed shrink-0 text-right px-2">
          {{ t('masterData.products.detail.modifiedAt') }}: {{ new Date(product.modifiedAt).toLocaleString() }}
        </p>
      </template>
    </template>
  </UDashboardPanel>
</template>
