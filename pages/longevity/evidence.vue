<script setup lang="ts">
import EvidenceLookupPreview from '~/plugins/longevity/evidence/EvidenceLookupPreview.vue'
import { rankEvidenceRecords, type EvidenceFreshnessBand } from '~/services/evidence-freshness'
import { loadEvidenceStore } from '~/services/evidence-normalizer'

const records = ref(loadEvidenceStore())
const ranked = computed(() => rankEvidenceRecords(records.value))

function refreshRecords() {
  records.value = loadEvidenceStore()
}

function freshnessColor(band: EvidenceFreshnessBand) {
  if (band === 'current') return 'success'
  if (band === 'aging') return 'warning'
  if (band === 'stale') return 'error'
  return 'neutral'
}

function kindLabel(kind: 'human-outcome' | 'mechanistic' | 'unclassified') {
  if (kind === 'human-outcome') return 'Human outcome'
  if (kind === 'mechanistic') return 'Mechanistic'
  return 'Unclassified'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Longevity</p>
      <h1 class="mt-2 text-3xl font-semibold">Evidence</h1>
      <p class="mt-2 text-muted">Browse normalized research records ranked by existing evidence scores, with freshness and DOI/PMID identity.</p>
    </div>

    <UCard>
      <EvidenceLookupPreview />
    </UCard>

    <UCard>
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">Persisted records</h2>
        <UButton size="sm" variant="soft" @click="refreshRecords">Refresh</UButton>
      </div>
      <p class="mt-2 text-xs text-muted">Ranking uses stored evidence quality. Mechanistic plausibility is labelled separately from human outcome evidence.</p>
      <ul class="mt-4 space-y-3">
        <li v-for="item in ranked" :key="item.record.id" class="rounded-lg border border-zinc-800 p-4">
          <div class="flex items-start justify-between gap-3">
            <strong>{{ item.record.title }}</strong>
            <div class="flex flex-wrap justify-end gap-2">
              <UBadge variant="subtle">Score {{ item.score.toFixed(2) }}</UBadge>
              <UBadge :color="freshnessColor(item.freshness.band)" variant="subtle">{{ item.freshness.band }}</UBadge>
              <UBadge v-if="item.record.reviewRequired" variant="subtle">Review required</UBadge>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted">{{ item.record.summary || 'No abstract stored.' }}</p>
          <p class="mt-2 text-xs text-muted">
            {{ kindLabel(item.evidenceKind) }}
            · {{ item.record.evidenceLevel }}
            · {{ item.record.source }}
            <span v-if="item.record.doi"> · DOI {{ item.record.doi }}</span>
            <span v-if="item.record.pmid"> · PMID {{ item.record.pmid }}</span>
            <span v-if="item.record.publishedAt"> · Published {{ item.record.publishedAt }}</span>
            · Retrieved {{ item.record.retrievedAt }}
            <span v-if="item.freshness.ageDays !== undefined"> · {{ item.freshness.ageDays }}d old</span>
          </p>
        </li>
      </ul>
      <p v-if="!ranked.length" class="mt-4 text-sm text-muted">No normalized evidence records yet. Run a research workflow from Biology or AI Models.</p>
    </UCard>
  </div>
</template>
