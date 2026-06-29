<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '../../composables/useNotifications'

const { t } = useI18n()
const { prefs, updatePref } = useNotifications()

const typeConfig = computed<Record<string, { label: string; description: string }>>(() => ({
  USER:        { label: t('notifications.types.USER.label'),        description: t('notifications.types.USER.description') },
  PROCESS:     { label: t('notifications.types.PROCESS.label'),     description: t('notifications.types.PROCESS.description') },
  APP:         { label: t('notifications.types.APP.label'),         description: t('notifications.types.APP.description') },
  EQUIPMENT:   { label: t('notifications.types.EQUIPMENT.label'),   description: t('notifications.types.EQUIPMENT.description') },
  INTEGRATION: { label: t('notifications.types.INTEGRATION.label'), description: t('notifications.types.INTEGRATION.description') }
}))
</script>

<template>
  <div>
    <UPageCard
      :title="t('notifications.title')"
      :description="t('notifications.description')"
      variant="naked"
      class="mb-4"
    />

    <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
      <UFormField
        v-for="pref in prefs"
        :key="pref.logType"
        :name="pref.logType"
        :label="typeConfig[pref.logType]?.label ?? pref.logType"
        :description="typeConfig[pref.logType]?.description"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <USwitch
          :model-value="pref.enabled"
          @update:model-value="(val: boolean) => updatePref(pref.logType, val)"
        />
      </UFormField>
    </UPageCard>
  </div>
</template>
