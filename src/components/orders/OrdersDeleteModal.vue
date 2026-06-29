<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiFetch } from '../../utils/api'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  count?: number
  orderIds?: number[]
}>(), {
  count: 0,
  orderIds: () => []
})

const emit = defineEmits<{ cancelled: [] }>()

const open = ref(false)
const isSubmitting = ref(false)

const toast = useToast()

async function onSubmit() {
  isSubmitting.value = true
  try {
    await Promise.all(props.orderIds.map(id => apiFetch(`/orders/${id}`, { method: 'DELETE' })))
    toast.add({ title: t('deleteOrders.toast.success', { n: props.count }, props.count), color: 'success' })
    open.value = false
    emit('cancelled')
  } catch {
    toast.add({ title: t('common.error'), description: t('deleteOrders.toast.failed'), color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('deleteOrders.title', { n: count }, count)"
    :description="t('deleteOrders.description')"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton :label="t('deleteOrders.keep')" color="neutral" variant="subtle" :disabled="isSubmitting" @click="open = false" />
        <UButton :label="t('deleteOrders.cancelOrders')" color="error" variant="solid" :loading="isSubmitting" @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
