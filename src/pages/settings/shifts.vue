<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMesUser } from '../../composables/useMesUser'
import { apiFetch } from '../../utils/api'
import type { Shift, ShiftSchedule } from '../../types'

const { t } = useI18n()
const { isAdmin } = useMesUser()
const toast = useToast()

const DAY_NIGHT_PATTERN = '2on2off2night2off'

const shifts = ref<Shift[]>([])
const schedule = ref<ShiftSchedule | null>(null)

const shiftEdits = ref<Record<number, { name: string; color: string }>>({})
const TIMEZONES = [
  { label: 'UTC',                      value: 'UTC' },
  { label: 'Europe/Kaliningrad (UTC+2)', value: 'Europe/Kaliningrad' },
  { label: 'Europe/Moscow (UTC+3)',     value: 'Europe/Moscow' },
  { label: 'Europe/Minsk (UTC+3)',      value: 'Europe/Minsk' },
  { label: 'Europe/Samara (UTC+4)',     value: 'Europe/Samara' },
  { label: 'Asia/Yekaterinburg (UTC+5)', value: 'Asia/Yekaterinburg' },
  { label: 'Asia/Omsk (UTC+6)',         value: 'Asia/Omsk' },
  { label: 'Asia/Krasnoyarsk (UTC+7)', value: 'Asia/Krasnoyarsk' },
  { label: 'Asia/Irkutsk (UTC+8)',      value: 'Asia/Irkutsk' },
  { label: 'Asia/Yakutsk (UTC+9)',      value: 'Asia/Yakutsk' },
  { label: 'Asia/Vladivostok (UTC+10)', value: 'Asia/Vladivostok' },
  { label: 'Asia/Magadan (UTC+11)',     value: 'Asia/Magadan' },
  { label: 'Asia/Kamchatka (UTC+12)',   value: 'Asia/Kamchatka' },
  { label: 'Europe/Warsaw (UTC+1/+2)',  value: 'Europe/Warsaw' },
  { label: 'Europe/Helsinki (UTC+2/+3)', value: 'Europe/Helsinki' },
  { label: 'Europe/Istanbul (UTC+3)',   value: 'Europe/Istanbul' },
  { label: 'Asia/Almaty (UTC+5)',       value: 'Asia/Almaty' },
  { label: 'Asia/Tashkent (UTC+5)',     value: 'Asia/Tashkent' },
  { label: 'Asia/Baku (UTC+4)',         value: 'Asia/Baku' },
]

const schedEdit = reactive({
  pattern: '4on4off',
  startTime: '08:00',
  timezone: 'UTC',
  referenceDate: '',
  referenceShiftId: 0,
  shiftReferences: {} as Record<number, string>  // shiftId → YYYY-MM-DD
})

const savingShift = ref<Record<number, boolean>>({})
const savingSchedule = ref(false)

const isDayNightPattern = computed(() => schedEdit.pattern === DAY_NIGHT_PATTERN)

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

// Mirrors ShiftRepository cycle arrays for standard patterns
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

// Day/Night pattern: 8-day cycle per shift — Day/Day/Off/Off/Night/Night/Off/Off
const DAY_NIGHT_SLOTS = ['day', 'day', 'off', 'off', 'night', 'night', 'off', 'off']

function getShiftsForDate(date: Date): { day: Shift | null; night: Shift | null } {
  const sch = schedule.value!
  const result: { day: Shift | null; night: Shift | null } = { day: null, night: null }
  if (!sch.shiftReferences?.length) return result

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  for (const ref of sch.shiftReferences) {
    if (!ref.referenceDate) continue
    const refDate = new Date(ref.referenceDate)
    refDate.setHours(0, 0, 0, 0)
    const daysDiff = Math.round((target.getTime() - refDate.getTime()) / 86400000)
    const cyclePos = ((daysDiff % 8) + 8) % 8
    const slot = DAY_NIGHT_SLOTS[cyclePos]
    const shift = shifts.value.find(s => s.id === ref.shiftId) ?? null
    if (slot === 'day') result.day = shift
    else if (slot === 'night') result.night = shift
  }

  return result
}

