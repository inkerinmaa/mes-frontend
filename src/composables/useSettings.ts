import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { apiFetch } from '../utils/api'
import type { AppSetting } from '../types'

const _useSettings = () => {
  const autoRefreshEnabled = ref(true)
  const refreshIntervalSeconds = ref(60)
  const showEfficiencyChart = ref(true)
  const showStatsCards = ref(true)
  const showUptimeDiagram = ref(true)
  const orderColorRunning   = ref('#bbf7d0')
  const orderColorCompleted = ref('#bfdbfe')
  const orderColorQueued    = ref('#fef08a')
  const loaded = ref(false)

  async function fetchSettings() {
    try {
      const all = await apiFetch<AppSetting[]>('/settings')
      for (const s of all) {
        if (s.key === 'timeline_auto_refresh_enabled')
          autoRefreshEnabled.value = s.value === 'true'
        if (s.key === 'timeline_refresh_interval_seconds')
          refreshIntervalSeconds.value = parseInt(s.value, 10) || 60
        if (s.key === 'show_efficiency_chart')
          showEfficiencyChart.value = s.value !== 'false'
        if (s.key === 'show_stats_cards')
          showStatsCards.value = s.value !== 'false'
        if (s.key === 'show_uptime_diagram')
          showUptimeDiagram.value = s.value !== 'false'
        if (s.key === 'order_color_running')   orderColorRunning.value   = s.value
        if (s.key === 'order_color_completed') orderColorCompleted.value = s.value
        if (s.key === 'order_color_queued')    orderColorQueued.value    = s.value
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      loaded.value = true
    }
  }

  async function updateSetting(key: string, value: string): Promise<void> {
    await apiFetch(`/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value })
    })
    if (key === 'timeline_auto_refresh_enabled')
      autoRefreshEnabled.value = value === 'true'
    if (key === 'timeline_refresh_interval_seconds')
      refreshIntervalSeconds.value = parseInt(value, 10) || 60
    if (key === 'show_efficiency_chart')
      showEfficiencyChart.value = value !== 'false'
    if (key === 'show_stats_cards')
      showStatsCards.value = value !== 'false'
    if (key === 'show_uptime_diagram')   showUptimeDiagram.value   = value !== 'false'
    if (key === 'order_color_running')   orderColorRunning.value   = value
    if (key === 'order_color_completed') orderColorCompleted.value = value
    if (key === 'order_color_queued')    orderColorQueued.value    = value
  }

  fetchSettings()

  return { autoRefreshEnabled, refreshIntervalSeconds, showEfficiencyChart, showStatsCards, showUptimeDiagram, orderColorRunning, orderColorCompleted, orderColorQueued, loaded, updateSetting }
}

export const useSettings = createSharedComposable(_useSettings)
