<script setup lang="ts">
import type { ExperimentSpec } from '~/services/experiment-lifecycle'
import type { ExperimentDesign } from '~/services/experiment-protocols'

const { experiments, templates, initialize, createExperiment, summarize } = useExperiments()
const selectedDesign = ref<ExperimentDesign>('single-subject-crossover')
const message = ref('')

const draft = ref<ExperimentSpec>({
  id: `exp-${Date.now()}`,
  subjectId: 'self',
  metric: 'hrv',
  intervention: 'magnesium',
  baselineDays: 7,
  interventionDays: 14,
  washoutDays: 7,
  followupDays: 7,
  startAt: new Date().toISOString(),
})

onMounted(initialize)

async function startExperiment() {
  message.value = ''
  try {
    await createExperiment(draft.value, selectedDesign.value)
    message.value = 'Experiment protocol created and stored locally.'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Unable to create experiment.'
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Experiments</p>
      <h1 class="mt-2 text-3xl font-semibold">N-of-1 Protocols</h1>
      <p class="mt-2 text-muted">Pre-declared crossover templates with audit-only stopping rules.</p>
    </div>

    <UCard>
      <h2 class="font-semibold">Create protocol</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <label class="text-sm">
          Design
          <select v-model="selectedDesign" class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2">
            <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.name }}</option>
          </select>
        </label>
        <label class="text-sm">
          Metric
          <input v-model="draft.metric" class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" />
        </label>
        <label class="text-sm">
          Intervention
          <input v-model="draft.intervention" class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" />
        </label>
        <label class="text-sm">
          Baseline days
          <input v-model.number="draft.baselineDays" type="number" class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2" />
        </label>
      </div>
      <UButton class="mt-4" @click="startExperiment">Create protocol</UButton>
      <p v-if="message" class="mt-3 text-sm text-muted">{{ message }}</p>
    </UCard>

    <div class="space-y-4">
      <UCard v-for="experiment in experiments" :key="experiment.id">
        <h2 class="font-semibold">{{ experiment.intervention }} → {{ experiment.metric }}</h2>
        <p class="mt-1 text-sm text-muted">Design: {{ experiment.design }}</p>
        <p class="mt-2 text-sm">
          Conclusion:
          {{ summarize(experiment).summary.conclusionType }}
          — {{ summarize(experiment).summary.conclusionRationale }}
        </p>
      </UCard>
    </div>
  </div>
</template>
