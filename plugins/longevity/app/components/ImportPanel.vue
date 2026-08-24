<script setup lang="ts">
import { ref } from 'vue'
import { parseBloodCsv, parseBloodJson } from '../imports/blood-parser'
import { parseGeneticData } from '../imports/dna-parser'
import { saveBloodImport, saveGeneticImport, saveImportDocument } from '../imports/local-store'

const mode = ref<'blood' | 'dna'>('blood')
const busy = ref(false)
const error = ref('')
const preview = ref<any>(null)

async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isJson(file: File): boolean {
  return file.name.toLowerCase().endsWith('.json') || file.type === 'application/json'
}

async function handleFile(file?: File) {
  if (!file) return
  busy.value = true
  error.value = ''
  preview.value = null
  try {
    const sourceDocumentId = crypto.randomUUID()
    const fileHash = await sha256(file)
    const storedDocument = {
      id: sourceDocumentId,
      kind: mode.value === 'blood' ? 'blood_report' : file.name.toLowerCase().endsWith('.pdf') ? 'dna_report' : 'dna_raw',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sha256: fileHash,
      importedAt: new Date().toISOString(),
      localOnly: true,
    } as const

    if (file.name.toLowerCase().endsWith('.pdf')) {
      preview.value = { format: 'pdf', message: 'PDF stored locally. The PDF/document adapter will extract structured results before confirmation.' }
      await saveImportDocument(storedDocument)
      return
    }

    const text = await file.text()
    if (mode.value === 'blood') {
      const parsed = isJson(file)
        ? parseBloodJson(JSON.parse(text), sourceDocumentId)
        : parseBloodCsv(text, file.name, sourceDocumentId)
      preview.value = parsed
      await saveImportDocument({ ...storedDocument, collectionDate: parsed.collectionDate })
      await saveBloodImport(parsed)
    } else {
      const parsed = parseGeneticData(text, file.name, sourceDocumentId)
      preview.value = parsed
      await saveImportDocument(storedDocument)
      await saveGeneticImport(parsed)
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Import failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="longevity-import-panel">
    <div class="tabs">
      <button :class="{ active: mode === 'blood' }" type="button" @click="mode = 'blood'">Bloods</button>
      <button :class="{ active: mode === 'dna' }" type="button" @click="mode = 'dna'">Genetics</button>
    </div>

    <label class="dropzone">
      <input
        type="file"
        :accept="mode === 'blood' ? '.csv,.tsv,.json,.pdf' : '.vcf,.csv,.tsv,.json,.pdf'"
        @change="handleFile(($event.target as HTMLInputElement).files?.[0])"
      />
      <strong>{{ busy ? 'Importing…' : mode === 'blood' ? 'Add blood test' : 'Upload DNA / genetic analysis' }}</strong>
      <span>{{ mode === 'blood' ? 'CSV, TSV, JSON or PDF' : 'VCF, CSV, TSV, JSON or PDF' }}</span>
    </label>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="preview" class="preview">
      <template v-if="mode === 'blood'">
        <strong>Preview</strong>
        <span>{{ preview.markers?.length ?? 0 }} markers detected</span>
        <span>{{ preview.warningCount ?? 0 }} warnings</span>
        <span>{{ preview.duplicateCount ?? 0 }} duplicates</span>
      </template>
      <template v-else>
        <strong>Preview</strong>
        <span>{{ preview.variantCount ?? 0 }} variants detected</span>
        <span>{{ preview.findingCount ?? 0 }} findings</span>
        <span>{{ Math.round((preview.evidenceCoverage ?? 0) * 100) }}% evidence coverage</span>
      </template>
    </div>
  </section>
</template>

<style scoped>
.longevity-import-panel { display: grid; gap: 12px; }
.tabs { display: flex; gap: 8px; }
.tabs button { padding: 8px 12px; }
.tabs .active { font-weight: 700; }
.dropzone { display: grid; gap: 6px; padding: 24px; border: 1px dashed currentColor; border-radius: 12px; cursor: pointer; }
.dropzone input { display: none; }
.preview { display: flex; gap: 12px; flex-wrap: wrap; padding: 12px; border-radius: 10px; background: color-mix(in srgb, currentColor 8%, transparent); }
.error { margin: 0; }
</style>
