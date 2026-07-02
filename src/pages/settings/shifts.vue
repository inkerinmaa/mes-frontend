<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMesUser } from '../../composables/useMesUser'
import { apiFetch } from '../../utils/api'
import type { Shift, ShiftSchedule } from '../../types'

const { t } = useI18n()
const { isAdmin } = useMesUser()
const toast = useToast()

const shifts = ref<Shift[]>([])
const schedule = ref<ShiftSchedule | null>(null)

const shiftEdits = ref<Record<number, { name: string; color: string }>>({})
const schedEdit = reactive({
  pattern: '4on4off',
  startTime: '08:00',
  referenceDate: '',
  referenceShiftId: 0
})

const savingShift = ref<Record<number, boolean>>({})
const savingSchedule = ref(false)

const calendarDate = ref(new Date())
const calendarYear = computed(() => calendarDate.value.getFullYear())
const calendarMonth = computed(() => calendarDate.value.getMonth())

function prevMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
}
function nextMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
}

// Mirrors ShiftRepository.GetCurrentShiftIdAsync cycle arrays exactly
function getCycleDays(pattern: string): number[] {
  switch (pattern) {
    case '4on4off':    return [0,0,0,0, 1,1,1,1, 2,2,2,2, 3,3,3,3]
    case 'dupont':     return [0,0,0,0, 1,1,1, 2,2,2, 3,3,3, 0,0,0, 1,1,1,1, 2,2,2, 3,3,3,3, 3]
    case 'continental': return [0,0,0, 1,1,1, 2,2,2, 3,3,3]
    default:           return [0,0,0,0, 1,1,1,1, 2,2,2,2, 3,3,3,3]
  }
}

function getShiftForDate(date: Date, sch: ShiftSchedule): Shift | null {
  if (!sch.referenceDate || !sch.referenceShiftId || shifts.value.length === 0) return null
  const sortedShifts = [...shifts.value].sort((a, b) => a.sortOrder - b.sortOrder)
  const numShifts = sortedShifts.length
  const refShiftIndex = sortedShifts.findIndex(s => s.id === sch.referenceShiftId)
  if (refShiftIndex < 0) return null

  const cycleDays = getCycleDays(sch.pattern)
  const cycleLen = cycleDays.length
  let referencePos = cycleDays.findIndex(d => d === refShiftIndex)
  if (referencePos < 0) referencePos = 0

  const ref = new Date(sch.referenceDate)
  ref.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const daysDiff = Math.round((target.getTime() - ref.getTime()) / 86400000)

  const cyclePos = ((referencePos + daysDiff) % cycleLen + cycleLen) % cycleLen
  const shiftIndex = cycleDays[cyclePos] % numShifts
  return sortedShifts[shiftIndex]
}

interface CalendarCell {
  day: number
  date: Date
  shift: Shift | null
  isToday: boolean
  otherMonth: boolean
}

const calendarDays = computed((): CalendarCell[] => {
  if (!schedule.value) return []
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells: CalendarCell[] = []

  // Pad start (Mon-based week: Mon=0 … Sun=6)
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ day: d.getDate(), date: d, shift: null, isToday: false, otherMonth: true })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    cells.push({
      day: d, date,
      shift: getShiftForDate(date, schedule.value!),
      isToday: date.getTime() === today.getTime(),
      otherMonth: false
    })
  }

  // Pad end to complete the grid
  const totalCells = Math.ceil(cells.length / 7) * 7
  let nextDay = 1
  while (cells.length < totalCells) {
    const d = new Date(year, month + 1, nextDay++)
    cells.push({ day: d.getDate(), date: d, shift: null, isToday: false, otherMonth: true })
  }
  return cells
})

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const patternItems = computed(() => [
  { label: t('settings.shifts.patterns.4on4off'), value: '4on4off' },
  { label: t('settings.shifts.patterns.dupont'), value: 'dupont' },
  { label: t('settings.shifts.patterns.continental'), value: 'continental' }
])

const shiftSelectItems = computed(() =>
  shifts.value.map(s => ({ label: `${s.code} — ${shiftEdits.value[s.id]?.name ?? s.name}`, value: s.id }))
)

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('default', { month: 'long', year: 'numeric' }).format(calendarDate.value)
)

onMounted(async () => {
  const [fetchedShifts, fetchedSchedule] = await Promise.all([
    apiFetch<Shift[]>('/shifts'),
    apiFetch<ShiftSchedule>('/shifts/schedule').catch(() => null)
  ])
  shifts.value = fetchedShifts
  for (const s of fetchedShifts) {
    shiftEdits.value[s.id] = { name: s.name, color: s.color }
  }
  if (fetchedSchedule) {
    schedule.value = fetchedSchedule
    schedEdit.pattern = fetchedSchedule.pattern
    schedEdit.startTime = fetchedSchedule.startTime.slice(0, 5)
    schedEdit.referenceDate = fetchedSchedule.referenceDate
    schedEdit.referenceShiftId = fetchedSchedule.referenceShiftId
  } else if (fetchedShifts.length > 0) {
    // No schedule yet — default select to first shift so USelect isn't empty
    schedEdit.referenceShiftId = fetchedShifts[0].id
  }
})

