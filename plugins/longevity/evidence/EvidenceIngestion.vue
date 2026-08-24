<script setup lang="ts">
import { computed, ref } from 'vue'
import { evidenceDedupKey, isDuplicateEvidence, normalizeIdentifiers, type EvidenceIngestionRecord, type EvidenceSource } from './ingestion'

const props = defineProps<{ records: EvidenceIngestionRecord[] }>()
const source = ref<EvidenceSource>({ title: '', identifiers: {} })

const normalized = computed(() => ({ ...source.value, identifiers: normalizeIdentifiers(source.value.identifiers) }))
const duplicate = computed(() => !normalized.value.title ? false : isDuplicateEvidence(props.records, normalized.value))
const dedupKey = computed(() => normalized.value.title ? evidenceDedupKey(normalized.value) : '')
</script>

<template>
  <section class="evidence-ingestion">
    <h2>Add evidence source</h2>
    <label>Title <input v-model="source.title" /></label>
    <label>PMID <input v-model="source.identifiers.pmid" /></label>
    <label>DOI <input v-model="source.identifiers.doi" /></label>
    <label>URL <input v-model="source.identifiers.url" /></label>
    <p v-if="dedupKey">Deduplication key: {{ dedupKey }}</p>
    <p v-if="duplicate">Duplicate source detected. Review the existing record instead of creating another active entry.</p>
    <button :disabled="!source.title || duplicate">Preview import</button>
  </section>
</template>

<style scoped>
.evidence-ingestion { display:grid; gap:.75rem; max-width:44rem; }
.evidence-ingestion label { display:grid; gap:.25rem; }
.evidence-ingestion input { padding:.5rem; }
</style>
