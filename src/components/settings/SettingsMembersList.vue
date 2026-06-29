<script setup lang="ts">
import type { DbUser } from '../../types'

const props = defineProps<{
  users: DbUser[]
  canEdit: boolean
}>()

const emit = defineEmits<{
  roleChange: [user: DbUser, role: 'admin' | 'viewer']
}>()

function initials(user: DbUser): string {
  const name = user.fullName || user.username || '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="user in users"
      :key="user.id"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar :alt="initials(user)" size="md" />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ user.fullName || user.username }}
          </p>
          <p class="text-muted truncate">
            {{ user.email || user.username }}
          </p>
          <p class="text-muted text-xs truncate">
            Last login: {{ user.lastLogin }}
          </p>
        </div>
      </div>

      <USelect
        :model-value="user.role"
        :items="[
          { label: 'Admin', value: 'admin' },
          { label: 'Viewer', value: 'viewer' }
        ]"
        :disabled="!canEdit"
        color="neutral"
        class="min-w-28"
        @update:model-value="(v: string) => emit('roleChange', user, v as 'admin' | 'viewer')"
      />
    </li>

    <li v-if="users.length === 0" class="py-8 text-center text-muted text-sm">
      No users found
    </li>
  </ul>
</template>
