<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity</p>
      <h1 class="mt-1 text-2xl font-semibold">Diet</h1>
      <p class="text-zinc-500">Standing diet protocol plus a simple local meal log. Not a USDA scrape. Works in Android Chrome.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton to="/longevity/stack" variant="outline" size="sm">Stack</UButton>
      <UButton to="/longevity/metabolic" variant="outline" size="sm">Metabolic module</UButton>
      <UButton to="/biology" variant="outline" size="sm">Biology profile</UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">Diet protocol</span>
          <span class="text-xs text-zinc-500">{{ dietSummary || 'Not set' }}</span>
        </div>
      </template>
      <p class="text-sm text-zinc-500">Describe the diet you follow, not a food database. Chat and safety can use this as personal context.</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <UFormField label="Pattern">
          <UInput v-model="dietDraft.pattern" placeholder="e.g. High-protein Mediterranean" />
        </UFormField>
        <UFormField label="Eating window">
          <UInput v-model="dietDraft.eatingWindow" placeholder="e.g. 16:8 or 8–16" />
        </UFormField>
        <UFormField label="Protein target (g)">
          <UInput v-model.number="dietDraft.proteinTargetGrams" type="number" min="0" placeholder="Optional" />
        </UFormField>
        <UFormField label="Restrictions">
          <UInput v-model="dietDraft.restrictions" placeholder="Comma-separated, e.g. seed oils, alcohol" />
        </UFormField>
        <UFormField label="Notes" class="sm:col-span-2">
          <UInput v-model="dietDraft.notes" placeholder="Typical meals, timing, what you avoid" />
        </UFormField>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UButton :disabled="!canSaveDiet" @click="saveDiet">Save diet</UButton>
        <UButton v-if="hasSavedDiet" variant="outline" color="neutral" @click="clearDiet">Clear</UButton>
        <span v-if="dietSaved" class="text-sm text-zinc-400">Saved on this phone.</span>
      </div>
    </UCard>

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
import { formatRestrictionList, hasDietProtocol, parseRestrictionList } from '~/services/regimen-editor'
import { summarizeDietProtocol } from '~/services/personal-regimen-context'

const biology = usePersonalBiology()
const profile = biology.profile
await biology.initialize()

const lifestyle = useLifestyleLogs()
lifestyle.initialize()

const mealTypes = MEAL_TYPES
const name = ref('')
const mealType = ref<MealType>('breakfast')
const calories = ref<number | undefined>(undefined)
const notes = ref('')
const saved = ref(false)
const dietSaved = ref(false)
const meals = computed(() => lifestyle.mealLogs.value as MealLog[])
const dietDraft = reactive({
  pattern: '',
  eatingWindow: '',
  proteinTargetGrams: undefined as number | undefined,
  restrictions: '',
  notes: '',
})

function hydrateDietDraft() {
  const diet = profile.value.diet
  dietDraft.pattern = diet?.pattern ?? ''
  dietDraft.eatingWindow = diet?.eatingWindow ?? ''
  dietDraft.proteinTargetGrams = diet?.proteinTargetGrams
  dietDraft.restrictions = formatRestrictionList(diet?.restrictions)
  dietDraft.notes = diet?.notes ?? ''
}

hydrateDietDraft()
watch(() => profile.value.diet, hydrateDietDraft)

const hasSavedDiet = computed(() => hasDietProtocol(profile.value.diet))
const dietSummary = computed(() => summarizeDietProtocol(profile.value.diet))
const canSaveDiet = computed(() => Boolean(
  dietDraft.pattern.trim()
  || dietDraft.eatingWindow.trim()
  || dietDraft.notes.trim()
  || dietDraft.restrictions.trim()
  || (typeof dietDraft.proteinTargetGrams === 'number' && dietDraft.proteinTargetGrams > 0),
))

async function saveDiet() {
  if (!canSaveDiet.value) return
  await biology.saveDiet({
    pattern: dietDraft.pattern,
    eatingWindow: dietDraft.eatingWindow,
    proteinTargetGrams: dietDraft.proteinTargetGrams,
    restrictions: parseRestrictionList(dietDraft.restrictions),
    notes: dietDraft.notes,
  })
  dietSaved.value = true
  window.setTimeout(() => { dietSaved.value = false }, 1800)
}

async function clearDiet() {
  await biology.saveDiet(undefined)
  hydrateDietDraft()
}

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
