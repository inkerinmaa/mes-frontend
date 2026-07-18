import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { apiFetch } from '../utils/api'
import type { ProductionLine } from '../types'

const _useLines = () => {
  const lines = ref<ProductionLine[]>([])

  async function fetchLines() {
    if (lines.value.length) return
    try {
      lines.value = await apiFetch<ProductionLine[]>('/lines')
    } catch (e) {
      console.error('Failed to fetch production lines:', e)
    }
  }

  async function refreshLines() {
    lines.value = []
    await fetchLines()
  }

  const lineMap = computed(() =>
    Object.fromEntries(lines.value.map(l => [l.id, l.name])) as Record<number, string>
  )

  const lineById = computed(() =>
    Object.fromEntries(lines.value.map(l => [l.id, l])) as Record<number, ProductionLine>
  )

  function lineName(id: number): string {
    return lineMap.value[id] ?? `Line ${id}`
  }

  return { lines, lineMap, lineById, lineName, fetchLines, refreshLines }
}

export const useLines = createSharedComposable(_useLines)
