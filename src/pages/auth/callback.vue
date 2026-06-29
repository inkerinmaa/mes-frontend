<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useMesUser } from '../../composables/useMesUser'

const router = useRouter()
const { handleCallback } = useAuth()
const { syncUser } = useMesUser()

onMounted(async () => {
  try {
    await handleCallback()
    await syncUser()
    router.replace('/')
  } catch (e) {
    console.error('Authentication callback error:', e)
    router.replace('/login')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
  </div>
</template>
