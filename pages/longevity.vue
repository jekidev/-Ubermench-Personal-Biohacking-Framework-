<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Longevity</h1>
        <p class="text-zinc-500">Longitudinal health dashboard.</p>
      </div>
      <div class="flex gap-2">
        <UButton to="/longevity/bloods">Add blood test</UButton>
        <UButton to="/longevity/genetics" variant="outline">Upload DNA</UButton>
      </div>
    </div>

    <UAlert v-if="!initialized" title="Loading personal biology" description="Reading the local-first biology profile." />

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="metric in metrics" :key="metric.label">
        <div class="text-sm text-zinc-500">{{ metric.label }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ metric.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ metric.note }}</div>
      </UCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><div class="font-medium">Longevity screening</div></template>
        <div v-if="initialized" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">Screening score</span>
            <span class="text-xl font-semibold">{{ assessment.score }}/100</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div class="h-full rounded-full transition-all" :style="{ width: `${assessment.score}%` }" />
          </div>
          <p class="text-xs text-zinc-500">Reference-bound screening only; not biological age, diagnosis, mortality prediction, or treatment advice.</p>
          <div v-if="assessment.priorities.length" class="space-y-1 text-sm">
            <div class="text-zinc-500">Priority signals</div>
            <div v-for="item in assessment.priorities" :key="item">{{ item }}</div>
          </div>
          <div v-else class="text-sm text-zinc-500">No actionable reference-bound signals yet.</div>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Data streams</div></template>
        <ul class="space-y-2 text-sm text-zinc-400">
          <li>Blood biomarkers · {{ profile.biomarkers.length }} records</li>
          <li>Genetic variants · {{ profile.variants.length }} records</li>
          <li>Medications · {{ profile.medications.length }} records</li>
          <li>Supplements · {{ profile.supplements.length }} records</li>
          <li>Sleep · {{ profile.sleep.length }} records</li>
          <li>Training · {{ profile.training.length }} records</li>
        </ul>
      </UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Recent biomarkers</div></template>
      <div v-if="recentBiomarkers.length" class="divide-y divide-zinc-800">
        <div v-for="item in recentBiomarkers" :key="item.id" class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div>
            <div class="font-medium">{{ item.name }}</div>
            <div class="text-xs text-zinc-500">{{ item.measuredAt }} · {{ item.source }}</div>
          </div>
          <div class="font-semibold">{{ item.value }} {{ item.unit }}</div>
        </div>
      </div>
      <div v-else class="text-sm text-zinc-500">No biomarkers imported yet.</div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Safety</div></template>
      <p class="text-sm text-zinc-500">Import, evidence, and analytics layers are review-first. The dashboard does not diagnose or prescribe.</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { assessLongevity } from '~/services/longevity-engine'

const biology = usePersonalBiology()
const profile = biology.profile
const initialized = biology.initialized

await biology.initialize()

const assessment = computed(() => assessLongevity(profile.value))
const recentBiomarkers = computed(() =>
  [...profile.value.biomarkers]
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .slice(0, 5),
)

const metrics = computed(() => [
  { label: 'Bloods', value: String(profile.value.biomarkers.length), note: 'Imported biomarker records' },
  { label: 'Genetics', value: String(profile.value.variants.length), note: 'Imported variants' },
  { label: 'Screening', value: `${assessment.value.score}/100`, note: 'Reference-bound screening' },
  { label: 'Coverage', value: `${profile.value.sleep.length + profile.value.training.length}`, note: 'Sleep + training records' },
])
</script>
