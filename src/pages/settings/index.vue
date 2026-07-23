<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useMesUser } from '../../composables/useMesUser'
import { useSettings } from '../../composables/useSettings'
import { useLocale } from '../../composables/useLocale'
import { useLines } from '../../composables/useLines'
import { useSelectedLines } from '../../composables/useSelectedLines'
import { apiFetch } from '../../utils/api'

const { t } = useI18n()
const { fullName, role, setFullName, isAdmin } = useMesUser()
const { autoRefreshEnabled, refreshIntervalSeconds, showEfficiencyChart, showStatsCards, showUptimeDiagram, orderColorRunning, orderColorCompleted, orderColorQueued, updateSetting } = useSettings()
const { locale, setLocale } = useLocale()
const { lines, fetchLines, refreshLines } = useLines()
const { selectedLineIds, setSelectedLines } = useSelectedLines()
const toast = useToast()

fetchLines()

// Local copy for the form: always an explicit list of checked IDs.
// When selectedLineIds is empty (= no preference = all visible), we expand to all line IDs.
const linesState = ref<number[]>([])

function initLinesState() {
  if (selectedLineIds.value.length === 0 && lines.value.length > 0) {
    linesState.value = lines.value.map(l => l.id)
  } else if (selectedLineIds.value.length > 0) {
    linesState.value = [...selectedLineIds.value]
  }
}

watch(lines, initLinesState, { immediate: true })
watch(selectedLineIds, initLinesState)

const linesAtLeastOne = computed(() => linesState.value.length > 0)

function toggleLine(id: number) {
  if (linesState.value.includes(id)) {
    linesState.value = linesState.value.filter(x => x !== id)
  } else {
    linesState.value = [...linesState.value, id]
  }
}

function saveLines() {
  if (!linesAtLeastOne.value) return
  // If all lines are checked, store empty array (= "no preference, show all")
  const allIds = lines.value.map(l => l.id)
  const allChecked = allIds.length === linesState.value.length && allIds.every(id => linesState.value.includes(id))
  setSelectedLines(allChecked ? [] : linesState.value)
  toast.add({ title: t('settings.lines.toast.saved'), color: 'success' })
}

