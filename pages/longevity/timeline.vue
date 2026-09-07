<script setup lang="ts">
import { loadEvidenceStore } from '~/services/evidence-normalizer'
import { buildLongitudinalDashboard } from '~/services/longitudinal-dashboard'

const biology = usePersonalBiology()
await biology.initialize()

const dashboard = computed(() => buildLongitudinalDashboard(biology.profile.value, loadEvidenceStore()))
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Longevity</p>
      <h1 class="mt-2 text-3xl font-semibold">Longitudinal timeline</h1>
      <p class="mt-2 text-muted">
        First-to-last series, data-quality labels and a shared time axis with stored evidence.
        Rising or falling is not clinical improvement or harm, and evidence on the same axis is not a causal claim.
      </p>
    </div>

    <UCard>
      <template #header><div class="font-medium">Metric series</div></template>
      <div v-if="dashboard.cards.length" class="space-y-4">
        <div v-for="card in dashboard.cards" :key="card.key" class="rounded-lg border border-zinc-800 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="font-medium">{{ card.label }}</div>
              <p class="mt-1 text-sm text-muted">
                {{ card.summary?.direction ?? 'insufficient-data' }}
                · {{ card.pointCount }} points
                · quality {{ card.quality?.dataQuality ?? 'low' }}
              </p>
              <p class="mt-1 text-xs text-zinc-500">{{ card.latestLabel }}</p>
            </div>
            <svg :width="card.sparkline.width" :height="card.sparkline.height" class="text-primary" role="img" :aria-label="`${card.label} longitudinal sparkline`">
              <path :d="card.sparkline.path" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-muted">No comparable longitudinal series yet. Import labs, sleep or training records first.</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">State and evidence</div></template>
      <p class="text-sm text-muted">Evidence uses published date when stored, otherwise retrieval time. Retracted records stay visible.</p>
      <ol v-if="dashboard.timeline.length" class="mt-4 space-y-3">
        <li v-for="item in dashboard.timeline" :key="`${item.lane}-${item.id}`" class="rounded-lg border border-zinc-800 p-3 text-sm">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <strong>{{ item.label }}</strong>
            <div class="flex flex-wrap gap-2">
              <UBadge variant="subtle">{{ item.lane }}</UBadge>
              <UBadge v-if="item.retracted" color="error" variant="subtle">retracted</UBadge>
            </div>
          </div>
          <p class="mt-1 text-muted">
            {{ item.at.slice(0, 10) }}
            · {{ item.kind }}
            <span v-if="item.value !== undefined"> · {{ item.value }}{{ item.unit ? ` ${item.unit}` : '' }}</span>
            <span v-if="item.detail"> · {{ item.detail }}</span>
          </p>
        </li>
      </ol>
      <p v-else class="mt-4 text-sm text-muted">No dated state or evidence events to plot.</p>
    </UCard>
  </div>
</template>
