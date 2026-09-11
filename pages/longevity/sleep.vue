<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Sleep</h1>
      <p class="text-zinc-500">Garmin sleep_score when imported, plus a local sleep log. Android Chrome — no Health Connect here.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/health-sync" variant="outline" size="sm">Import Garmin JSON</UButton>
      <UButton to="/longevity/recovery" variant="outline" size="sm">Recovery module</UButton>
      <UButton to="/fearprime" variant="outline" size="sm">Fearprime (PTSD sleep)</UButton>
    </div>

    <UCard>
      <template #header><div class="font-medium">Garmin sleep observations</div></template>
      <p v-if="!lifestyle.garminSleep.value.length" class="text-sm text-zinc-500">
        No sleep_score / HRV / resting HR samples yet. Paste Wellness JSON on Health Sync — Oura/WHOOP are rejected.
      </p>
      <ul v-else class="space-y-2 text-sm">
        <li v-for="item in lifestyle.garminSleep.value.slice(0, 10)" :key="item.id" class="flex flex-wrap justify-between gap-2 border-b border-zinc-800 py-2">
          <span>{{ item.metric }} · {{ item.value }} {{ item.unit }}</span>
          <span class="text-xs text-zinc-500">{{ formatTime(item.observedAt) }} · {{ item.source }}</span>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Log last night</div></template>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Duration (minutes)">
          <UInput v-model.number="durationMinutes" type="number" min="0" max="1440" />
        </UFormField>
        <UFormField label="Quality 1–10">
          <UInput v-model.number="quality" type="number" min="1" max="10" />
        </UFormField>
        <UFormField label="Notes" class="sm:col-span-2">
          <UInput v-model="notes" placeholder="Optional" />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton @click="saveSleep">Save sleep</UButton>
        <span v-if="saved" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Local sleep log</span>
          <span class="text-xs text-zinc-500">{{ lifestyle.sleepLogs.value.length }} nights</span>
        </div>
      </template>
      <p v-if="!lifestyle.sleepLogs.value.length" class="text-sm text-zinc-500">No manual nights yet. Biology sleep records still show on Longevity overview.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in lifestyle.sleepLogs.value" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.durationMinutes ?? '—' }} min · quality {{ item.quality ?? '—' }}/10</div>
            <div class="text-xs text-zinc-500">{{ formatTime(item.recordedAt) }}<span v-if="item.notes"> · {{ item.notes }}</span></div>
          </div>
          <UButton size="xs" color="neutral" variant="ghost" @click="lifestyle.removeLog(item.id)">Remove</UButton>
        </li>
      </ul>
    </UCard>

    <UCard v-if="biologySleep.length">
      <template #header><div class="font-medium">Biology profile sleep</div></template>
      <ul class="space-y-2 text-sm">
        <li v-for="item in biologySleep" :key="item.id" class="flex flex-wrap justify-between gap-2">
          <span>{{ item.durationMinutes ?? '—' }} min · {{ item.source }}</span>
          <span class="text-xs text-zinc-500">{{ formatTime(item.recordedAt) }}</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const lifestyle = useLifestyleLogs()
const biology = usePersonalBiology()
lifestyle.initialize()
lifestyle.refreshObservations()
await biology.initialize()

const durationMinutes = ref(420)
const quality = ref(7)
const notes = ref('')
const saved = ref(false)
const biologySleep = computed(() =>
  [...biology.profile.value.sleep].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)).slice(0, 8),
)

async function saveSleep() {
  await lifestyle.addLog({
    id: crypto.randomUUID(),
    kind: 'sleep',
    recordedAt: new Date().toISOString(),
    durationMinutes: Number.isFinite(durationMinutes.value) ? durationMinutes.value : undefined,
    quality: Number.isFinite(quality.value) ? quality.value : undefined,
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
