import { appendDocument, appendObservations, appendVariants, emptyLongevityStore, loadLongevityStore, saveLongevityStore, type LocalGeneticVariant, type LocalObservation } from '../persistence/local-store'
import { sha256Hex, type SelectedLocalFile } from '../tauri/file-adapter'
import { confirmDocumentImport, previewImport, type ImportPreview } from '../tauri/import-service'
import { parseSelectedFileAsync, type ImportCandidate } from '../import/parser'
import { indexUploadedDocument } from '../rag/index-document'
import { mergeObservationsIntoBiomarkers } from '../services/biology-bridge'
import { loadBiologyProfile, saveBiologyProfile } from '../../../app/services/biology-store'
import type { PdfTextBlock } from '../import/pdf-lab-engine'

const storage = () => localStorage

export function useLongevityImport() {
  const preview = ref<ImportPreview | null>(null)
  const candidates = ref<ImportCandidate[]>([])
  const pageTexts = ref<PdfTextBlock[]>([])
  const indexedChunks = ref(0)
  const busy = ref(false)
  const error = ref('')

  async function prepare(file: SelectedLocalFile, options?: {
    useLlmAssist?: boolean
    useOcr?: boolean
    useVision?: boolean
    ocrAdapter?: import('../import/ocr-adapter').OcrAdapter
    visionRunner?: import('../import/vision-lab-extractor').VisionDocumentRunner
    llmRunner?: (prompt: string, system: string) => Promise<string>
  }) {
    busy.value = true
    error.value = ''
    indexedChunks.value = 0
    try {
      preview.value = await previewImport(file)
      const parsed = await parseSelectedFileAsync(file, preview.value.document.id, options)
      candidates.value = parsed.candidates
      pageTexts.value = parsed.pageTexts
    } catch (cause) {
      preview.value = null
      candidates.value = []
      pageTexts.value = []
      error.value = cause instanceof Error ? cause.message : 'Import failed'
    } finally {
      busy.value = false
    }
  }

  async function confirm(file: SelectedLocalFile) {
    if (!preview.value) throw new Error('No import preview is active')
    const current = loadLongevityStore(storage())
    const adapter = {
      async persistSourceFile() { return { localPath: `local://${preview.value!.document.sha256}/${file.name}` } },
      async pickFile() { return [] },
    }
    const result = await confirmDocumentImport(adapter, file, current)
    let next = result.store
    const observations = candidates.value.filter((item): item is { type: 'observation'; value: LocalObservation } => item.type === 'observation').map((item) => item.value)
    next = appendObservations(next, observations)
    next = appendVariants(next, candidates.value.filter((item): item is { type: 'variant'; value: LocalGeneticVariant } => item.type === 'variant').map((item) => item.value))
    saveLongevityStore(storage(), next)

    const indexed = indexUploadedDocument({
      documentId: preview.value.document.id,
      sha256: preview.value.document.sha256,
      filename: preview.value.document.filename,
      pageTexts: pageTexts.value,
      bytes: preview.value.format === 'pdf' ? file.contents : undefined,
    })
    indexedChunks.value = indexed.chunks.length

    if (observations.length) {
      const profile = await loadBiologyProfile()
      await saveBiologyProfile({
        ...profile,
        biomarkers: mergeObservationsIntoBiomarkers(profile.biomarkers, observations),
      })
    }

    preview.value = null
    candidates.value = []
    pageTexts.value = []
    return next
  }

  function cancel() {
    preview.value = null
    candidates.value = []
    pageTexts.value = []
    error.value = ''
    indexedChunks.value = 0
  }

  return { preview, candidates, pageTexts, indexedChunks, busy, error, prepare, confirm, cancel }
}