async function saveShift(shift: Shift) {
  const edit = shiftEdits.value[shift.id]
  if (!edit) return
  savingShift.value[shift.id] = true
  try {
    await apiFetch(`/shifts/${shift.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: edit.name, color: edit.color })
    })
    shift.name = edit.name
    shift.color = edit.color
    toast.add({ title: t('settings.shifts.toast.shiftSaved'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.shifts.toast.failed'), color: 'error' })
  } finally {
    savingShift.value[shift.id] = false
  }
}

async function saveSchedule() {
  const refId = Number(schedEdit.referenceShiftId)
  if (!refId || !schedEdit.referenceDate) {
    toast.add({ title: t('settings.shifts.toast.failed'), color: 'error' })
    return
  }
  savingSchedule.value = true
  try {
    await apiFetch('/shifts/schedule', {
      method: 'PUT',
      body: JSON.stringify({
        pattern: schedEdit.pattern,
        startTime: schedEdit.startTime,
        referenceDate: schedEdit.referenceDate,
        referenceShiftId: refId
      })
    })
    schedule.value = await apiFetch<ShiftSchedule>('/shifts/schedule')
    toast.add({ title: t('settings.shifts.toast.scheduleSaved'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.shifts.toast.failed'), color: 'error' })
  } finally {
    savingSchedule.value = false
  }
}
</script>

<template>
  <UPageCard
    :title="t('settings.shifts.shiftsTitle')"
    :description="t('settings.shifts.shiftsDesc')"
    variant="naked"
    class="mb-4"
  />
  <UPageCard variant="subtle">
    <div class="space-y-3">
      <div v-for="shift in shifts" :key="shift.id" class="flex items-center gap-3">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shrink-0"
          :style="{ background: shiftEdits[shift.id]?.color ?? shift.color }"
        >
          {{ shift.code }}
        </span>
        <UInput v-model="shiftEdits[shift.id].name" :disabled="!isAdmin" class="flex-1" />
        <input
          v-model="shiftEdits[shift.id].color"
          type="color"
          :disabled="!isAdmin"
          class="w-10 h-9 cursor-pointer rounded border border-default bg-transparent disabled:opacity-50"
        />
        <UButton
          v-if="isAdmin"
          :label="t('common.save')"
          color="neutral"
          variant="subtle"
          size="sm"
          :loading="savingShift[shift.id]"
          @click="saveShift(shift)"
        />
      </div>
    </div>
  </UPageCard>

  <div class="mt-6">
    <UPageCard
      :title="t('settings.shifts.scheduleTitle')"
      :description="t('settings.shifts.scheduleDesc')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        v-if="isAdmin"
        :label="t('common.saveChanges')"
        color="neutral"
        :loading="savingSchedule"
        class="w-fit lg:ms-auto"
        @click="saveSchedule"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField :label="t('settings.shifts.pattern')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <USelect v-model="schedEdit.pattern" :items="patternItems" :disabled="!isAdmin" class="w-64" />
      </UFormField>
      <USeparator />
      <UFormField :label="t('settings.shifts.startTime')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <UInput v-model="schedEdit.startTime" type="time" :disabled="!isAdmin" class="w-40" />
      </UFormField>
      <USeparator />
      <UFormField :label="t('settings.shifts.referenceDate')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <UInput v-model="schedEdit.referenceDate" type="date" :disabled="!isAdmin" class="w-48" />
      </UFormField>
      <USeparator />
      <UFormField :label="t('settings.shifts.referenceShift')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <USelect v-model="schedEdit.referenceShiftId" :items="shiftSelectItems" :disabled="!isAdmin" class="w-48" />
      </UFormField>
    </UPageCard>
  </div>

  <div class="mt-6">
    <UPageCard
      :title="t('settings.shifts.calendarTitle')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <div class="flex items-center gap-2 lg:ms-auto">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('settings.shifts.prevMonth')"
          @click="prevMonth"
        />
        <span class="text-sm font-medium text-highlighted capitalize min-w-44 text-center">{{ monthLabel }}</span>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('settings.shifts.nextMonth')"
          @click="nextMonth"
        />
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <p v-if="!schedule" class="text-sm text-muted text-center py-4">{{ t('settings.shifts.noSchedule') }}</p>
      <template v-else>
        <div class="grid grid-cols-7 gap-1 mb-1">
          <div v-for="wd in weekDays" :key="wd" class="text-xs text-muted text-center font-medium py-1">{{ wd }}</div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="(cell, i) in calendarDays"
            :key="i"
            class="relative rounded-lg p-1.5 text-center min-h-14 transition-colors"
            :class="[
              cell.otherMonth ? 'opacity-25' : '',
              cell.isToday ? 'ring-2 ring-primary ring-inset' : ''
            ]"
            :style="!cell.otherMonth && cell.shift ? { background: cell.shift.color + '22' } : {}"
          >
            <span
              class="text-xs font-medium block"
              :class="cell.isToday ? 'text-primary font-bold' : 'text-highlighted'"
            >
              {{ cell.day }}
            </span>
            <div v-if="!cell.otherMonth && cell.shift" class="flex justify-center mt-1">
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                :style="{ background: cell.shift.color }"
              >
                {{ cell.shift.code }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </UPageCard>
  </div>
</template>
