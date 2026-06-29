import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

const _useLine = () => {
  const stored = localStorage.getItem('mes_home_line')
  const selectedLine = ref<number>(stored ? Number(stored) : 1)

  function setLine(id: number) {
    selectedLine.value = id
    localStorage.setItem('mes_home_line', String(id))
  }

  return { selectedLine, setLine }
}

export const useLine = createSharedComposable(_useLine)
