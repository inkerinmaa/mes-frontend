<script setup lang="ts">
import { useAuth } from '../composables/useAuth'

const { login } = useAuth()
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-default">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-highlighted">MES</h1>
          <p class="mt-1 text-sm text-muted">Sign in to access MES</p>
        </div>
      </template>

      <div class="flex flex-col gap-4">
        <UButton
          label="Sign in with Keycloak"
          icon="i-lucide-log-in"
          size="lg"
          block
          @click="login"
        />
      </div>
    </UCard>
  </div>
</template>
