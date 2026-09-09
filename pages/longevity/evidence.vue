<script setup lang="ts">
import EvidenceLookupPreview from '~~/plugins/longevity/evidence/EvidenceLookupPreview.vue'
import { LONGEVITY_WATCHLIST } from '~~/plugins/longevity/evidence/watchlist'
import { extractEvidenceClaims } from '~/services/evidence-claims'
import { rankEvidenceRecords, type EvidenceFreshnessBand } from '~/services/evidence-freshness'
import { loadEvidenceStore } from '~/services/evidence-normalizer'
import { evaluateRetraction, type RetractionStatus } from '~/services/evidence-retraction'
import { createResearchSnapshot, loadResearchSnapshots, persistResearchSnapshot, type ResearchSnapshot } from '~/services/research-snapshot'

const records = ref(loadEvidenceStore())
const snapshots = ref<ResearchSnapshot[]>(loadResearchSnapshots())
const snapshotMessage = ref('')
const snapshotBusy = ref(false)
const ranked = computed(() => rankEvidenceRecords(records.value).map((item) => ({
  ...item,
  claims: extractEvidenceClaims(item.record),
  retraction: evaluateRetraction({
    evidenceId: item.record.id,
    doi: item.record.doi,
    retracted: item.record.retracted,
    retractionNotice: item.record.retractionNotice,
  }),
})))

function refreshRecords() {
  records.value = loadEvidenceStore()
  snapshots.value = loadResearchSnapshots()
}

async function captureSnapshot() {
  snapshotBusy.value = true
  snapshotMessage.value = ''
  try {
    const snapshot = await createResearchSnapshot(records.value, { query: 'longevity-evidence' })
    snapshots.value = persistResearchSnapshot(snapshot)
    snapshotMessage.value = `Snapshot stored with checksum ${snapshot.checksum.slice(0, 12)}… · ${snapshot.recordCount} records · ${snapshot.retractedCount} retracted`
  } catch (error) {
    snapshotMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    snapshotBusy.value = false
  }
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

function retractionColor(status: RetractionStatus) {
  if (status === 'retracted') return 'error'
  if (status === 'expression-of-concern') return 'warning'
  if (status === 'not-retracted') return 'success'
  return 'neutral'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Longevity</p>
      <h1 class="mt-2 text-3xl font-semibold">Evidence</h1>
      <p class="mt-2 text-muted">
        Browse normalized research records with freshness, DOI/PMID identity, citation-level claims and retraction status.
        Claims are extracted from the stored text only — numeric effects are never invented.
      </p>
    </div>

    <UCard>
      <EvidenceLookupPreview />
    </UCard>

    <UCard>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold">Persisted records</h2>
        <div class="flex flex-wrap gap-2">
          <UButton size="sm" variant="soft" @click="refreshRecords">Refresh</UButton>
          <UButton size="sm" :loading="snapshotBusy" @click="captureSnapshot">Capture research snapshot</UButton>
        </div>
      </div>
      <p class="mt-2 text-xs text-muted">Ranking uses stored evidence quality. Mechanistic plausibility is labelled separately from human outcome evidence. Retracted records stay visible with a warning.</p>
      <p v-if="snapshotMessage" class="mt-2 text-sm text-muted">{{ snapshotMessage }}</p>
      <ul class="mt-4 space-y-3">
        <li v-for="item in ranked" :key="item.record.id" class="rounded-lg border border-zinc-800 p-4">
          <div class="flex items-start justify-between gap-3">
            <strong>{{ item.record.title }}</strong>
            <div class="flex flex-wrap justify-end gap-2">
              <UBadge variant="subtle">Score {{ item.score.toFixed(2) }}</UBadge>
              <UBadge :color="freshnessColor(item.freshness.band)" variant="subtle">{{ item.freshness.band }}</UBadge>
              <UBadge :color="retractionColor(item.retraction.status)" variant="subtle">{{ item.retraction.status }}</UBadge>
              <UBadge v-if="item.record.reviewRequired" variant="subtle">Review required</UBadge>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted">{{ item.record.summary || 'No abstract stored.' }}</p>
          <ul v-if="item.claims.length" class="mt-3 space-y-1 text-sm">
            <li v-for="(claim, index) in item.claims" :key="`${item.record.id}-claim-${index}`" class="text-zinc-300">
              Claim ({{ claim.polarity }}, {{ claim.uncertainty }} uncertainty{{ claim.numericEffect ? `, ${claim.numericEffect}` : '' }}): {{ claim.text }}
            </li>
          </ul>
          <p v-if="item.retraction.notice" class="mt-2 text-sm text-red-400">{{ item.retraction.notice }}</p>
          <p class="mt-2 text-xs text-muted">
            {{ kindLabel(item.evidenceKind) }}
            · {{ item.record.evidenceLevel }}
            · claim uncertainty {{ item.record.claimUncertainty }}
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

    <UCard v-if="snapshots.length">
      <template #header><div class="font-medium">Research snapshots</div></template>
      <p class="text-sm text-muted">Checksummed, local-only copies of ranked evidence, claims and retraction status at capture time.</p>
      <ul class="mt-3 space-y-2 text-sm">
        <li v-for="snapshot in snapshots" :key="snapshot.checksum" class="rounded-lg border border-zinc-800 p-3">
          <div class="font-medium">{{ snapshot.createdAt }}</div>
          <p class="mt-1 text-muted">
            {{ snapshot.recordCount }} records
            · {{ snapshot.claims.length }} claims
            · {{ snapshot.retractedCount }} retracted
            · checksum {{ snapshot.checksum.slice(0, 16) }}…
          </p>
        </li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Geroscience watchlist</div></template>
      <p class="text-sm text-muted">Curated sources from awesome-longevity. News and clocks are not evidence grade.</p>
      <ul class="mt-3 space-y-2 text-sm">
        <li v-for="item in LONGEVITY_WATCHLIST" :key="item.id">
          <a :href="item.url" class="text-zinc-200 underline underline-offset-4" target="_blank" rel="noreferrer">{{ item.title }}</a>
          <span class="text-muted"> · {{ item.tier }} · {{ item.notes }}</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>