const schema = z.object({
  name: z.string().min(2, 'Must be at least 2 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: fullName.value || ''
})

// Populate once syncUser resolves (may run after mount)
watch(fullName, (val) => {
  if (val && !state.name) state.name = val
})

const roleLabel = computed(() =>
  role.value === 'admin' ? t('settings.profile.admin')
    : role.value === 'operator' ? t('settings.profile.operator')
    : t('settings.profile.viewer'))
const roleColor = computed(() => role.value === 'admin' ? 'primary' as const : 'neutral' as const)

const isSubmitting = ref(false)
const isSavingSystem = ref(false)
const isSavingColors = ref(false)
const isSavingLineControls = ref(false)

// Per-line control toggles (admin only) — keyed by line id
const lineControls = ref<Record<number, { orderControlEnabled: boolean; manualWasteEnabled: boolean; producedCorrectionEnabled: boolean }>>({})

watch(lines, (val) => {
  val.forEach(l => {
    if (!(l.id in lineControls.value)) {
      lineControls.value[l.id] = {
        orderControlEnabled: l.orderControlEnabled,
        manualWasteEnabled: l.manualWasteEnabled,
        producedCorrectionEnabled: l.producedCorrectionEnabled
      }
    }
  })
}, { immediate: true })

async function saveLineControls() {
  isSavingLineControls.value = true
  try {
    await Promise.all(
      lines.value.map(l =>
        apiFetch(`/lines/${l.id}/settings`, {
          method: 'PATCH',
          body: JSON.stringify(lineControls.value[l.id])
        })
      )
    )
    await refreshLines()
    toast.add({ title: t('settings.lineControls.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.lineControls.toast.failed'), color: 'error' })
  } finally {
    isSavingLineControls.value = false
  }
}

// Local copies for the System form — committed only on Save
const sysState = reactive({
  autoRefresh: autoRefreshEnabled.value,
  intervalSeconds: refreshIntervalSeconds.value,
  showEfficiencyChart: showEfficiencyChart.value,
  showStatsCards: showStatsCards.value,
  showUptimeDiagram: showUptimeDiagram.value
})

const colorsState = reactive({
  running:   orderColorRunning.value,
  completed: orderColorCompleted.value,
  queued:    orderColorQueued.value
})

// Keep local copies in sync if settings load after mount
watch(autoRefreshEnabled, (v) => { sysState.autoRefresh = v })
watch(refreshIntervalSeconds, (v) => { sysState.intervalSeconds = v })
watch(showEfficiencyChart, (v) => { sysState.showEfficiencyChart = v })
watch(showStatsCards, (v) => { sysState.showStatsCards = v })
watch(showUptimeDiagram, (v) => { sysState.showUptimeDiagram = v })
watch(orderColorRunning,   (v) => { colorsState.running   = v })
watch(orderColorCompleted, (v) => { colorsState.completed = v })
watch(orderColorQueued,    (v) => { colorsState.queued    = v })

async function saveSystemSettings() {
  if (sysState.intervalSeconds < 10 || sysState.intervalSeconds > 3600) {
    toast.add({ title: t('settings.system.intervalError'), color: 'error' })
    return
  }
  isSavingSystem.value = true
  try {
    await updateSetting('timeline_auto_refresh_enabled', String(sysState.autoRefresh))
    await updateSetting('timeline_refresh_interval_seconds', String(sysState.intervalSeconds))
    await updateSetting('show_efficiency_chart', String(sysState.showEfficiencyChart))
    await updateSetting('show_stats_cards', String(sysState.showStatsCards))
    await updateSetting('show_uptime_diagram', String(sysState.showUptimeDiagram))
    toast.add({ title: t('settings.system.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.system.toast.failed'), color: 'error' })
  } finally {
    isSavingSystem.value = false
  }
}

async function saveOrderColors() {
  isSavingColors.value = true
  try {
    await updateSetting('order_color_running',   colorsState.running)
    await updateSetting('order_color_completed', colorsState.completed)
    await updateSetting('order_color_queued',    colorsState.queued)
    toast.add({ title: t('settings.orderColors.toast.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.orderColors.toast.failed'), color: 'error' })
  } finally {
    isSavingColors.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    await apiFetch('/me/name', {
      method: 'PATCH',
      body: JSON.stringify({ fullName: event.data.name })
    })
    setFullName(event.data.name)
    toast.add({ title: t('settings.profile.toast.updated'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.profile.toast.failed'), description: 'Please try again.', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UForm
    id="settings"
    :schema="schema"
    :state="state"
    @submit="onSubmit"
  >
    <UPageCard
      :title="t('settings.profile.title')"
      :description="t('settings.profile.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="t('common.saveChanges')"
        color="neutral"
        type="submit"
        :loading="isSubmitting"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        :label="t('settings.profile.name')"
        :description="t('settings.profile.nameDesc')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="state.name"
          autocomplete="off"
          :placeholder="t('settings.profile.namePlaceholder')"
        />
      </UFormField>

      <USeparator />

      <UFormField
        name="role"
        :label="t('settings.profile.role')"
        :description="t('settings.profile.roleDesc')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <UBadge
          :color="roleColor"
          variant="subtle"
          size="lg"
        >
          {{ roleLabel }}
        </UBadge>
      </UFormField>
    </UPageCard>
  </UForm>

  <div class="mt-6">
    <UPageCard
      :title="t('settings.lines.title')"
      :description="t('settings.lines.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        :label="t('settings.lines.saveChanges')"
        color="neutral"
        :disabled="!linesAtLeastOne"
        class="w-fit lg:ms-auto"
        @click="saveLines"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <p v-if="!linesAtLeastOne" class="text-sm text-error mb-2">
        {{ t('settings.lines.atLeastOne') }}
      </p>
      <div class="space-y-3">
        <div
          v-for="line in lines"
          :key="line.id"
          class="flex items-center justify-between"
        >
          <span class="text-sm font-medium text-highlighted">{{ line.name }}</span>
          <UCheckbox
            :model-value="linesState.includes(line.id)"
            @update:model-value="toggleLine(line.id)"
          />
        </div>
      </div>
    </UPageCard>
  </div>

  <div class="mt-6">
    <UPageCard
      :title="t('settings.system.title')"
      :description="t('settings.system.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        :label="t('common.saveChanges')"
        color="neutral"
        :loading="isSavingSystem"
        :disabled="!isAdmin"
        class="w-fit lg:ms-auto"
        @click="saveSystemSettings"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        :label="t('settings.system.autoRefresh')"
        :description="t('settings.system.autoRefreshDesc')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <USwitch v-model="sysState.autoRefresh" :disabled="!isAdmin" />
      </UFormField>

      <USeparator />

      <UFormField
        :label="t('settings.system.interval')"
        :description="t('settings.system.intervalDesc')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model.number="sysState.intervalSeconds"
          type="number"
          min="10"
          max="3600"
          class="w-32"
          :disabled="!isAdmin || !sysState.autoRefresh"
        />
      </UFormField>

      <USeparator />

      <UFormField
        :label="t('settings.system.efficiencyChart')"
        :description="t('settings.system.efficiencyChartDesc')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <USwitch v-model="sysState.showEfficiencyChart" :disabled="!isAdmin" />
      </UFormField>

      <USeparator />

      <UFormField
        :label="t('settings.system.statsCards')"
        :description="t('settings.system.statsCardsDesc')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <USwitch v-model="sysState.showStatsCards" :disabled="!isAdmin" />
      </UFormField>

      <USeparator />

      <UFormField
        :label="t('settings.system.uptimeDiagram')"
        :description="t('settings.system.uptimeDiagramDesc')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <USwitch v-model="sysState.showUptimeDiagram" :disabled="!isAdmin" />
      </UFormField>
    </UPageCard>
  </div>

  <div v-if="isAdmin" class="mt-6">
    <UPageCard
      :title="t('settings.orderColors.title')"
      :description="t('settings.orderColors.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        :label="t('common.saveChanges')"
        color="neutral"
        :loading="isSavingColors"
        class="w-fit lg:ms-auto"
        @click="saveOrderColors"
      />
    </UPageCard>
    <UPageCard variant="subtle">
      <UFormField :label="t('settings.orderColors.running')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <input type="color" v-model="colorsState.running" class="w-10 h-8 rounded cursor-pointer border border-default" />
          <span class="text-sm font-mono text-muted">{{ colorsState.running }}</span>
        </div>
      </UFormField>
      <USeparator />
      <UFormField :label="t('settings.orderColors.completed')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <input type="color" v-model="colorsState.completed" class="w-10 h-8 rounded cursor-pointer border border-default" />
          <span class="text-sm font-mono text-muted">{{ colorsState.completed }}</span>
        </div>
      </UFormField>
      <USeparator />
      <UFormField :label="t('settings.orderColors.queued')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <input type="color" v-model="colorsState.queued" class="w-10 h-8 rounded cursor-pointer border border-default" />
          <span class="text-sm font-mono text-muted">{{ colorsState.queued }}</span>
        </div>
      </UFormField>
    </UPageCard>
  </div>

  <div v-if="isAdmin" class="mt-6">
    <UPageCard
      :title="t('settings.lineControls.title')"
      :description="t('settings.lineControls.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        :label="t('common.saveChanges')"
        color="neutral"
        :loading="isSavingLineControls"
        class="w-fit lg:ms-auto"
        @click="saveLineControls"
      />
    </UPageCard>
    <UPageCard variant="subtle">
      <div class="space-y-0">
        <div
          v-for="(line, idx) in lines"
          :key="line.id"
        >
          <USeparator v-if="idx > 0" />
          <div class="flex items-center justify-between py-3">
            <span class="text-sm font-medium text-highlighted w-32">{{ line.name }}</span>
            <div class="flex items-center gap-8">
              <UFormField :label="t('settings.lineControls.orderControl')" class="flex items-center gap-3 flex-row-reverse">
                <USwitch v-if="lineControls[line.id]" v-model="lineControls[line.id].orderControlEnabled" />
              </UFormField>
              <UFormField :label="t('settings.lineControls.manualWaste')" class="flex items-center gap-3 flex-row-reverse">
                <USwitch v-if="lineControls[line.id]" v-model="lineControls[line.id].manualWasteEnabled" />
              </UFormField>
              <UFormField :label="t('settings.lineControls.producedCorrection')" class="flex items-center gap-3 flex-row-reverse">
                <USwitch v-if="lineControls[line.id]" v-model="lineControls[line.id].producedCorrectionEnabled" />
              </UFormField>
            </div>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>

  <div class="mt-6">
    <UPageCard
      :title="t('settings.language.title')"
      :description="t('settings.language.description')"
      variant="naked"
      class="mb-4"
    />
    <UPageCard variant="subtle">
      <UFormField
        :label="t('settings.language.title')"
        :description="t('settings.language.description')"
        class="flex max-sm:flex-col justify-between items-center gap-4"
      >
        <USelect
          :model-value="locale"
          :items="[
            { label: t('settings.language.en'), value: 'en' },
            { label: t('settings.language.ru'), value: 'ru' }
          ]"
          class="w-40"
          @update:model-value="setLocale"
        />
      </UFormField>
    </UPageCard>
  </div>
</template>
