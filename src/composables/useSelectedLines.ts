import { ref, computed, watch } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useLines } from './useLines'
import { useMesUser } from './useMesUser'

const _useSelectedLines = () => {
  const { lines } = useLines()
  const { userId } = useMesUser()

  function storageKey() {
    return userId.value ? `mes_selected_lines_${userId.value}` : 'mes_selected_lines'
  }

  function load(): number[] | null {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    try { return JSON.parse(raw) as number[] } catch { return null }
  }

  const selectedLineIds = ref<number[]>(load() ?? [])

  // Reload when the logged-in user changes
  watch(userId, () => {
    selectedLineIds.value = load() ?? []
  })

  function setSelectedLines(ids: number[]) {
    selectedLineIds.value = ids
    localStorage.setItem(storageKey(), JSON.stringify(ids))
  }

  // Empty selectedLineIds = no preference set → show everything
  const visibleLines = computed(() => {
    if (selectedLineIds.value.length === 0) return lines.value
    return lines.value.filter(l => selectedLineIds.value.includes(l.id))
  })

  function isLineVisible(id: number): boolean {
    if (selectedLineIds.value.length === 0) return true
    return selectedLineIds.value.includes(id)
  }

  return { selectedLineIds, visibleLines, setSelectedLines, isLineVisible }
}

export const useSelectedLines = createSharedComposable(_useSelectedLines)
