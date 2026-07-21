<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiFetch } from '../../utils/api'
import type { Order } from '../../types'

const props = defineProps<{ order: Order | null }>()
const emit = defineEmits<{ rescheduled: [] }>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })
const isSubmitting = ref(false)

const state = reactive({ plannedStartAt: '', plannedCompleteAt: '' })

function toDatetimeLocal(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(open, (val) => {
  if (val && props.order) {
    state.plannedStartAt    = toDatetimeLocal(props.order.plannedStartAt)
    state.plannedCompleteAt = toDatetimeLocal(props.order.plannedCompleteAt)
  }
})

const toast = useToast()

async function onSubmit() {
  if (!props.order) return
  isSubmitting.value = true
  try {
    await apiFetch(`/orders/${props.order.id}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify({
        plannedStartAt:    state.plannedStartAt    || null,
        plannedCompleteAt: state.plannedCompleteAt || null,
      })
    })
    toast.add({ title: t('orders.reschedule.toast.saved'), color: 'success' })
    open.value = false
    emit('rescheduled')
  } catch (e: any) {
    toast.add({ title: t('common.error'), description: e?.message || t('orders.reschedule.toast.failed'), color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('orders.reschedule.title')"
    :description="order ? `#${order.orderNumber}` : ''"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex gap-3">
          <div class="flex-1 space-y-1.5">
            <label class="text-sm font-medium text-highlighted">{{ t('newOrder.fields.plannedStart') }}</label>
            <input
              v-model="state.plannedStartAt"
              type="datetime-local"
              class="w-full rounded-md border border-default bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex-1 space-y-1.5">
            <label class="text-sm font-medium text-highlighted">{{ t('newOrder.fields.plannedComplete') }}</label>
            <input
              v-model="state.plannedCompleteAt"
              type="datetime-local"
              class="w-full rounded-md border border-default bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <UButton :label="t('common.cancel')" color="neutral" variant="subtle" :disabled="isSubmitting" @click="open = false" />
          <UButton :label="t('common.save')" color="primary" :loading="isSubmitting" @click="onSubmit" />
        </div>
      </div>
    </template>
  </UModal>
</template>
