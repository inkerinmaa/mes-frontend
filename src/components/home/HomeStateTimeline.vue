<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { apiFetch } from "../../utils/api";
import { useDashboard } from "../../composables/useDashboard";
import { useSettings } from "../../composables/useSettings";
import type { Period, Range, MachineState } from "../../types";

const { t } = useI18n();

const props = defineProps<{
  period: Period;
  range: Range;
  line: number;
}>();

const { machineStateUpdated } = useDashboard();
const { autoRefreshEnabled, refreshIntervalSeconds } = useSettings();

const states = ref<MachineState[]>([]);
const loading = ref(true);
const error = ref("");

async function fetchStates() {
  loading.value = true;
  error.value = "";
  try {
    const hours = Math.max(1, Math.round((props.range.end.getTime() - props.range.start.getTime()) / 3600000))
    states.value = await apiFetch<MachineState[]>(
      `/dashboard/states?lineId=${props.line}&hours=${hours}`,
    );
  } catch (e: any) {
    error.value = e?.message || "Unknown error";
    console.error("Failed to fetch states:", e);
  } finally {
    loading.value = false;
  }
}

watch([() => props.period, () => props.range, () => props.line], fetchStates, {
  immediate: true,
});

watch(machineStateUpdated, (event) => {
  if (event?.lineId === props.line) fetchStates();
});

let refreshTimer: ReturnType<typeof setInterval> | undefined;

function restartTimer() {
  clearInterval(refreshTimer);
  if (autoRefreshEnabled.value) {
    refreshTimer = setInterval(fetchStates, refreshIntervalSeconds.value * 1000);
  }
}

onMounted(restartTimer);
onUnmounted(() => clearInterval(refreshTimer));
watch([autoRefreshEnabled, refreshIntervalSeconds], restartTimer);

const totalMinutes = computed(() =>
  states.value.reduce((acc, s) => acc + s.durationMinutes, 0),
);

const stateConfig = computed<Record<string, { color: string; label: string }>>(() => ({
  running: { color: "bg-green-500", label: t("home.timeline.running") },
  warning: { color: "bg-yellow-500", label: t("home.timeline.warning") },
  stopped: { color: "bg-red-500", label: t("home.timeline.stopped") },
}));

const stateColor = (state: string) =>
  stateConfig.value[state]?.color || "bg-gray-400";
const stateLabel = (state: string) => stateConfig.value[state]?.label || state;

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const rangeLabel = computed(() => {
  const start = props.range.start
  const end = props.range.end
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  const today = new Date()
  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  if (isToday(end)) {
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    if (diffDays <= 1) return t('home.timeline.last24h')
    return t('home.timeline.lastNDays', { n: diffDays })
  }
  return `${fmt(start)} – ${fmt(end)}`
})

const legendItems = computed(() => {
  const counts: Record<string, number> = {};
  for (const s of states.value) {
    counts[s.state] = (counts[s.state] || 0) + s.durationMinutes;
  }
  return ["running", "warning", "stopped"]
    .filter((state) => counts[state])
    .map((state) => ({
      state,
      label: stateLabel(state),
      color: stateColor(state),
      minutes: counts[state],
      percentage: totalMinutes.value
        ? Math.round((counts[state] / totalMinutes.value) * 100)
        : 0,
    }));
});
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p class="text-xs text-muted uppercase mb-1">
            {{ t('home.timeline.title') }}
          </p>
          <p class="text-sm text-dimmed">{{ rangeLabel }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div
            v-for="item in legendItems"
            :key="item.state"
            class="flex items-center gap-1.5 text-xs"
          >
            <span class="size-3 rounded-full" :class="item.color" />
            <span class="text-muted font-medium">{{ item.label }}</span>
            <span class="text-highlighted font-semibold"
              >{{ item.percentage }}%</span
            >
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center h-14 text-sm text-dimmed"
    >
      {{ t('home.timeline.loading') }}
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex items-center justify-center h-14 text-sm text-error"
    >
      Error: {{ error }}
    </div>

    <!-- Timeline -->
    <div v-else-if="states.length" class="space-y-3">
      <div class="flex h-14 rounded-lg overflow-hidden gap-0.5">
        <div
          v-for="(segment, index) in states"
          :key="index"
          class="relative group cursor-default transition-all hover:opacity-80"
          :class="stateColor(segment.state)"
          :style="{
            width: `${totalMinutes ? (segment.durationMinutes / totalMinutes) * 100 : 0}%`,
            minWidth: '4px',
          }"
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-white text-xs font-bold drop-shadow">
              {{ segment.durationMinutes }}m
            </span>
          </div>
        </div>
      </div>

      <div class="flex justify-between text-xs text-dimmed">
        <span>{{ formatTime(states[0].timestamp) }}</span>
        <span v-if="states.length > 2">{{
          formatTime(states[Math.floor(states.length / 2)].timestamp)
        }}</span>
        <span>{{ t('common.now') }}</span>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else
      class="flex items-center justify-center h-14 text-sm text-dimmed"
    >
      {{ t('home.timeline.empty') }}
    </div>
  </UCard>
</template>
