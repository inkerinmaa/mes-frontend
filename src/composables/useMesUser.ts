import { ref, computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { apiFetch } from '../utils/api'

interface MeResponse {
  id: number
  email: string
  username: string
  fullName: string
  role: 'admin' | 'operator' | 'viewer'
}

const _useMesUser = () => {
  const role = ref<'admin' | 'operator' | 'viewer' | null>(
    localStorage.getItem('mes_role') as 'admin' | 'operator' | 'viewer' | null
  )
  const userId = ref<number | null>(
    localStorage.getItem('mes_user_id') ? Number(localStorage.getItem('mes_user_id')) : null
  )
  const fullName = ref<string>(localStorage.getItem('mes_full_name') || '')
  const email = ref<string>(localStorage.getItem('mes_email') || '')
  const isSyncing = ref(false)

  const isAdmin = computed(() => role.value === 'admin')
  // Show admin UI unless we know for certain the user is a viewer
  const canSeeAdminUi = computed(() => role.value !== 'viewer')

  async function syncUser() {
    isSyncing.value = true
    try {
      const data = await apiFetch<MeResponse>('/me', { method: 'POST' })
      role.value = data.role
      userId.value = data.id
      fullName.value = data.fullName
      email.value = data.email
      localStorage.setItem('mes_role', data.role)
      localStorage.setItem('mes_user_id', String(data.id))
      localStorage.setItem('mes_full_name', data.fullName)
      localStorage.setItem('mes_email', data.email)
    } catch (e) {
      console.error('Failed to sync user:', e)
    } finally {
      isSyncing.value = false
    }
  }

  function setFullName(name: string) {
    fullName.value = name
    localStorage.setItem('mes_full_name', name)
  }

  function clearUser() {
    role.value = null
    userId.value = null
    fullName.value = ''
    email.value = ''
    localStorage.removeItem('mes_role')
    localStorage.removeItem('mes_user_id')
    localStorage.removeItem('mes_full_name')
    localStorage.removeItem('mes_email')
  }

  return { role, userId, fullName, email, isAdmin, canSeeAdminUi, isSyncing, syncUser, setFullName, clearUser }
}

export const useMesUser = createSharedComposable(_useMesUser)