interface CalendarCell {
  day: number
  date: Date
  shift: Shift | null
  dayShift: Shift | null
  nightShift: Shift | null
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
  const isDN = schedule.value.pattern === DAY_NIGHT_PATTERN

  const emptyCell = (d: Date): CalendarCell => ({
    day: d.getDate(), date: d, shift: null, dayShift: null, nightShift: null, isToday: false, otherMonth: true
  })

  // Pad start (Mon-based week: Mon=0 … Sun=6)
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push(emptyCell(new Date(year, month, -i)))
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    if (isDN) {
      const { day: dayShift, night: nightShift } = getShiftsForDate(date)
      cells.push({ day: d, date, shift: null, dayShift, nightShift, isToday: date.getTime() === today.getTime(), otherMonth: false })
    } else {
      cells.push({ day: d, date, shift: getShiftForDate(date, schedule.value!), dayShift: null, nightShift: null, isToday: date.getTime() === today.getTime(), otherMonth: false })
    }
  }

  // Pad end to complete the grid
  const totalCells = Math.ceil(cells.length / 7) * 7
  let nextDay = 1
  while (cells.length < totalCells) {
    cells.push(emptyCell(new Date(year, month + 1, nextDay++)))
  }
  return cells
})

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const patternItems = computed(() => [
  { label: t('settings.shifts.patterns.4on4off'), value: '4on4off' },
  { label: t('settings.shifts.patterns.dupont'), value: 'dupont' },
  { label: t('settings.shifts.patterns.continental'), value: 'continental' },
  { label: t('settings.shifts.patterns.2on2off2night2off'), value: '2on2off2night2off' }
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
    schedEdit.timezone = fetchedSchedule.timezone ?? 'UTC'
    schedEdit.referenceDate = fetchedSchedule.referenceDate ?? ''
    schedEdit.referenceShiftId = fetchedSchedule.referenceShiftId ?? (fetchedShifts[0]?.id ?? 0)
    for (const ref of fetchedSchedule.shiftReferences ?? []) {
      schedEdit.shiftReferences[ref.shiftId] = ref.referenceDate ?? ''
    }
  } else if (fetchedShifts.length > 0) {
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
  if (isDayNightPattern.value) {
    const dates = shifts.value.map(s => schedEdit.shiftReferences[s.id]).filter(Boolean)
    if (dates.length !== shifts.value.length) {
      toast.add({ title: t('settings.shifts.toast.allDatesRequired'), color: 'error' })
      return
    }
    const uniqueDates = new Set(dates)
    if (uniqueDates.size !== dates.length) {
      toast.add({ title: t('settings.shifts.toast.duplicateDates'), color: 'error' })
      return
    }
  } else {
    const refId = Number(schedEdit.referenceShiftId)
    if (!refId || !schedEdit.referenceDate) {
      toast.add({ title: t('settings.shifts.toast.failed'), color: 'error' })
      return
    }
  }

  savingSchedule.value = true
  try {
    const body: Record<string, unknown> = {
      pattern: schedEdit.pattern,
      startTime: schedEdit.startTime,
      timezone: schedEdit.timezone
    }
    if (isDayNightPattern.value) {
      body.referenceDate = null
      body.referenceShiftId = null
      body.shiftReferences = shifts.value.map(s => ({
        shiftId: s.id,
        referenceDate: schedEdit.shiftReferences[s.id]
      }))
    } else {
      body.referenceDate = schedEdit.referenceDate
      body.referenceShiftId = Number(schedEdit.referenceShiftId)
      body.shiftReferences = null
    }
    await apiFetch('/shifts/schedule', { method: 'PUT', body: JSON.stringify(body) })
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
      <UFormField :label="t('settings.shifts.timezone')" class="flex max-sm:flex-col justify-between items-center gap-4">
        <USelect v-model="schedEdit.timezone" :items="TIMEZONES" :disabled="!isAdmin" class="w-72" />
      </UFormField>

      <!-- Standard patterns: single reference date + reference shift -->
      <template v-if="!isDayNightPattern">
        <USeparator />
        <UFormField :label="t('settings.shifts.referenceDate')" class="flex max-sm:flex-col justify-between items-center gap-4">
          <UInput v-model="schedEdit.referenceDate" type="date" :disabled="!isAdmin" class="w-48" />
        </UFormField>
        <USeparator />
        <UFormField :label="t('settings.shifts.referenceShift')" class="flex max-sm:flex-col justify-between items-center gap-4">
          <USelect v-model="schedEdit.referenceShiftId" :items="shiftSelectItems" :disabled="!isAdmin" class="w-48" />
        </UFormField>
      </template>

      <!-- Day/Night pattern: one reference date per shift -->
      <template v-else>
        <USeparator />
        <p class="text-xs text-muted mb-3">{{ t('settings.shifts.shiftRefDatesDesc') }}</p>
        <div class="space-y-3">
          <div v-for="shift in shifts" :key="shift.id" class="flex items-center gap-3">
            <span
              class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
              :style="{ background: shiftEdits[shift.id]?.color ?? shift.color }"
            >
              {{ shift.code }}
            </span>
            <span class="text-sm font-medium text-highlighted w-28 shrink-0">{{ shiftEdits[shift.id]?.name ?? shift.name }}</span>
            <UInput
              v-model="schedEdit.shiftReferences[shift.id]"
              type="date"
              :disabled="!isAdmin"
              class="w-48"
              :placeholder="t('settings.shifts.cycleStartDate')"
            />
          </div>
        </div>
      </template>
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
        <!-- Legend for day/night pattern -->
        <div v-if="schedule.pattern === DAY_NIGHT_PATTERN" class="flex flex-wrap gap-3 mb-3 text-xs text-muted">
          <span class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 rounded-full bg-current opacity-60"></span>
            {{ t('settings.shifts.legend.leftHalf') }}
          </span>
          <span>{{ t('settings.shifts.legend.dayPeriod') }} ({{ schedEdit.startTime }} – {{ (() => { const [h] = schedEdit.startTime.split(':'); return `${String((+h + 12) % 24).padStart(2,'0')}:00` })() }})</span>
          <span class="mx-1">|</span>
          <span>{{ t('settings.shifts.legend.rightHalf') }}</span>
          <span>{{ t('settings.shifts.legend.nightPeriod') }}</span>
        </div>

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
            :style="!cell.otherMonth
              ? (cell.shift
                  ? { background: cell.shift.color + '22' }
                  : (cell.dayShift || cell.nightShift)
                      ? { background: (cell.dayShift?.color ?? cell.nightShift?.color) + '22' }
                      : {})
              : {}"
          >
            <span
              class="text-xs font-medium block"
              :class="cell.isToday ? 'text-primary font-bold' : 'text-highlighted'"
            >
              {{ cell.day }}
            </span>

            <!-- Standard pattern: single shift badge -->
            <div v-if="!cell.otherMonth && cell.shift" class="flex justify-center mt-1">
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                :style="{ background: cell.shift.color }"
              >
                {{ cell.shift.code }}
              </span>
            </div>

            <!-- Day/Night pattern: split circle -->
            <div
              v-else-if="!cell.otherMonth && (cell.dayShift || cell.nightShift)"
              class="flex justify-center mt-1"
              :title="`${t('settings.shifts.dayShift')}: ${cell.dayShift?.code ?? '—'} / ${t('settings.shifts.nightShift')}: ${cell.nightShift?.code ?? '—'}`"
            >
              <div class="w-6 h-6 rounded-full overflow-hidden flex">
                <div class="w-1/2 h-full" :style="{ background: cell.dayShift?.color ?? '#9ca3af' }"></div>
                <div class="w-1/2 h-full" :style="{ background: cell.nightShift?.color ?? '#9ca3af' }"></div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UPageCard>
  </div>
</template>
