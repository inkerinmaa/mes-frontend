<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { apiFetch } from '../../utils/api'
import type { ProcessParam } from '../../types'

const { t, locale } = useI18n()
const route = useRoute()

const lineId = computed(() => Number(route.params.lineId))
const unit = computed(() => route.params.unit as string)

const data = ref<ProcessParam[]>([])
const isLoading = ref(false)
const lastFetch = ref<Date | null>(null)

async function fetchData() {
  if (!unit.value) return
  isLoading.value = true
  try {
    data.value = await apiFetch<ProcessParam[]>(
      `/production/lines/${lineId.value}/units/${unit.value}/latest`
    )
    lastFetch.value = new Date()
  } catch (e) {
    console.error('Failed to fetch process data:', e)
  } finally {
    isLoading.value = false
  }
}

watch([lineId, unit], fetchData)
onMounted(fetchData)

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(fetchData, 30_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function formatValue(param: string, value: number): string {
  const decimals: Record<string, number> = {
    cure_temp: 1, cure_pressure: 2, belt_speed: 2,
    acon_temp: 1, acon_airflow: 0, acon_humidity: 1,
    binder_flow: 1, binder_conc: 2, binder_pressure: 2,
    line_speed: 2, line_output: 0,
    pack_speed: 1, film_tension: 1,
  }
  return value.toFixed(decimals[param] ?? 1)
}

const lastUpdated = computed(() => {
  if (!lastFetch.value) return ''
  return lastFetch.value.toLocaleTimeString(locale.value === 'ru' ? 'ru-RU' : 'en-US')
})
</script>

<template>
  <div class="p-6 space-y-6 shrink-0">
    <div class="flex items-center justify-end gap-3">
      <span v-if="lastFetch" class="text-xs text-muted">
        {{ t('production.lastUpdated') }}: {{ lastUpdated }}
      </span>
      <UButton
        :label="t('production.refresh')"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        size="sm"
        :loading="isLoading"
        @click="fetchData"
      />
    </div>

    <div v-if="!isLoading && data.length === 0" class="text-sm text-muted">
      {{ t('production.noData') }}
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="param in data"
        :key="param.param"
        class="shrink-0"
      >
        <div class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide">
            {{ t(`production.params.${param.param}`) }}
          </p>
          <div class="flex items-end gap-2">
            <span class="text-3xl font-semibold tabular-nums leading-none">
              {{ formatValue(param.param, param.value) }}
            </span>
            <span class="text-base text-muted pb-0.5">
              {{ t(`production.uom.${param.param}`) }}
            </span>
          </div>
          <p class="text-xs text-dimmed">
            {{ new Date(param.ts).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US') }}
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
