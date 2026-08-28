<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Longevity module</p>
        <h1 class="mt-1 text-2xl font-semibold">{{ title }}</h1>
        <p class="text-zinc-500">Live view over the shared local-first personal biology profile.</p>
      </div>
      <div class="flex gap-2">
        <UButton v-if="section === 'bloods'" to="/longevity/bloods">Open blood importer</UButton>
        <UButton v-else-if="section === 'genetics'" to="/longevity/genetics">Open genetics</UButton>
        <UButton v-else to="/longevity" variant="outline">Back to overview</UButton>
      </div>
    </div>

    <UAlert v-if="!initialized" title="Loading personal biology" description="Reading the local-first profile." />

    <div class="grid gap-4 md:grid-cols-4">
      <UCard v-for="card in cards" :key="card.label">
        <div class="text-sm text-zinc-500">{{ card.label }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ card.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ card.note }}</div>
      </UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Module status</div></template>
      <div class="grid gap-3 text-sm md:grid-cols-3">
        <div><span class="text-zinc-500">Data available:</span> {{ availableData }}</div>
        <div><span class="text-zinc-500">Review signals:</span> {{ assessment.priorities.length }}</div>
        <div><span class="text-zinc-500">Last profile update:</span> {{ profile.updatedAt }}</div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Relevant observations</div></template>
      <div v-if="relevantBiomarkers.length" class="divide-y divide-zinc-800">
        <div v-for="item in relevantBiomarkers" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div>
            <div class="font-medium">{{ item.name }}</div>
            <div class="text-xs text-zinc-500">{{ item.measuredAt }} · {{ item.source }}</div>
          </div>
          <div class="font-semibold">{{ item.value }} {{ item.unit }}</div>
        </div>
      </div>
      <p v-else class="text-sm text-zinc-500">No relevant laboratory observations are available yet. Add or import data to activate this module.</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Interpretation boundary</div></template>
      <p class="text-sm leading-6 text-zinc-500">This view reports recorded data and deterministic screening signals. It does not diagnose disease, infer missing measurements, or autonomously prescribe treatment.</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { assessLongevity } from '~/services/longevity-engine'

const route = useRoute()
const biology = usePersonalBiology()
const profile = biology.profile
const initialized = biology.initialized

await biology.initialize()

const section = computed(() => String(route.params.section).toLowerCase())
const title = computed(() => String(route.params.section).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
const assessment = computed(() => assessLongevity(profile.value))

const sectionKeywords: Record<string, string[]> = {
  cardiovascular: ['heart', 'blood pressure', 'ldl', 'apob', 'cholesterol', 'triglyceride', 'crp'],
  metabolic: ['glucose', 'hba1c', 'insulin', 'triglyceride', 'cholesterol'],
  fitness: ['vo2', 'fitness', 'lactate', 'heart rate', 'resting heart'],
  recovery: ['hrv', 'sleep', 'recovery', 'resting heart'],
  organs: ['creatinine', 'egfr', 'alt', 'ast', 'ggt', 'bilirubin', 'albumin'],
  prevention: ['blood pressure', 'ldl', 'hba1c', 'psa', 'ferritin', 'vitamin d'],
  evidence: [],
  interventions: [],
}

const relevantBiomarkers = computed(() => {
  const keywords = sectionKeywords[section.value] ?? []
  const sorted = [...profile.value.biomarkers].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
  if (!keywords.length) return sorted.slice(0, 10)
  return sorted.filter((item) => {
    const name = item.name.toLowerCase()
    return keywords.some((keyword) => name.includes(keyword))
  }).slice(0, 10)
})

const availableData = computed(() => {
  if (section.value === 'genetics') return `${profile.value.variants.length} variant records`
  if (section.value === 'interventions') return `${profile.value.medications.length + profile.value.supplements.length} tracked agents`
  if (section.value === 'fitness') return `${profile.value.training.length} training records`
  if (section.value === 'recovery') return `${profile.value.sleep.length} sleep records`
  return `${relevantBiomarkers.value.length} relevant biomarker records`
})

const cards = computed(() => {
  if (section.value === 'genetics') return [
    { label: 'Variants', value: String(profile.value.variants.length), note: 'Imported genetic records' },
    { label: 'Genes named', value: String(new Set(profile.value.variants.map((item) => item.gene).filter(Boolean)).size), note: 'Unique gene symbols' },
    { label: 'Review', value: 'Manual', note: 'Variant interpretation is evidence-dependent' },
    { label: 'Source', value: 'Local', note: 'Profile remains locally persisted' },
  ]
  if (section.value === 'interventions') return [
    { label: 'Medications', value: String(profile.value.medications.length), note: 'Tracked medication records' },
    { label: 'Supplements', value: String(profile.value.supplements.length), note: 'Tracked supplement records' },
    { label: 'Active', value: String(profile.value.medications.filter((x) => x.active).length + profile.value.supplements.filter((x) => x.active).length), note: 'Currently active records' },
    { label: 'Safety', value: String(biology.interactionFlags().length), note: 'Built-in interaction signals' },
  ]
  if (section.value === 'fitness') return [
    { label: 'Training', value: String(profile.value.training.length), note: 'Recorded sessions' },
    { label: 'Biomarkers', value: String(relevantBiomarkers.value.length), note: 'Fitness-related lab signals' },
    { label: 'Status', value: relevantBiomarkers.value.length ? 'Tracking' : 'Baseline needed', note: 'Data coverage' },
    { label: 'Screening', value: `${assessment.value.score}/100`, note: 'Reference-bound screening only' },
  ]
  return [
    { label: 'Biomarkers', value: String(relevantBiomarkers.value.length), note: 'Relevant imported records' },
    { label: 'Signals', value: String(assessment.value.priorities.length), note: 'Actionable reference-bound signals' },
    { label: 'Variants', value: String(profile.value.variants.length), note: 'Genomic records' },
    { label: 'Screening', value: `${assessment.value.score}/100`, note: 'Reference-bound screening only' },
  ]
})
</script>
