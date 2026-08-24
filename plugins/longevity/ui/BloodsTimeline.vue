<script setup lang="ts">
import { computed } from 'vue'
import { summarizeTimeline, type TimelineObservation } from './bloods-timeline-model'

const props = defineProps<{ biomarker: string; observations: TimelineObservation[] }>()

const summary = computed(() => summarizeTimeline(props.observations))
const ordered = computed(() => [...props.observations].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt)))
const changeLabel = computed(() => {
  const value = summary.value?.relativeChangePercent
  if (value === undefined) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
})
</script>

<template>
  <section class="bloods-timeline" :aria-label="`${biomarker} timeline`">
    <header class="bloods-timeline__header">
      <div>
        <h2>{{ biomarker }}</h2>
        <p v-if="summary">Latest {{ summary.latest.value }} {{ summary.latest.unit }}</p>
      </div>
      <div v-if="summary" class="bloods-timeline__summary">
        <span>{{ changeLabel }}</span>
        <span>{{ summary.direction }}</span>
      </div>
    </header>

    <ol class="bloods-timeline__events">
      <li v-for="observation in ordered" :key="observation.id">
        <time :datetime="observation.collectedAt">{{ observation.collectedAt }}</time>
        <strong>{{ observation.value }} {{ observation.unit }}</strong>
        <span v-if="observation.laboratory">{{ observation.laboratory }}</span>
        <small v-if="observation.extractionMethod">Source: {{ observation.extractionMethod }}</small>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.bloods-timeline { display: grid; gap: 1rem; }
.bloods-timeline__header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
.bloods-timeline__header h2 { margin: 0; }
.bloods-timeline__header p { margin: .25rem 0 0; opacity: .7; }
.bloods-timeline__summary { display: grid; gap: .2rem; text-align: right; }
.bloods-timeline__events { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
.bloods-timeline__events li { display: grid; grid-template-columns: 8rem 1fr auto; gap: .75rem; align-items: baseline; padding: .75rem 0; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.bloods-timeline__events small { grid-column: 2 / -1; opacity: .6; }
</style>
