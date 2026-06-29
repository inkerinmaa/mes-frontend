<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { apiFetch } from '../../utils/api'
import type { UnacknowledgedStop } from '../../types'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'

const { t } = useI18n()

const props = defineProps<{ stop?: UnacknowledgedStop | null }>()
const emit = defineEmits<{ created: [] }>()

const open = defineModel<boolean>('open', { default: false })
const isSubmitting = ref(false)
const { fetchLines } = useLines()
const { visibleLines } = useSelectedLines()

watch(open, (val) => {
  if (val) {
    fetchLines()
    resetForm()
  }
})

const eventTypeItems = computed(() => [
  { label: t('addEvent.types.downtime_unplanned'), value: 'downtime_unplanned' },
  { label: t('addEvent.types.downtime_planned'),   value: 'downtime_planned' },
  { label: t('addEvent.types.changeover'),         value: 'changeover' },
  { label: t('addEvent.types.quality_hold'),       value: 'quality_hold' },
  { label: t('addEvent.types.maintenance'),        value: 'maintenance' },
  { label: t('addEvent.types.operator_note'),      value: 'operator_note' },
  { label: t('addEvent.types.safety'),             value: 'safety' },
])

const schema = z.object({
  lineId:      z.coerce.number().min(1),
  eventType:   z.string().min(1, 'Select event type'),
  severity:    z.string().min(1),
  title:       z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  startAt:     z.string().optional(),
  endAt:       z.string().optional(),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  lineId:      1,
  eventType:   undefined,
  severity:    'info',
  title:       '',
  description: '',
  startAt:     '',
  endAt:       '',
})

function resetForm() {
  Object.assign(state, {
    lineId:      props.stop?.lineId ?? 1,
    eventType:   undefined,
    severity:    'info',
    title:       '',
    description: '',
    startAt:     '',
    endAt:       '',
  })
}

const formatTs = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  })

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    await apiFetch<unknown>('/events', {
      method: 'POST',
      body: JSON.stringify({
        lineId:         props.stop ? props.stop.lineId : Number(event.data.lineId),
        machineStateId: props.stop?.id ?? null,
        orderId:        null,
        eventType:      event.data.eventType,
        severity:       event.data.severity,
        title:          event.data.title,
        description:    event.data.description || null,
        startAt:        props.stop
          ? props.stop.startAt
          : (event.data.startAt || null),
        endAt:          props.stop ? null : (event.data.endAt || null),
      })
    })
    toast.add({ title: t('addEvent.toast.logged'), color: 'success' })
    open.value = false
    emit('created')
    resetForm()
  } catch (e: any) {
    toast.add({ title: t('common.error'), description: e.message || t('addEvent.toast.failed'), color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="stop ? t('addEvent.titleAnnotate') : t('addEvent.titleAdd')"
    :description="stop ? t('addEvent.descAnnotate') : t('addEvent.descAdd')"
  >
    <template #body>
      <div v-if="stop" class="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <p class="text-sm font-medium text-highlighted">{{ stop.lineName }}</p>
        <p class="text-xs text-muted mt-0.5">
          {{ t('addEvent.stoppedAt', { time: formatTs(stop.startAt), duration: stop.durationMinutes }) }}
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField v-if="!stop" :label="t('addEvent.fields.line')" name="lineId">
          <USelect
            v-model="state.lineId"
            :items="visibleLines.map(l => ({ label: l.name, value: l.id }))"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('addEvent.fields.eventType')" name="eventType">
          <USelect
            v-model="state.eventType"
            :items="eventTypeItems"
            :placeholder="t('addEvent.placeholder.selectType')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('addEvent.fields.severity')" name="severity">
          <USelect
            v-model="state.severity"
            :items="[
              { label: t('addEvent.severities.info'),     value: 'info' },
              { label: t('addEvent.severities.warning'),  value: 'warning' },
              { label: t('addEvent.severities.critical'), value: 'critical' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('addEvent.fields.title')" name="title">
          <UInput v-model="state.title" :placeholder="t('addEvent.placeholder.title')" class="w-full" />
        </UFormField>

        <UFormField :label="t('addEvent.fields.description')" name="description">
          <UTextarea v-model="state.description" :placeholder="t('addEvent.placeholder.description')" :rows="3" class="w-full" />
        </UFormField>

        <div v-if="!stop" class="flex gap-3">
          <UFormField :label="t('addEvent.fields.start')" name="startAt" class="flex-1">
            <UInput v-model="state.startAt" type="datetime-local" class="w-full" />
          </UFormField>
          <UFormField :label="t('addEvent.fields.end')" name="endAt" class="flex-1">
            <UInput v-model="state.endAt" type="datetime-local" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton :label="t('common.cancel')" color="neutral" variant="subtle" :disabled="isSubmitting" @click="open = false" />
          <UButton :label="t('common.save')" color="primary" type="submit" :loading="isSubmitting" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
