import { ref } from 'vue'
import { createSharedComposable, watchDebounced } from '@vueuse/core'
import { apiFetch } from '../utils/api'
import { useDashboard } from './useDashboard'
import type { LogEntry, UserNotificationPref } from '../types'

const ALL_LOG_TYPES: string[] = ['USER', 'PROCESS', 'APP', 'EQUIPMENT', 'INTEGRATION']

const _useNotifications = () => {
  const { alertsUpdated } = useDashboard()

  const alerts = ref<LogEntry[]>([])
  const prefs = ref<UserNotificationPref[]>([])
  const isFetchingAlerts = ref(false)

  async function fetchPrefs() {
    try {
      prefs.value = await apiFetch<UserNotificationPref[]>('/me/notification-prefs')
    } catch {
      prefs.value = ALL_LOG_TYPES.map(t => ({ logType: t as any, enabled: true }))
    }
  }

  async function fetchAlerts() {
    isFetchingAlerts.value = true
    try {
      alerts.value = await apiFetch<LogEntry[]>('/notifications')
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    } finally {
      isFetchingAlerts.value = false
    }
  }

  async function updatePref(logType: string, enabled: boolean) {
    prefs.value = prefs.value.map(p => p.logType === logType ? { ...p, enabled } : p)
    try {
      await apiFetch('/me/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify({ prefs: prefs.value })
      })
    } catch (e) {
      console.error('Failed to save notification pref:', e)
    }
  }

  async function ackAll() {
    try {
      await apiFetch('/notifications/ack', { method: 'POST' })
      alerts.value = []
    } catch (e) {
      console.error('Failed to acknowledge alerts:', e)
    }
  }

  // Re-fetch on SignalR push, debounced so rapid writes don't flood the API
  watchDebounced(alertsUpdated, () => {
    fetchAlerts()
  }, { debounce: 2000 })

  fetchPrefs()
  fetchAlerts()

  return { alerts, prefs, isFetchingAlerts, fetchAlerts, updatePref, ackAll }
}

export const useNotifications = createSharedComposable(_useNotifications)
