<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { eachDayOfInterval } from 'date-fns'
import type { Period, Range } from '../../types'

const { t } = useI18n()

const model = defineModel<Period>({ required: true })

const props = defineProps<{
  range: Range
}>()

const days = computed(() => eachDayOfInterval(props.range))

const availablePeriods = computed<Period[]>(() => {
  if (days.value.length <= 8) return ['daily']
  if (days.value.length <= 31) return ['daily', 'weekly']
  return ['weekly', 'monthly']
})

const periodItems = computed(() =>
  availablePeriods.value.map(p => ({
    label: t(`home.periods.${p}`),
    value: p
  }))
)

watch(availablePeriods, () => {
  if (!availablePeriods.value.includes(model.value)) {
    model.value = availablePeriods.value[0]
  }
})
</script>

<template>
  <USelect
    v-model="model"
    :items="periodItems"
    variant="ghost"
    class="data-[state=open]:bg-elevated"
    :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
  />
</template>
