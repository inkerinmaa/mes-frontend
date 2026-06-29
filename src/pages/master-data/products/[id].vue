<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '../../../utils/api'
import { useMesUser } from '../../../composables/useMesUser'
import { useLocalizedField } from '../../../composables/useLocalizedField'
import type { ProductDetail } from '../../../types'

const route  = useRoute()
const router = useRouter()
const toast  = useToast()
const { isAdmin } = useMesUser()
const { localize } = useLocalizedField()

const id      = Number(route.params.id)
const product = ref<ProductDetail | null>(null)
const loading = ref(true)
const saving  = ref(false)

// ── Form state (all strings for inputs; booleans for switches) ─────────────
const s = reactive({
  packageCode:  '',
  initialCode:  '',
  instruction:  '',
  length:       '',
  width:        '',
  thickness:    '',
  density:      '',
  // general_sp
  g_package:           '', g_abcCat: '',     g_wasteSuply:       '',
  g_remark:            '', g_info:   '',     g_labelling:        '',
  g_state:             '', g_dataCheck: false,
  g_drumPressure:      '', g_sawCross:  '',   g_labellingState:   '',
  g_productType:       '', g_splitInPair113114: false,
  g_productTurnPos122: '', g_weightLimitMaxPerc: '', g_weightLimitMinPerc: '',
  g_flexiTurn: false,       g_flexiWidth: '',
  g_energyClass: '',        g_binderType: '', g_pkfGroup: '',
  // saws_sp
  s_trimmingWasteOws: '', s_platesInPkg: '',  s_cutDirection: '',
  s_layers: '',            s_wasteStd: '',     s_trimmingWasteOw: '',
  s_sheetWidth: '',        s_cutWidth: '',     s_rawEdgeWidth: '',
  // tahu_sp
  t_tahuFinishPackHeight: '', t_tahuOutputHeight: '', t_tahuSideWelding: '',
  t_tahuFilmWidth: '',        t_tahuVacuum: '',
  t_tahuUseShrinkHeat: false, t_tahuSmartDate: false, t_tahuFoilCode: '',
  // bundler_sp
  b_bundlerPacksPerBundle: '', b_bundlerCompLength: '', b_bundlerOutputLength: '',
  b_productTurnPos608: '',     b_groupProductPos608: '',
  // consumables_sp
  c_bundlePlasticCode: '', c_hooderPlasticCode: '', c_wrapperPlasticCode: '',
  c_checkLayers: '',
  // ul_sp
  u_ulProductPerLayer: '', u_ulPalletLayers: '',
  u_ulLayersInterlocked: false, u_ulPackOrientation: '', u_ulDirectionBaseLayer: '',
  u_ulMiwoFeet: '', u_ulMiwoDim: '', u_ulPalletDim: '',
  u_ulPalletDimPerpendicular: '', u_ulPalletHeight: '',
  u_ulCrossTurning: false, u_ulUseHooding: false,
  u_ulUseGlue: false,      u_ulUseWrapping: false,
})

function n(v: string): number | null { return v === '' ? null : Number(v) }
function str(v: string): string | null { return v.trim() === '' ? null : v.trim() }

