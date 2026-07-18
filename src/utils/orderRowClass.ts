import type { OrderStatus } from '../types'

export function orderRowClass(status: OrderStatus | string): string {
  switch (status) {
    case 'running':   return 'bg-green-500/10 hover:bg-green-500/20'
    case 'completed': return 'bg-blue-500/10 hover:bg-blue-500/20'
    case 'created':
    case 'paused':    return 'bg-yellow-500/10 hover:bg-yellow-500/20'
    default:          return ''
  }
}
