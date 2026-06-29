import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createSharedComposable } from '@vueuse/core'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useAuth } from './useAuth'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()
  const isNotificationsSlideoverOpen = ref(false)
  const { getAccessToken } = useAuth()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-o': () => router.push('/orders'),
    'g-s': () => router.push('/settings'),
    n: () => (isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value)
  })

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
  })

  // Single shared SignalR connection for the whole app.
  // Three server events:
  //   OrdersUpdated      — from OrdersBackgroundService, every 5 s
  //   StatsUpdated       — from ProcessDataService, every 3 s (aggregated KPIs)
  //   ProcessDataUpdated — from ProcessDataService, every 3 s (raw OPC UA telemetry)
  const ordersSignalR = ref<{ value: number; variation: number } | null>(null)
  const machineStateUpdated = ref<{ lineId: number } | null>(null)
  const stopInserted = ref<{ lineId: number } | null>(null)

  const statsSignalR = ref<{
    totalTonnes: number
    totalTonnesVariation: number
    lineUptime: number
    lineUptimeVariation: number
    wastePercentage: number
    wastePercentageVariation: number
  } | null>(null)

  const processDataSignalR = ref<{
    timestamp: string
    temperature: number
    pressure: number
    cycleTime: number
    machineState: string
  } | null>(null)

  const connection = new HubConnectionBuilder()
    .withUrl('/hubs/dashboard', { accessTokenFactory: () => getAccessToken() || '' })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  const alertsUpdated = ref(0)
  const orderProducedUpdated = ref<{ orderId: number; producedPackages: number } | null>(null)

  connection.on('OrdersUpdated', (data) => { ordersSignalR.value = data })
  connection.on('StatsUpdated', (data) => { statsSignalR.value = data })
  connection.on('ProcessDataUpdated', (data) => { processDataSignalR.value = data })
  connection.on('MachineStateUpdated', (data) => { machineStateUpdated.value = data })
  connection.on('StopInserted', (data) => { stopInserted.value = data })
  connection.on('AlertsUpdated', () => { alertsUpdated.value++ })
  connection.on('OrderProducedUpdated', (data) => { orderProducedUpdated.value = data })

  connection.start().catch(e => console.error('SignalR connection failed:', e))

  return {
    isNotificationsSlideoverOpen,
    ordersSignalR,
    statsSignalR,
    processDataSignalR,
    machineStateUpdated,
    stopInserted,
    alertsUpdated,
    orderProducedUpdated
  }
}

export const useDashboard = createSharedComposable(_useDashboard)