function populate(p: ProductDetail) {
  s.packageCode = p.packageCode ?? ''
  s.initialCode = p.initialCode ?? ''
  s.instruction = p.instruction ?? ''
  s.length      = p.length?.toString() ?? ''
  s.width       = p.width?.toString() ?? ''
  s.thickness   = p.thickness?.toString() ?? ''
  s.density     = p.density?.toString() ?? ''

  const g = p.generalSp
  if (g) {
    s.g_package           = g.package ?? ''
    s.g_abcCat            = g.abcCat ?? ''
    s.g_wasteSuply        = g.wasteSuply?.toString() ?? ''
    s.g_remark            = g.remark ?? ''
    s.g_info              = g.info ?? ''
    s.g_labelling         = g.labelling ?? ''
    s.g_state             = g.state ?? ''
    s.g_dataCheck         = g.dataCheck ?? false
    s.g_drumPressure      = g.drumPressure?.toString() ?? ''
    s.g_sawCross          = g.sawCross?.toString() ?? ''
    s.g_labellingState    = g.labellingState ?? ''
    s.g_productType       = g.productType ?? ''
    s.g_splitInPair113114 = g.splitInPair113114 ?? false
    s.g_productTurnPos122 = g.productTurnPos122 ?? ''
    s.g_weightLimitMaxPerc = g.weightLimitMaxPerc?.toString() ?? ''
    s.g_weightLimitMinPerc = g.weightLimitMinPerc?.toString() ?? ''
    s.g_flexiTurn         = g.flexiTurn ?? false
    s.g_flexiWidth        = g.flexiWidth?.toString() ?? ''
    s.g_energyClass       = g.energyClass ?? ''
    s.g_binderType        = g.binderType ?? ''
    s.g_pkfGroup          = g.pkfGroup ?? ''
  }

  const sw = p.sawsSp
  if (sw) {
    s.s_trimmingWasteOws = sw.trimmingWasteOws?.toString() ?? ''
    s.s_platesInPkg      = sw.platesInPkg?.toString() ?? ''
    s.s_cutDirection     = sw.cutDirection ?? ''
    s.s_layers           = sw.layers?.toString() ?? ''
    s.s_wasteStd         = sw.wasteStd?.toString() ?? ''
    s.s_trimmingWasteOw  = sw.trimmingWasteOw?.toString() ?? ''
    s.s_sheetWidth       = sw.sheetWidth?.toString() ?? ''
    s.s_cutWidth         = sw.cutWidth?.toString() ?? ''
    s.s_rawEdgeWidth     = sw.rawEdgeWidth?.toString() ?? ''
  }

  const t = p.tahuSp
  if (t) {
    s.t_tahuFinishPackHeight = t.tahuFinishPackHeight?.toString() ?? ''
    s.t_tahuOutputHeight     = t.tahuOutputHeight?.toString() ?? ''
    s.t_tahuSideWelding      = t.tahuSideWelding?.toString() ?? ''
    s.t_tahuFilmWidth        = t.tahuFilmWidth?.toString() ?? ''
    s.t_tahuVacuum           = t.tahuVacuum?.toString() ?? ''
    s.t_tahuUseShrinkHeat    = t.tahuUseShrinkHeat ?? false
    s.t_tahuSmartDate        = t.tahuSmartDate ?? false
    s.t_tahuFoilCode         = t.tahuFoilCode ?? ''
  }

  const b = p.bundlerSp
  if (b) {
    s.b_bundlerPacksPerBundle = b.bundlerPacksPerBundle?.toString() ?? ''
    s.b_bundlerCompLength     = b.bundlerCompLength?.toString() ?? ''
    s.b_bundlerOutputLength   = b.bundlerOutputLength?.toString() ?? ''
    s.b_productTurnPos608     = b.productTurnPos608 ?? ''
    s.b_groupProductPos608    = b.groupProductPos608 ?? ''
  }

  const c = p.consumablesSp
  if (c) {
    s.c_bundlePlasticCode  = c.bundlePlasticCode ?? ''
    s.c_hooderPlasticCode  = c.hooderPlasticCode ?? ''
    s.c_wrapperPlasticCode = c.wrapperPlasticCode ?? ''
    s.c_checkLayers        = c.checkLayers?.toString() ?? ''
  }

  const u = p.ulSp
  if (u) {
    s.u_ulProductPerLayer       = u.ulProductPerLayer?.toString() ?? ''
    s.u_ulPalletLayers          = u.ulPalletLayers?.toString() ?? ''
    s.u_ulLayersInterlocked     = u.ulLayersInterlocked ?? false
    s.u_ulPackOrientation       = u.ulPackOrientation ?? ''
    s.u_ulDirectionBaseLayer    = u.ulDirectionBaseLayer ?? ''
    s.u_ulMiwoFeet              = u.ulMiwoFeet?.toString() ?? ''
    s.u_ulMiwoDim               = u.ulMiwoDim ?? ''
    s.u_ulPalletDim             = u.ulPalletDim ?? ''
    s.u_ulPalletDimPerpendicular = u.ulPalletDimPerpendicular ?? ''
    s.u_ulPalletHeight          = u.ulPalletHeight?.toString() ?? ''
    s.u_ulCrossTurning          = u.ulCrossTurning ?? false
    s.u_ulUseHooding            = u.ulUseHooding ?? false
    s.u_ulUseGlue               = u.ulUseGlue ?? false
    s.u_ulUseWrapping           = u.ulUseWrapping ?? false
  }
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
        packageCode: str(s.packageCode),
        initialCode: str(s.initialCode),
        instruction: str(s.instruction),
        length:    n(s.length),
        width:     n(s.width),
        thickness: n(s.thickness),
        density:   n(s.density),
        generalSp: {
          package:            str(s.g_package),
          abcCat:             str(s.g_abcCat),
          wasteSuply:         n(s.g_wasteSuply),
          remark:             str(s.g_remark),
          info:               str(s.g_info),
          labelling:          str(s.g_labelling),
          state:              str(s.g_state),
          dataCheck:          s.g_dataCheck,
          drumPressure:       n(s.g_drumPressure),
          sawCross:           n(s.g_sawCross),
          labellingState:     str(s.g_labellingState),
          productType:        str(s.g_productType),
          splitInPair113114:  s.g_splitInPair113114,
          productTurnPos122:  str(s.g_productTurnPos122),
          weightLimitMaxPerc: n(s.g_weightLimitMaxPerc),
          weightLimitMinPerc: n(s.g_weightLimitMinPerc),
          flexiTurn:          s.g_flexiTurn,
          flexiWidth:         n(s.g_flexiWidth),
          energyClass:        str(s.g_energyClass),
          binderType:         str(s.g_binderType),
          pkfGroup:           str(s.g_pkfGroup),
        },
        sawsSp: {
          trimmingWasteOws: n(s.s_trimmingWasteOws),
          platesInPkg:      n(s.s_platesInPkg),
          cutDirection:     str(s.s_cutDirection),
          layers:           n(s.s_layers),
          wasteStd:         n(s.s_wasteStd),
          trimmingWasteOw:  n(s.s_trimmingWasteOw),
          sheetWidth:       n(s.s_sheetWidth),
          cutWidth:         n(s.s_cutWidth),
          rawEdgeWidth:     n(s.s_rawEdgeWidth),
        },
        tahuSp: {
          tahuFinishPackHeight: n(s.t_tahuFinishPackHeight),
          tahuOutputHeight:     n(s.t_tahuOutputHeight),
          tahuSideWelding:      n(s.t_tahuSideWelding),
          tahuFilmWidth:        n(s.t_tahuFilmWidth),
          tahuVacuum:           n(s.t_tahuVacuum),
          tahuUseShrinkHeat:    s.t_tahuUseShrinkHeat,
          tahuSmartDate:        s.t_tahuSmartDate,
          tahuFoilCode:         str(s.t_tahuFoilCode),
        },
        bundlerSp: {
          bundlerPacksPerBundle: n(s.b_bundlerPacksPerBundle),
          bundlerCompLength:     n(s.b_bundlerCompLength),
          bundlerOutputLength:   n(s.b_bundlerOutputLength),
          productTurnPos608:     str(s.b_productTurnPos608),
          groupProductPos608:    str(s.b_groupProductPos608),
        },
        consumablesSp: {
          bundlePlasticCode:  str(s.c_bundlePlasticCode),
          hooderPlasticCode:  str(s.c_hooderPlasticCode),
          wrapperPlasticCode: str(s.c_wrapperPlasticCode),
          checkLayers:        n(s.c_checkLayers),
        },
        ulSp: {
          ulProductPerLayer:       n(s.u_ulProductPerLayer),
          ulPalletLayers:          n(s.u_ulPalletLayers),
          ulLayersInterlocked:     s.u_ulLayersInterlocked,
          ulPackOrientation:       str(s.u_ulPackOrientation),
          ulDirectionBaseLayer:    str(s.u_ulDirectionBaseLayer),
          ulMiwoFeet:              n(s.u_ulMiwoFeet),
          ulMiwoDim:               str(s.u_ulMiwoDim),
          ulPalletDim:             str(s.u_ulPalletDim),
          ulPalletDimPerpendicular: str(s.u_ulPalletDimPerpendicular),
          ulPalletHeight:          n(s.u_ulPalletHeight),
          ulCrossTurning:          s.u_ulCrossTurning,
          ulUseHooding:            s.u_ulUseHooding,
          ulUseGlue:               s.u_ulUseGlue,
          ulUseWrapping:           s.u_ulUseWrapping,
        },
      })
    })
    toast.add({ title: 'Product saved', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="product-detail">
    <template #header>
      <UDashboardNavbar :title="product ? product.number : 'Product'">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="router.push('/master-data/products')"
          />
        </template>
        <template #right>
          <UButton
            v-if="isAdmin"
            label="Save changes"
            color="primary"
            :loading="saving"
            @click="save"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center h-32 text-sm text-muted">
        Loading...
      </div>

      <template v-else-if="product">
        <!-- Identity (read-only) -->
        <UPageCard title="Product" description="Core identifiers — read only." variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p class="text-xs text-muted uppercase mb-1">Number</p>
              <p class="text-sm font-mono font-medium">{{ product.number }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">SKU</p>
              <p class="text-sm">{{ product.sku ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">Description</p>
              <p class="text-sm">{{ localize(product.description, product.descriptionEng) ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted uppercase mb-1">Code</p>
              <p class="text-sm font-mono">{{ product.code ?? '—' }}</p>
            </div>
          </div>
        </UPageCard>

        <!-- Product attributes -->
        <UPageCard title="Product Attributes" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Package Code</label>
              <UInput v-model="s.packageCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Initial Code</label>
              <UInput v-model="s.initialCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Instruction</label>
              <UInput v-model="s.instruction" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Length (mm)</label>
              <UInput v-model="s.length" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Width (mm)</label>
              <UInput v-model="s.width" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Thickness (mm)</label>
              <UInput v-model="s.thickness" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Density (kg/m³)</label>
              <UInput v-model="s.density" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- General Setpoints -->
        <UPageCard title="General Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Package</label>
              <UInput v-model="s.g_package" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">ABC Cat</label>
              <UInput v-model="s.g_abcCat" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Waste Supply</label>
              <UInput v-model="s.g_wasteSuply" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Energy Class</label>
              <UInput v-model="s.g_energyClass" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Product Type</label>
              <UInput v-model="s.g_productType" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Binder Type</label>
              <UInput v-model="s.g_binderType" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">PKF Group</label>
              <UInput v-model="s.g_pkfGroup" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Labelling</label>
              <UInput v-model="s.g_labelling" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Labelling State</label>
              <UInput v-model="s.g_labellingState" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">State</label>
              <UInput v-model="s.g_state" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Drum Pressure</label>
              <UInput v-model="s.g_drumPressure" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Saw Cross</label>
              <UInput v-model="s.g_sawCross" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Turn Pos 122</label>
              <UInput v-model="s.g_productTurnPos122" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Weight Max %</label>
              <UInput v-model="s.g_weightLimitMaxPerc" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Weight Min %</label>
              <UInput v-model="s.g_weightLimitMinPerc" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Flexi Width</label>
              <UInput v-model="s.g_flexiWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Remark</label>
              <UInput v-model="s.g_remark" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Info</label>
              <UInput v-model="s.g_info" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex items-center justify-between col-span-2 sm:col-span-1">
              <label class="text-xs font-medium text-muted uppercase">Data Check</label>
              <USwitch v-model="s.g_dataCheck" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between col-span-2 sm:col-span-1">
              <label class="text-xs font-medium text-muted uppercase">Split in Pair 113/114</label>
              <USwitch v-model="s.g_splitInPair113114" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between col-span-2 sm:col-span-1">
              <label class="text-xs font-medium text-muted uppercase">Flexi Turn</label>
              <USwitch v-model="s.g_flexiTurn" :disabled="!isAdmin" />
            </div>
          </div>
        </UPageCard>

        <!-- Saws Setpoints -->
        <UPageCard title="Saws Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Trimming Waste OWS</label>
              <UInput v-model="s.s_trimmingWasteOws" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Trimming Waste OW</label>
              <UInput v-model="s.s_trimmingWasteOw" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Plates in Pkg</label>
              <UInput v-model="s.s_platesInPkg" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Layers</label>
              <UInput v-model="s.s_layers" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Cut Direction</label>
              <UInput v-model="s.s_cutDirection" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Waste Std</label>
              <UInput v-model="s.s_wasteStd" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Sheet Width</label>
              <UInput v-model="s.s_sheetWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Cut Width</label>
              <UInput v-model="s.s_cutWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Raw Edge Width</label>
              <UInput v-model="s.s_rawEdgeWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- TAHU Setpoints -->
        <UPageCard title="TAHU Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Finish Pack Height</label>
              <UInput v-model="s.t_tahuFinishPackHeight" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Output Height</label>
              <UInput v-model="s.t_tahuOutputHeight" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Side Welding</label>
              <UInput v-model="s.t_tahuSideWelding" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Film Width</label>
              <UInput v-model="s.t_tahuFilmWidth" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Vacuum</label>
              <UInput v-model="s.t_tahuVacuum" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Foil Code</label>
              <UInput v-model="s.t_tahuFoilCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Use Shrink Heat</label>
              <USwitch v-model="s.t_tahuUseShrinkHeat" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Smart Date</label>
              <USwitch v-model="s.t_tahuSmartDate" :disabled="!isAdmin" />
            </div>
          </div>
        </UPageCard>

        <!-- Bundler Setpoints -->
        <UPageCard title="Bundler Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Packs per Bundle</label>
              <UInput v-model="s.b_bundlerPacksPerBundle" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Comp Length</label>
              <UInput v-model="s.b_bundlerCompLength" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Output Length</label>
              <UInput v-model="s.b_bundlerOutputLength" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Turn Pos 608</label>
              <UInput v-model="s.b_productTurnPos608" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Group Pos 608</label>
              <UInput v-model="s.b_groupProductPos608" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- Consumables Setpoints -->
        <UPageCard title="Consumables Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Bundle Plastic Code</label>
              <UInput v-model="s.c_bundlePlasticCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Hooder Plastic Code</label>
              <UInput v-model="s.c_hooderPlasticCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Wrapper Plastic Code</label>
              <UInput v-model="s.c_wrapperPlasticCode" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Check Layers</label>
              <UInput v-model="s.c_checkLayers" type="number" :disabled="!isAdmin" size="sm" />
            </div>
          </div>
        </UPageCard>

        <!-- UL Setpoints -->
        <UPageCard title="UL Setpoints" variant="subtle" class="shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Products per Layer</label>
              <UInput v-model="s.u_ulProductPerLayer" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Pallet Layers</label>
              <UInput v-model="s.u_ulPalletLayers" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Pack Orientation</label>
              <UInput v-model="s.u_ulPackOrientation" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Direction Base Layer</label>
              <UInput v-model="s.u_ulDirectionBaseLayer" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">MIWO Feet</label>
              <UInput v-model="s.u_ulMiwoFeet" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">MIWO Dim</label>
              <UInput v-model="s.u_ulMiwoDim" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Pallet Dim</label>
              <UInput v-model="s.u_ulPalletDim" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Pallet Dim Perp.</label>
              <UInput v-model="s.u_ulPalletDimPerpendicular" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase">Pallet Height</label>
              <UInput v-model="s.u_ulPalletHeight" type="number" :disabled="!isAdmin" size="sm" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Layers Interlocked</label>
              <USwitch v-model="s.u_ulLayersInterlocked" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Cross Turning</label>
              <USwitch v-model="s.u_ulCrossTurning" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Use Hooding</label>
              <USwitch v-model="s.u_ulUseHooding" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Use Glue</label>
              <USwitch v-model="s.u_ulUseGlue" :disabled="!isAdmin" />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-muted uppercase">Use Wrapping</label>
              <USwitch v-model="s.u_ulUseWrapping" :disabled="!isAdmin" />
            </div>
          </div>
        </UPageCard>
      </template>
    </template>
  </UDashboardPanel>
</template>
