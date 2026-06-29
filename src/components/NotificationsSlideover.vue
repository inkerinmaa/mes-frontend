<script setup lang="ts">
import { watch } from 'vue'
import { formatTimeAgo } from '@vueuse/core'
import { useDashboard } from '../composables/useDashboard'
import { useNotifications } from '../composables/useNotifications'

const { isNotificationsSlideoverOpen } = useDashboard()
const { alerts, isFetchingAlerts, fetchAlerts, ackAll } = useNotifications()

watch(isNotificationsSlideoverOpen, (open) => {
  if (open) fetchAlerts()
})

const levelColor: Record<string, 'neutral' | 'primary' | 'warning' | 'error'> = {
  DEBUG:    'neutral',
  INFO:     'primary',
  WARNING:  'warning',
  ERROR:    'error',
  CRITICAL: 'error'
}

const typeColor: Record<string, 'neutral' | 'primary' | 'warning' | 'success' | 'secondary'> = {
  USER:        'neutral',
  PROCESS:     'primary',
  APP:         'neutral',
  EQUIPMENT:   'warning',
  INTEGRATION: 'secondary'
}
</script>

<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Alerts">
    <template #body>
      <div v-if="isFetchingAlerts" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
      </div>

      <div v-else-if="alerts.length === 0" class="flex flex-col items-center justify-center py-12 gap-2 text-muted">
        <UIcon name="i-lucide-bell-off" class="size-8" />
        <p class="text-sm">No alerts</p>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="rounded-md px-3 py-2.5 hover:bg-elevated/50 flex flex-col gap-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <UBadge :color="levelColor[alert.level] ?? 'neutral'" variant="subtle" size="xs">{{ alert.level }}</UBadge>
              <UBadge :color="typeColor[alert.type] ?? 'neutral'" variant="outline" size="xs">{{ alert.type }}</UBadge>
            </div>
            <time :datetime="alert.ts" class="text-muted text-xs shrink-0">
              {{ formatTimeAgo(new Date(alert.ts)) }}
            </time>
          </div>
          <p class="text-sm text-dimmed leading-snug">{{ alert.message }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton
          label="Acknowledge All"
          color="neutral"
          variant="outline"
          icon="i-lucide-check-check"
          :disabled="alerts.length === 0"
          @click="ackAll"
        />
      </div>
    </template>
  </USlideover>
</template>
