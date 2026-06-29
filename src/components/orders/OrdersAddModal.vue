<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { Sku, Uom } from '../../types'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'
import { useLocalizedField } from '../../composables/useLocalizedField'

const { t } = useI18n()
const { localize } = useLocalizedField()

const emit = defineEmits<{ created: [] }>()

let skuCache: Sku[] | null = null
let uomCache: Uom[] | null = null

const schema = z.object({
  orderNumber:       z.string().min(1, 'Required'),
  skuCode:           z.string().min(1, 'Select a SKU'),
  volume:            z.coerce.number().positive('Must be greater than 0'),
  uomCode:           z.string().min(1, 'Select a unit'),
  priority:          z.string(),
  lineId:            z.coerce.number().min(1),
  cage:              z.boolean().default(false),
  cageSize:          z.coerce.number().min(1).default(50),
  plannedStartAt:    z.string().min(1, 'Required'),
  plannedCompleteAt: z.string().min(1, 'Required'),
  dueDate:           z.string().optional()
})

type Schema = z.output<typeof schema>

const open = ref(false)
const isSubmitting = ref(false)
const skus = ref<Sku[]>([])
const uoms = ref<Uom[]>([])
const loadError = ref('')

const state = reactive<Partial<Schema>>({
  orderNumber:       '',
  skuCode:           undefined,
  volume:            undefined,
  uomCode:           undefined,
  priority:          'Medium',
  lineId:            1,
  cage:              false,
  cageSize:          50,
  plannedStartAt:    '',
  plannedCompleteAt: '',
  dueDate:           ''
})

onMounted(async () => {
  try {
    if (!skuCache) skuCache = await apiFetch<Sku[]>('/skus')
    skus.value = skuCache!

    if (!uomCache) uomCache = await apiFetch<Uom[]>('/uoms')
    uoms.value = uomCache!

    await fetchLines()
  } catch (e) {
    loadError.value = 'Failed to load form data'
    console.error('Failed to load SKUs/UOMs:', e)
  }
})

const toast = useToast()
const { lineName, fetchLines, lines } = useLines()
const { visibleLines } = useSelectedLines()

const selectedSku = computed(() => skus.value.find(s => s.code === state.skuCode))
const isWiredMattsLine = computed(() => {
  const line = lines.value.find(l => l.id === Number(state.lineId))
  return line?.name === 'Wired Matts'
})

// Wired Matts orders always use cage tracking, regardless of UOM; cage size
// comes from the SKU's packaging spec, not from user input.
watch([isWiredMattsLine, selectedSku], () => {
  if (isWiredMattsLine.value) {
    state.cage = true
    state.cageSize = selectedSku.value?.pcsInPack && selectedSku.value.pcsInPack > 0
      ? selectedSku.value.pcsInPack
      : 50
  } else {
    state.cage = false
    state.cageSize = 50
  }
}, { immediate: true })

function resetForm() {
  Object.assign(state, {
    orderNumber:       '',
    skuCode:           undefined,
    volume:            undefined,
    uomCode:           undefined,
    priority:          'Medium',
    lineId:            1,
    cage:              false,
    cageSize:          50,
    plannedStartAt:    '',
    plannedCompleteAt: '',
    dueDate:           ''
  })
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    await apiFetch<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber:       event.data.orderNumber,
        skuCode:           event.data.skuCode,
        lineId:            Number(event.data.lineId),
        volume:            Number(event.data.volume),
        uomCode:           event.data.uomCode,
        priority:          event.data.priority,
        plannedStartAt:    event.data.plannedStartAt || null,
        plannedCompleteAt: event.data.plannedCompleteAt || null,
        dueDate:           event.data.dueDate || null,
        cage:              event.data.cage ?? false,
        cageSize:          event.data.cage ? Number(event.data.cageSize) : 50
      })
    })
    toast.add({
      title: t('newOrder.toast.created'),
      description: `${event.data.orderNumber} — ${event.data.skuCode} × ${event.data.volume} ${event.data.uomCode} on ${lineName(Number(event.data.lineId))}`,
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
        <UFormField :label="t('newOrder.fields.orderNumber')" name="orderNumber">
          <UInput v-model="state.orderNumber" :placeholder="t('newOrder.placeholder.orderNumber')" class="w-full" />
        </UFormField>

        <UFormField :label="t('newOrder.fields.sku')" name="skuCode">
          <USelect
            v-model="state.skuCode"
            :items="skus.map(s => ({ label: `${s.code} — ${localize(s.name, s.nameEng)}`, value: s.code }))"
            :placeholder="t('newOrder.placeholder.selectSku')"
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
