<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Meditation</h1>
      <p class="text-zinc-500">Local session log (duration + notes). Fearprime stays the PTSD / fear-learning home — this page does not fork it.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/fearprime" variant="outline" size="sm">Fearprime workspace</UButton>
      <UButton to="/fearprime/state" variant="outline" size="sm">Daily state</UButton>
      <UButton to="/longevity/sleep" variant="outline" size="sm">Sleep log</UButton>
    </div>

    <UCard>
      <template #header><div class="font-medium">Log a session</div></template>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Duration (minutes)">
          <UInput v-model.number="durationMinutes" type="number" min="1" max="240" />
        </UFormField>
        <UFormField label="Notes">
          <UInput v-model="notes" placeholder="Optional" />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!canSave" @click="saveSession">Save session</UButton>
        <span v-if="saved" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Local meditation log</span>
          <span class="text-xs text-zinc-500">{{ sessions.length }} sessions</span>
        </div>
      </template>
      <p v-if="!sessions.length" class="text-sm text-zinc-500">No sessions yet. Fearprime is still the place for memory targets and phenotype signals.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in sessions" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.durationMinutes }} min</div>
            <div class="text-xs text-zinc-500">{{ formatTime(item.recordedAt) }}<span v-if="item.notes"> · {{ item.notes }}</span></div>
          </div>
          <UButton size="xs" color="neutral" variant="ghost" @click="lifestyle.removeLog(item.id)">Remove</UButton>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { asFiniteNumber } from '~/services/lifestyle-log-store'
import type { MeditationLog } from '~/types/lifestyle'

const lifestyle = useLifestyleLogs()
lifestyle.initialize()

const durationMinutes = ref(10)
const notes = ref('')
const saved = ref(false)
const sessions = computed(() => lifestyle.meditationLogs.value as MeditationLog[])
const canSave = computed(() => {
  const minutes = asFiniteNumber(durationMinutes.value)
  return minutes !== undefined && minutes >= 1
})

async function saveSession() {
  const minutes = asFiniteNumber(durationMinutes.value)
  if (minutes === undefined || minutes < 1) return
  await lifestyle.addLog({
    id: crypto.randomUUID(),
    kind: 'meditation',
    recordedAt: new Date().toISOString(),
    durationMinutes: minutes,
    notes: notes.value.trim() || undefined,
  })
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 1800)
}

function formatTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toLocaleString()
}
</script>
