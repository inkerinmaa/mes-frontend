<script setup lang="ts">
import { computed, useTemplateRef, ref, watch } from 'vue'
import { format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import { useElementSize } from '@vueuse/core'
import { apiFetch } from '../../utils/api'
import type { Period, Range } from '../../types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
  line: number
}>()

type DataRecord = {
  date: Date
  value: number
}

const { width } = useElementSize(cardRef)

const data = ref<DataRecord[]>([])

watch([() => props.period, () => props.range, () => props.line], async () => {
  try {
    const startDate = props.range.start.toISOString().split('T')[0]
    const endDate = props.range.end.toISOString().split('T')[0]
    const raw = await apiFetch<{ date: string, value: number }[]>(
      `/dashboard/efficiency?period=${props.period}&startDate=${startDate}&endDate=${endDate}&lineId=${props.line}`
    )
    data.value = raw.map(d => ({ date: new Date(d.date), value: d.value }))
  } catch (e) {
    console.error('Failed to fetch efficiency:', e)
  }
}, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.value

const average = computed(() => {
  if (!data.value.length) return 0
  return Math.round(data.value.reduce((acc, { value }) => acc + value, 0) / data.value.length * 10) / 10
})

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${d.value}%`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Line Efficiency
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ average }}%
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
