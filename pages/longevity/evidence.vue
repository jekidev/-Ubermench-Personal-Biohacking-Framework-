<script setup lang="ts">
import EvidenceLookupPreview from '~/plugins/longevity/evidence/EvidenceLookupPreview.vue'
import { loadEvidenceStore } from '~/services/evidence-normalizer'

const records = ref(loadEvidenceStore())

function refreshRecords() {
  records.value = loadEvidenceStore()
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Longevity</p>
      <h1 class="mt-2 text-3xl font-semibold">Evidence</h1>
      <p class="mt-2 text-muted">Browse normalized research records and look up DOI/PMID metadata for review.</p>
    </div>

    <UCard>
      <EvidenceLookupPreview />
    </UCard>

    <UCard>
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">Persisted records</h2>
        <UButton size="sm" variant="soft" @click="refreshRecords">Refresh</UButton>
      </div>
      <ul class="mt-4 space-y-3">
        <li v-for="record in records" :key="record.id" class="rounded-lg border border-zinc-800 p-4">
          <div class="flex items-start justify-between gap-3">
            <strong>{{ record.title }}</strong>
            <UBadge v-if="record.reviewRequired" variant="subtle">Review required</UBadge>
          </div>
          <p class="mt-2 text-sm text-muted">{{ record.summary || 'No abstract stored.' }}</p>
          <p class="mt-2 text-xs text-muted">
            {{ record.source }}
            <span v-if="record.doi"> · DOI {{ record.doi }}</span>
            <span v-if="record.pmid"> · PMID {{ record.pmid }}</span>
            · Retrieved {{ record.retrievedAt }}
          </p>
        </li>
      </ul>
      <p v-if="!records.length" class="mt-4 text-sm text-muted">No normalized evidence records yet. Run a research workflow from Biology or AI Models.</p>
    </UCard>
  </div>
</template>
