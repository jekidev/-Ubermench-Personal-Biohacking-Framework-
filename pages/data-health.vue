<script setup lang="ts">
import { assessDataQuality, identifyDataGaps } from '~/services/data-quality-engine'
import { buildLongitudinalView } from '~/services/longitudinal-view'
import { summarizeLongitudinalSeries } from '~/services/longitudinal-analytics'
import { assessLongitudinalQuality } from '~/services/longitudinal-quality'
import { buildDataHealthDiagnostics } from '~/services/data-health-diagnostics'
import { describeBackupStatus } from '~/services/backup-status'
import { describeExperimentBackupStatus } from '~/services/experiment-backup'
import { isTauriRuntime } from '~/utils/runtime-platform'

const biology = usePersonalBiology()
const experiments = useExperiments()
const profile = biology.profile

await biology.initialize()
await experiments.initialize()

const quality = computed(() => assessDataQuality(profile.value))
const gaps = computed(() => identifyDataGaps(profile.value))
const longitudinal = computed(() => {
  const view = buildLongitudinalView(profile.value)
  return assessLongitudinalQuality(summarizeLongitudinalSeries(view.series))
})
const diagnostics = computed(() => buildDataHealthDiagnostics({
  profile: profile.value,
  experiments: experiments.experiments.value,
  isTauriRuntime: isTauriRuntime(),
}))

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function impactLabel(value: number) {
  if (value >= 0.85) return 'High'
  if (value >= 0.55) return 'Medium'
  return 'Low'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Diagnostics</p>
      <h1 class="mt-2 text-3xl font-semibold">Data health</h1>
      <p class="mt-2 text-muted">Coverage, provenance and longitudinal quality for personal decision support.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <div class="text-sm text-muted">Profile completeness</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.completeness) }}</div>
        <div class="mt-1 text-xs text-muted">Seven core biological domains</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Source coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.sourceCoverage) }}</div>
        <div class="mt-1 text-xs text-muted">Biomarkers, sleep and training</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Timestamp coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.timestampCoverage) }}</div>
        <div class="mt-1 text-xs text-muted">Valid biomarker timestamps</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Unit coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.unitCoverage) }}</div>
        <div class="mt-1 text-xs text-muted">Biomarkers with units</div>
      </UCard>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <div class="text-sm text-muted">Credential storage</div>
        <div class="mt-2 text-lg font-semibold">{{ diagnostics.credentialStorage === 'tauri-vault' ? 'Tauri vault' : 'Browser dev path' }}</div>
        <div class="mt-1 text-xs text-muted">Provider secret handling</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Active protocols</div>
        <div class="mt-2 text-2xl font-semibold">{{ diagnostics.experiments.count }}</div>
        <div class="mt-1 text-xs text-muted">{{ diagnostics.experiments.runningCount }} running</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Stopping-rule alerts</div>
        <div class="mt-2 text-2xl font-semibold">{{ diagnostics.experiments.triggeredStoppingRules }}</div>
        <div class="mt-1 text-xs text-muted">Audit-only triggers</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Low adherence protocols</div>
        <div class="mt-2 text-2xl font-semibold">{{ diagnostics.experiments.lowAdherenceCount }}</div>
        <div class="mt-1 text-xs text-muted">Below 70% logged adherence</div>
      </UCard>
    </div>

    <UCard v-if="diagnostics.warnings.length">
      <template #header><div class="font-medium">Operational warnings</div></template>
      <ul class="list-disc space-y-2 pl-5 text-sm">
        <li v-for="warning in diagnostics.warnings" :key="warning">{{ warning }}</li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Backup status</div></template>
      <div class="space-y-2 text-sm">
        <p>{{ describeBackupStatus(diagnostics.biologyBackup) }}</p>
        <p>{{ describeExperimentBackupStatus(diagnostics.experimentBackup) }}</p>
      </div>
    </UCard>

    <UCard v-if="quality.issues.length">
      <template #header><div class="font-medium">Quality issues</div></template>
      <ul class="list-disc space-y-2 pl-5 text-sm">
        <li v-for="issue in quality.issues" :key="issue">{{ issue }}</li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Decision-critical gaps</div></template>
      <div v-if="!gaps.length" class="text-sm text-muted">No major data gaps detected.</div>
      <div v-else class="space-y-3">
        <div v-for="gap in gaps" :key="gap.metric" class="rounded-lg border border-zinc-800 p-3 text-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium">{{ gap.metric }}</span>
            <UBadge variant="subtle">{{ impactLabel(gap.expectedDecisionImpact) }} impact</UBadge>
          </div>
          <p class="mt-1 text-muted">{{ gap.reason }}</p>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Longitudinal series quality</div></template>
      <div v-if="!longitudinal.length" class="text-sm text-muted">No longitudinal series available yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="text-muted">
            <tr>
              <th class="py-2 pr-4">Metric</th>
              <th class="py-2 pr-4">Points</th>
              <th class="py-2 pr-4">Span (days)</th>
              <th class="py-2 pr-4">Quality</th>
              <th class="py-2">Comparable</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in longitudinal" :key="item.key" class="border-t border-zinc-800">
              <td class="py-2 pr-4">{{ item.label }}</td>
              <td class="py-2 pr-4">{{ item.pointCount }}</td>
              <td class="py-2 pr-4">{{ item.spanDays.toFixed(0) }}</td>
              <td class="py-2 pr-4">
                <UBadge :color="item.dataQuality === 'high' ? 'success' : item.dataQuality === 'moderate' ? 'warning' : 'neutral'" variant="subtle">
                  {{ item.dataQuality }}
                </UBadge>
              </td>
              <td class="py-2">{{ item.comparable ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Suggested next steps</div></template>
      <div class="flex flex-wrap gap-3 text-sm">
        <NuxtLink to="/longevity/bloods"><UButton variant="outline" size="sm">Import lab results</UButton></NuxtLink>
        <NuxtLink to="/health-sync"><UButton variant="outline" size="sm">Sync health data</UButton></NuxtLink>
        <NuxtLink to="/biology"><UButton variant="outline" size="sm">Manage biology profile</UButton></NuxtLink>
        <NuxtLink to="/safety"><UButton variant="outline" size="sm">Review safety</UButton></NuxtLink>
        <NuxtLink to="/experiments"><UButton variant="outline" size="sm">Start N-of-1 protocol</UButton></NuxtLink>
      </div>
    </UCard>
  </div>
</template>
