<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildBiomarkerChartModel, filterDateRange } from './biomarker-chart-model'
import type { TimelineObservation } from './bloods-timeline-model'

const props = defineProps<{ biomarker: string; observations: TimelineObservation[] }>()
const range = ref<'3m' | '6m' | '1y' | 'all'>('all')

const rangeObservations = computed(() => filterDateRange(props.observations, range.value))
const model = computed(() => buildBiomarkerChartModel(props.biomarker, rangeObservations.value))
const max = computed(() => Math.max(...(model.value?.points.map((point) => point.value) ?? [1])))
const min = computed(() => Math.min(...(model.value?.points.map((point) => point.value) ?? [0])))

function y(value: number) {
  const span = max.value - min.value || 1
  return 100 - ((value - min.value) / span) * 100
}
</script>

<template>
  <section class="chart-card" :aria-label="`${biomarker} chart`">
    <header class="chart-card__header">
      <div>
        <h2>{{ biomarker }}</h2>
        <p v-if="model">{{ model.latest?.label }}</p>
      </div>
      <select v-model="range" aria-label="Time range">
        <option value="3m">3 months</option>
        <option value="6m">6 months</option>
        <option value="1y">1 year</option>
        <option value="all">All history</option>
      </select>
    </header>

    <div v-if="model" class="chart" role="img" :aria-label="`${biomarker} longitudinal measurements`">
      <div class="chart__plot">
        <div v-if="model.reference.low !== undefined" class="chart__reference chart__reference--low" :style="{ bottom: `${y(model.reference.low)}%` }" />
        <div v-if="model.reference.high !== undefined" class="chart__reference chart__reference--high" :style="{ bottom: `${y(model.reference.high)}%` }" />
        <div v-for="(point, index) in model.points" :key="`${point.date}-${index}`" class="chart__point" :style="{ left: `${model.points.length === 1 ? 50 : (index / (model.points.length - 1)) * 100}%`, bottom: `${y(point.value)}%` }">
          <span class="chart__dot" />
          <span class="chart__tooltip">{{ point.date }} · {{ point.label }}</span>
        </div>
      </div>
      <footer class="chart__footer">
        <span>Baseline: {{ model.baseline?.label }}</span>
        <span>Latest: {{ model.latest?.label }}</span>
      </footer>
    </div>

    <p v-else class="chart-card__empty">No comparable observations in this period.</p>
  </section>
</template>

<style scoped>
.chart-card { display: grid; gap: 1rem; }
.chart-card__header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
.chart-card__header h2 { margin: 0; }
.chart-card__header p { margin: .25rem 0 0; opacity: .7; }
.chart { display: grid; gap: .75rem; }
.chart__plot { position: relative; min-height: 16rem; border: 1px solid color-mix(in srgb, currentColor 12%, transparent); border-radius: .75rem; overflow: hidden; }
.chart__reference { position: absolute; left: 0; right: 0; border-top: 1px dashed currentColor; opacity: .25; }
.chart__point { position: absolute; transform: translate(-50%, 50%); }
.chart__dot { display: block; width: .7rem; height: .7rem; border-radius: 50%; background: currentColor; }
.chart__tooltip { position: absolute; left: 50%; bottom: 1rem; transform: translateX(-50%); white-space: nowrap; opacity: 0; pointer-events: none; font-size: .75rem; }
.chart__point:hover .chart__tooltip, .chart__point:focus-within .chart__tooltip { opacity: .85; }
.chart__footer { display: flex; justify-content: space-between; gap: .75rem; font-size: .85rem; opacity: .75; }
.chart-card__empty { opacity: .7; }
</style>
