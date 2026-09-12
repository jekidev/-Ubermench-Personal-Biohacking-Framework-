<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Workouts</h1>
      <p class="text-zinc-500">Local exercise catalog + a simple session log. Works on Android Chrome — no Gym visual media, no sidecar.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/longevity/fitness" variant="outline" size="sm">Fitness module</UButton>
      <UButton to="/settings?tab=plugins" variant="outline" size="sm">Plugins catalog</UButton>
      <UButton to="/health-sync" variant="outline" size="sm">Garmin JSON</UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">Exercise catalog</span>
          <span class="text-xs text-zinc-500">{{ catalog.count }} MIT-metadata exercises</span>
        </div>
      </template>
      <p class="text-xs text-zinc-500">{{ catalog.source }} · {{ catalog.license }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UInput
          v-model="query"
          placeholder="Search exercises (e.g. squat, dumbbell)"
          class="min-w-[12rem] flex-1"
          @keyup.enter="runSearch"
        />
        <UButton @click="runSearch">Search</UButton>
      </div>
      <ul v-if="results.length" class="mt-4 space-y-2 text-sm">
        <li v-for="exercise in results" :key="exercise.id" class="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 p-3">
          <div>
            <div class="font-medium">{{ exercise.name }}</div>
            <div class="text-xs text-zinc-500">{{ exercise.category }} · {{ exercise.equipment }} · {{ exercise.target }}</div>
          </div>
          <UButton size="xs" variant="outline" @click="useExercise(exercise)">Log this</UButton>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Log a session</div></template>
      <div class="grid gap-3 sm:grid-cols-2">
        <UInput v-model="draft.activity" placeholder="Activity (e.g. Goblet squat)" />
        <UInput v-model.number="draft.durationMinutes" type="number" min="1" placeholder="Minutes" />
        <UInput v-model.number="draft.intensity" type="number" min="1" max="10" placeholder="Intensity 1–10" />
        <UInput v-model="draft.notes" placeholder="Notes (optional)" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!draft.activity.trim()" @click="saveWorkout">Save workout</UButton>
        <span v-if="saved" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard v-if="lifestyle.garminWorkouts.value.length">
      <template #header><div class="font-medium">Garmin workout observations</div></template>
      <ul class="space-y-2 text-sm">
        <li v-for="item in lifestyle.garminWorkouts.value.slice(0, 8)" :key="item.id" class="flex flex-wrap justify-between gap-2 border-b border-zinc-800 py-2">
          <span>{{ item.metric }} · {{ item.value }} {{ item.unit }}</span>
          <span class="text-xs text-zinc-500">{{ formatTime(item.observedAt) }} · {{ item.source }}</span>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Local workout log</span>
          <span class="text-xs text-zinc-500">{{ lifestyle.workoutLogs.value.length }} sessions</span>
        </div>
      </template>
      <p v-if="!lifestyle.workoutLogs.value.length" class="text-sm text-zinc-500">No sessions yet. Search the catalog or type an activity.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in lifestyle.workoutLogs.value" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.activity }}</div>
            <div class="text-xs text-zinc-500">
              {{ formatTime(item.recordedAt) }}
              <span v-if="item.durationMinutes"> · {{ item.durationMinutes }} min</span>
              <span v-if="item.intensity"> · intensity {{ item.intensity }}/10</span>
              <span v-if="item.notes"> · {{ item.notes }}</span>
            </div>
          </div>
          <UButton size="xs" color="neutral" variant="ghost" @click="lifestyle.removeLog(item.id)">Remove</UButton>
        </li>
      </ul>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { asFiniteNumber } from '~/services/lifestyle-log-store'
import { loadExerciseCatalog, searchExercises, type ExerciseRecord } from '~~/plugins/longevity/fitness/exercises'

const lifestyle = useLifestyleLogs()
lifestyle.initialize()
lifestyle.refreshObservations()

const catalog = computed(() => loadExerciseCatalog())
const query = ref('')
const results = ref<ExerciseRecord[]>([])
const saved = ref(false)
const draft = reactive({
  activity: '',
  exerciseId: '',
  durationMinutes: 30,
  intensity: 6,
  notes: '',
})

function runSearch() {
  const needle = query.value.trim()
  results.value = needle ? searchExercises(needle).slice(0, 12) : catalog.value.exercises.slice(0, 12)
}

function useExercise(exercise: ExerciseRecord) {
  draft.activity = exercise.name
  draft.exerciseId = exercise.id
}

async function saveWorkout() {
  const activity = draft.activity.trim()
  if (!activity) return
  await lifestyle.addLog({
    id: crypto.randomUUID(),
    kind: 'workout',
    recordedAt: new Date().toISOString(),
    activity,
    exerciseId: draft.exerciseId || undefined,
    durationMinutes: asFiniteNumber(draft.durationMinutes),
    intensity: asFiniteNumber(draft.intensity),
    notes: draft.notes.trim() || undefined,
  })
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 1800)
}

function formatTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toLocaleString()
}

onMounted(() => {
  if (!results.value.length) runSearch()
})
</script>
