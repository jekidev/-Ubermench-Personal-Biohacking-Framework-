<script setup lang="ts">
import type { ExperimentSpec } from '~/services/experiment-lifecycle'
import type { ExperimentDesign } from '~/services/experiment-protocols'
import type { ConfounderCategory } from '~/services/experiment-confounders'

const { experiments, templates, initialize, createExperiment, summarize, recordAdherence, recordConfounder } = useExperiments()
const selectedDesign = ref<ExperimentDesign>('single-subject-crossover')
const message = ref('')
const selectedExperimentId = ref('')
const confounderCategory = ref<ConfounderCategory>('sleep')
const confounderDescription = ref('')
const confounderSeverity = ref<0 | 1 | 2 | 3>(1)

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
    const created = await createExperiment(draft.value, selectedDesign.value)
    selectedExperimentId.value = created.id
    message.value = 'Experiment protocol created and stored locally.'
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Unable to create experiment.'
  }
}

function logAdherence(experimentId: string, completed: boolean) {
  recordAdherence(experimentId, completed)
  message.value = completed ? 'Adherence logged as completed.' : 'Missed dose logged.'
}

function addConfounder(experimentId: string) {
  if (!confounderDescription.value.trim()) {
    message.value = 'Add a short confounder description first.'
    return
  }
  recordConfounder(experimentId, {
    category: confounderCategory.value,
    description: confounderDescription.value.trim(),
    severity: confounderSeverity.value,
  })
  confounderDescription.value = ''
  message.value = 'Confounder event recorded.'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Experiments</p>
      <h1 class="mt-2 text-3xl font-semibold">N-of-1 Protocols</h1>
      <p class="mt-2 text-muted">Pre-declared crossover templates with audit-only stopping rules, adherence and sensitivity analysis.</p>
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
        <p class="mt-1 text-sm text-muted">Design: {{ experiment.design }} · Status: {{ experiment.runtime.status }}</p>

        <div class="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <span class="text-muted">Conclusion</span>
            <div>{{ summarize(experiment).summary.conclusionType }}</div>
            <div class="text-xs text-muted">{{ summarize(experiment).summary.conclusionRationale }}</div>
          </div>
          <div>
            <span class="text-muted">Adherence</span>
            <div>
              {{ summarize(experiment).summary.adherenceCount
                ? `${Math.round((summarize(experiment).summary.adherenceRate ?? 0) * 100)}% (${summarize(experiment).summary.completedAdherence}/${summarize(experiment).summary.adherenceCount})`
                : 'No events logged' }}
            </div>
          </div>
          <div>
            <span class="text-muted">Sensitivity</span>
            <div>{{ summarize(experiment).sensitivity.conclusion }}</div>
            <div v-if="summarize(experiment).sensitivity.delta !== undefined" class="text-xs text-muted">
              Δ {{ summarize(experiment).sensitivity.delta?.toFixed(2) }}
              (leave-one-out {{ summarize(experiment).sensitivity.leaveOneOutDeltaMin?.toFixed(2) }}
              – {{ summarize(experiment).sensitivity.leaveOneOutDeltaMax?.toFixed(2) }})
            </div>
          </div>
        </div>

        <div class="mt-4">
          <h3 class="text-sm font-medium">Stopping rules (audit-only)</h3>
          <ul class="mt-2 space-y-1 text-sm">
            <li v-for="rule in summarize(experiment).stopping" :key="rule.ruleId" class="flex items-center gap-2">
              <UBadge :color="rule.triggered ? 'warning' : 'neutral'" variant="subtle">{{ rule.triggered ? 'Triggered' : 'OK' }}</UBadge>
              <span>{{ rule.message }}</span>
              <span class="text-xs text-muted">→ {{ rule.recommendation }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-4">
          <h3 class="text-sm font-medium">Confounders ({{ summarize(experiment).confounders.count }})</h3>
          <p v-if="!experiment.confounders.length" class="mt-1 text-sm text-muted">No confounder events recorded.</p>
          <ul v-else class="mt-2 space-y-1 text-sm">
            <li v-for="item in experiment.confounders" :key="item.id">
              {{ item.category }} · severity {{ item.severity }} — {{ item.description }}
            </li>
          </ul>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton size="sm" variant="outline" @click="logAdherence(experiment.id, true)">Log dose taken</UButton>
          <UButton size="sm" variant="ghost" @click="logAdherence(experiment.id, false)">Log missed dose</UButton>
        </div>

        <div class="mt-4 grid gap-2 md:grid-cols-4">
          <select v-model="confounderCategory" class="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="sleep">Sleep</option>
            <option value="training">Training</option>
            <option value="nutrition">Nutrition</option>
            <option value="medication">Medication</option>
            <option value="illness">Illness</option>
            <option value="stress">Stress</option>
            <option value="other">Other</option>
          </select>
          <select v-model.number="confounderSeverity" class="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option :value="0">Severity 0</option>
            <option :value="1">Severity 1</option>
            <option :value="2">Severity 2</option>
            <option :value="3">Severity 3</option>
          </select>
          <input v-model="confounderDescription" placeholder="Confounder note" class="md:col-span-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
        </div>
        <UButton class="mt-2" size="sm" variant="outline" @click="addConfounder(experiment.id)">Add confounder</UButton>
      </UCard>
    </div>
  </div>
</template>
