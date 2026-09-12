<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Diet</h1>
      <p class="text-zinc-500">Simple local meal log on this phone. Not a USDA scrape. Works in Android Chrome.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/longevity/metabolic" variant="outline" size="sm">Metabolic module</UButton>
      <UButton to="/biology" variant="outline" size="sm">Biology profile</UButton>
    </div>

    <UCard>
      <template #header><div class="font-medium">Log a meal</div></template>
      <div class="grid gap-3 sm:grid-cols-2">
        <UInput v-model="name" placeholder="Meal (e.g. oats + berries)" />
        <select v-model="mealType" class="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
          <option v-for="option in mealTypes" :key="option" :value="option">{{ option }}</option>
        </select>
        <UInput v-model.number="calories" type="number" min="0" placeholder="Calories (optional)" />
        <UInput v-model="notes" placeholder="Notes (optional)" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!name.trim()" @click="saveMeal">Save meal</UButton>
        <span v-if="saved" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">Local nutrition log</span>
          <span class="text-xs text-zinc-500">{{ meals.length }} meals</span>
        </div>
      </template>
      <p v-if="!meals.length" class="text-sm text-zinc-500">No meals yet. Entries stay in this browser.</p>
      <ul v-else class="divide-y divide-zinc-800 text-sm">
        <li v-for="item in meals" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div class="font-medium">{{ item.name }}</div>
            <div class="text-xs text-zinc-500">
              {{ formatTime(item.recordedAt) }}
              <span v-if="item.mealType"> · {{ item.mealType }}</span>
              <span v-if="item.calories"> · {{ item.calories }} kcal</span>
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
import type { MealLog, MealType } from '~/types/lifestyle'
import { MEAL_TYPES } from '~/types/lifestyle'

const lifestyle = useLifestyleLogs()
lifestyle.initialize()

const mealTypes = MEAL_TYPES
const name = ref('')
const mealType = ref<MealType>('breakfast')
const calories = ref<number | undefined>(undefined)
const notes = ref('')
const saved = ref(false)
const meals = computed(() => lifestyle.mealLogs.value as MealLog[])

async function saveMeal() {
  const mealName = name.value.trim()
  if (!mealName) return
  await lifestyle.addLog({
    id: crypto.randomUUID(),
    kind: 'meal',
    recordedAt: new Date().toISOString(),
    name: mealName,
    mealType: mealType.value,
    calories: asFiniteNumber(calories.value),
    notes: notes.value.trim() || undefined,
  })
  name.value = ''
  notes.value = ''
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 1800)
}

function formatTime(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toLocaleString()
}
</script>
