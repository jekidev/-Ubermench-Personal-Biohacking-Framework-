<script setup lang="ts">
import { computed, ref } from 'vue'
import { currentEvidence, evidenceLabel, type EvidenceRecord } from './evidence-browser'

const props = defineProps<{ records: EvidenceRecord[]; subject: string }>()
const selectedLevel = ref<'all' | EvidenceRecord['evidenceLevel']>('all')

const records = computed(() => {
  const active = currentEvidence(props.records, props.subject)
  return selectedLevel.value === 'all' ? active : active.filter((r) => r.evidenceLevel === selectedLevel.value)
})
</script>

<template>
  <section class="evidence-browser" :aria-label="`Evidence for ${subject}`">
    <header class="evidence-browser__header">
      <div><h2>Evidence</h2><p>{{ subject }}</p></div>
      <select v-model="selectedLevel" aria-label="Filter evidence level">
        <option value="all">All levels</option><option value="A">A — High</option><option value="B">B — Moderate</option><option value="C">C — Limited</option><option value="D">D — Very limited</option><option value="E">E — Hypothesis</option>
      </select>
    </header>
    <ul class="evidence-browser__list">
      <li v-for="record in records" :key="record.id">
        <div><strong>{{ record.claim }}</strong><span>{{ evidenceLabel(record.evidenceLevel) }} · {{ record.evidenceType }}</span></div>
        <p>{{ record.sourceTitle }}</p>
        <small v-if="record.population">Population: {{ record.population }}</small>
        <small v-if="record.endpoint">Endpoint: {{ record.endpoint }}</small>
        <small>Version {{ record.version }} · accessed {{ record.accessedAt }}</small>
      </li>
    </ul>
    <p v-if="!records.length">No active evidence records for this subject.</p>
  </section>
</template>

<style scoped>
.evidence-browser { display:grid; gap:1rem; }
.evidence-browser__header { display:flex; justify-content:space-between; gap:1rem; align-items:start; }
.evidence-browser__header h2 { margin:0; }
.evidence-browser__header p { margin:.25rem 0 0; opacity:.7; }
.evidence-browser__list { list-style:none; padding:0; margin:0; display:grid; gap:.75rem; }
.evidence-browser__list li { display:grid; gap:.3rem; padding:.9rem; border:1px solid color-mix(in srgb,currentColor 12%,transparent); border-radius:.6rem; }
.evidence-browser__list span,.evidence-browser__list small { opacity:.7; }
.evidence-browser__list p { margin:0; }
</style>
