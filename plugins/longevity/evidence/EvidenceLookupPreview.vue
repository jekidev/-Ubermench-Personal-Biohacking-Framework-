<script setup lang="ts">
import { ref } from 'vue'
import { normalizeIdentifier, toPreview, type EvidenceMetadata } from './live-lookup'

const identifier = ref('')
const loading = ref(false)
const error = ref('')
const preview = ref<ReturnType<typeof toPreview> | null>(null)

async function lookup() {
  error.value = ''
  preview.value = null
  loading.value = true
  try {
    const normalized = normalizeIdentifier(identifier.value)
    const [kind, id] = normalized.identifier.split(':', 2)
    const endpoint = kind === 'pmid'
      ? `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=json`
      : `https://api.crossref.org/v1/works/${encodeURIComponent(id)}`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`Metadata lookup failed (${response.status}).`)
    const data = await response.json()
    const metadata: EvidenceMetadata = kind === 'pmid'
      ? { identifier: normalized.identifier, source: 'pubmed', title: data.result?.[id]?.title ?? '', authors: (data.result?.[id]?.authors ?? []).map((a: { name: string }) => a.name), journal: data.result?.[id]?.fulljournalname, publicationDate: data.result?.[id]?.pubdate, pmid: id, canonicalUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, retrievedAt: new Date().toISOString() }
      : { identifier: normalized.identifier, source: 'crossref', title: data.message?.title?.[0] ?? '', authors: (data.message?.author ?? []).map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(' ')), journal: data.message?.['container-title']?.[0], publicationDate: data.message?.published?.['date-parts']?.[0]?.join('-'), doi: data.message?.DOI, canonicalUrl: data.message?.URL, retrievedAt: new Date().toISOString() }
    preview.value = toPreview(metadata)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Lookup failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="evidence-lookup">
    <form @submit.prevent="lookup">
      <label for="evidence-id">PMID or DOI</label>
      <div class="evidence-lookup__input"><input id="evidence-id" v-model="identifier" placeholder="e.g. 12345678 or 10.xxxx/xxxxx" autocomplete="off" /><button type="submit" :disabled="loading">{{ loading ? 'Looking up…' : 'Lookup' }}</button></div>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <article v-if="preview">
      <header><strong>{{ preview.metadata.title || 'Untitled record' }}</strong><span>Candidate · review required</span></header>
      <p>{{ preview.metadata.authors.join(', ') }}</p>
      <p>{{ preview.metadata.journal }} · {{ preview.metadata.publicationDate }}</p>
      <small>{{ preview.metadata.identifier }}</small>
      <ul><li v-for="note in preview.notes" :key="note">{{ note }}</li></ul>
    </article>
  </section>
</template>

<style scoped>
.evidence-lookup { display:grid; gap:1rem; }
.evidence-lookup__input { display:flex; gap:.5rem; }
.evidence-lookup input { flex:1; min-width:0; }
.evidence-lookup article { display:grid; gap:.5rem; padding:1rem; border:1px solid color-mix(in srgb,currentColor 12%,transparent); border-radius:.6rem; }
.evidence-lookup article header { display:flex; justify-content:space-between; gap:1rem; }
.evidence-lookup article p { margin:0; }
</style>
