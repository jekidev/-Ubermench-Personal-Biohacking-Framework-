<script setup lang="ts">
import { assessDataQuality, identifyDataGaps } from '~/services/data-quality-engine'

const biology = usePersonalBiology()
const profile = biology.profile

await biology.initialize()

const quality = computed(() => assessDataQuality(profile.value))
const gaps = computed(() => identifyDataGaps(profile.value))

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
      <p class="mt-2 text-muted">Coverage and decision-critical gaps from the local biology profile.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <div class="text-sm text-muted">Profile completeness</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.completeness) }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Source coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.sourceCoverage) }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Timestamp coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.timestampCoverage) }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Unit coverage</div>
        <div class="mt-2 text-2xl font-semibold">{{ percent(quality.unitCoverage) }}</div>
      </UCard>
    </div>

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
      <template #header><div class="font-medium">Suggested next steps</div></template>
      <div class="flex flex-wrap gap-3 text-sm">
        <NuxtLink to="/longevity/bloods"><UButton variant="outline" size="sm">Import lab results</UButton></NuxtLink>
        <NuxtLink to="/health-sync"><UButton variant="outline" size="sm">Sync health data</UButton></NuxtLink>
        <NuxtLink to="/biology"><UButton variant="outline" size="sm">Manage biology profile</UButton></NuxtLink>
        <NuxtLink to="/safety"><UButton variant="outline" size="sm">Review safety</UButton></NuxtLink>
      </div>
    </UCard>
  </div>
</template>
