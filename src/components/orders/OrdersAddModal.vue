<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { ProductListItem, Uom } from '../../types'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'
import { useLocalizedField } from '../../composables/useLocalizedField'

const { t } = useI18n()
const { localize } = useLocalizedField()

const emit = defineEmits<{ created: [] }>()

let productCache: ProductListItem[] | null = null
let uomCache: Uom[] | null = null

const schema = z.object({
  orderNumber:       z.string().min(1, 'Required'),
  tx:                z.coerce.number().min(0).default(0),
  productCode:       z.string().min(1, 'Select a product'),
  volume:            z.coerce.number().positive('Must be greater than 0'),
  uomCode:           z.string().min(1, 'Select a unit'),
  priority:          z.string(),
  lineId:            z.coerce.number().min(1),
  plannedStartAt:    z.string().min(1, 'Required'),
  plannedCompleteAt: z.string().min(1, 'Required'),
  dueDate:           z.string().optional()
})

type Schema = z.output<typeof schema>

const open = ref(false)
const isSubmitting = ref(false)
const products = ref<ProductListItem[]>([])
const uoms = ref<Uom[]>([])
const loadError = ref('')

const state = reactive<Partial<Schema>>({
  orderNumber:       '',
  tx:                0,
  productCode:       undefined,
  volume:            undefined,
  uomCode:           undefined,
  priority:          'Medium',
  lineId:            1,
  plannedStartAt:    '',
  plannedCompleteAt: '',
  dueDate:           ''
})

onMounted(async () => {
  try {
    if (!productCache) productCache = await apiFetch<ProductListItem[]>('/products')
    products.value = productCache!

    if (!uomCache) uomCache = await apiFetch<Uom[]>('/uoms')
    uoms.value = uomCache!

    await fetchLines()
  } catch (e) {
    loadError.value = 'Failed to load form data'
    console.error('Failed to load products/UOMs:', e)
  }
})

const toast = useToast()
const { lineName, fetchLines } = useLines()
const { visibleLines } = useSelectedLines()

const selectedProduct = computed(() => products.value.find(p => p.number === state.productCode))

watch(selectedProduct, (product) => {
  if (product?.uomCode) state.uomCode = product.uomCode
}, { immediate: true })

function resetForm() {
  Object.assign(state, {
    orderNumber:       '',
    tx:                0,
    productCode:       undefined,
    volume:            undefined,
    uomCode:           undefined,
    priority:          'Medium',
    lineId:            1,
    plannedStartAt:    '',
    plannedCompleteAt: '',
    dueDate:           ''
  })
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  const isReactivation = (event.data.tx ?? 0) > 0
  try {
    await apiFetch<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber:       event.data.orderNumber,
        tx:                event.data.tx ?? 0,
        productCode:       event.data.productCode,
        lineId:            Number(event.data.lineId),
        volume:            Number(event.data.volume),
        uomCode:           event.data.uomCode,
        priority:          event.data.priority,
        plannedStartAt:    event.data.plannedStartAt || null,
        plannedCompleteAt: event.data.plannedCompleteAt || null,
        dueDate:           event.data.dueDate || null
      })
    })
    toast.add({
      title: isReactivation ? t('newOrder.toast.reactivated') : t('newOrder.toast.created'),
      description: `${event.data.orderNumber} — ${event.data.productCode} × ${event.data.volume} ${event.data.uomCode} on ${lineName(Number(event.data.lineId))}`,
      color: 'success'
    })
    open.value = false
    emit('created')
    resetForm()
  } catch (e: any) {
    const msg = e.message || t('newOrder.toast.failed')
    toast.add({ title: t('common.error'), description: msg.includes('409') ? t('newOrder.toast.alreadyExists') : msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('newOrder.title')" :description="t('newOrder.description')">
    <UButton :label="t('newOrder.title')" icon="i-lucide-plus" />

    <template #body>
      <div v-if="loadError" class="text-error text-sm mb-4">{{ loadError }}</div>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="flex gap-3">
          <UFormField :label="t('newOrder.fields.orderNumber')" name="orderNumber" class="flex-1">
            <UInput v-model="state.orderNumber" :placeholder="t('newOrder.placeholder.orderNumber')" class="w-full" />
          </UFormField>
          <UFormField :label="t('newOrder.fields.tx')" name="tx" class="w-28">
            <UInput v-model.number="state.tx" type="number" min="0" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="t('newOrder.fields.product')" name="productCode">
          <USelect
            v-model="state.productCode"
            :items="products.map(p => ({ label: `${p.number} — ${localize(p.name, p.nameEng) ?? p.number}`, value: p.number }))"
            :placeholder="t('newOrder.placeholder.selectProduct')"
            class="w-full"
          />
        </UFormField>

        <div class="flex gap-3">
          <UFormField :label="t('newOrder.fields.volume')" name="volume" class="flex-1">
            <UInput v-model.number="state.volume" type="number" :placeholder="t('newOrder.placeholder.volume')" class="w-full" />
          </UFormField>
          <UFormField :label="t('newOrder.fields.unit')" name="uomCode" class="w-36">
            <USelect
              v-model="state.uomCode"
              :items="uoms.map(u => ({ label: u.code, value: u.code }))"
              :disabled="!!selectedProduct"
              :placeholder="t('newOrder.placeholder.selectUnit')"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex gap-3">
          <UFormField :label="t('newOrder.fields.plannedStart')" name="plannedStartAt" class="flex-1">
            <UInput v-model="state.plannedStartAt" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField :label="t('newOrder.fields.plannedComplete')" name="plannedCompleteAt" class="flex-1">
            <UInput v-model="state.plannedCompleteAt" type="datetime-local" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="t('newOrder.fields.line')" name="lineId">
          <USelect
            v-model="state.lineId"
            :items="visibleLines.map(l => ({ label: l.name, value: l.id }))"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('newOrder.fields.dueDate')" name="dueDate">
          <UInput v-model="state.dueDate" type="date" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton :label="t('common.cancel')" color="neutral" variant="subtle" :disabled="isSubmitting" @click="open = false" />
          <UButton :label="t('common.create')" color="primary" type="submit" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
