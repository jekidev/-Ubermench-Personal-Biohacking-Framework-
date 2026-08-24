import { appendObservations, appendVariants, loadLongevityStore, saveLongevityStore, type LocalGeneticVariant, type LocalObservation } from '../persistence/local-store'
import { detectImportMime, sha256Hex, type SelectedLocalFile } from '../tauri/file-adapter'
import { confirmDocumentImport, previewImport, type ImportPreview } from '../tauri/import-service'
import { extractPdfLabText } from '../tauri/pdf-adapter'
import { parsePdfExtraction, parseSelectedFile, type ImportCandidate } from '../import/parser'

const storage = () => localStorage

export function useLongevityImport() {
  const preview = ref<ImportPreview | null>(null)
  const candidates = ref<ImportCandidate[]>([])
  const busy = ref(false)
  const error = ref('')

  async function prepare(file: SelectedLocalFile) {
    busy.value = true
    error.value = ''
    try {
      preview.value = await previewImport(file)
      if (detectImportMime(file.name, file.mimeType) === 'pdf') {
        const extraction = await extractPdfLabText(file.contents)
        candidates.value = parsePdfExtraction(extraction, preview.value.document.id, file.name)
        preview.value = { ...preview.value, warnings: [...new Set([...preview.value.warnings, ...extraction.warnings])] }
      } else {
        candidates.value = parseSelectedFile(file, preview.value.document.id)
      }
    } catch (cause) {
      preview.value = null
      candidates.value = []
      error.value = cause instanceof Error ? cause.message : 'Import failed'
    } finally {
      busy.value = false
    }
  }

  async function confirm(file: SelectedLocalFile) {
    if (!preview.value) throw new Error('No import preview is active')
    if (preview.value.kind === 'blood_report' && preview.value.format === 'pdf' && candidates.value.length === 0) {
      throw new Error('No confirmed blood observations were extracted from the PDF')
    }
    const current = loadLongevityStore(storage())
    const adapter = {
      async persistSourceFile() { return { localPath: `local://${preview.value!.document.sha256}/${file.name}` } },
      async pickFile() { return [] },
    }
    const result = await confirmDocumentImport(adapter, file, current)
    let next = result.store
    next = appendObservations(next, candidates.value.filter((item): item is { type: 'observation'; value: LocalObservation } => item.type === 'observation').map((item) => item.value))
    next = appendVariants(next, candidates.value.filter((item): item is { type: 'variant'; value: LocalGeneticVariant } => item.type === 'variant').map((item) => item.value))
    saveLongevityStore(storage(), next)
    preview.value = null
    candidates.value = []
    return next
  }

  async function fingerprint(file: SelectedLocalFile): Promise<string> {
    return sha256Hex(file.contents)
  }

  function cancel() {
    preview.value = null
    candidates.value = []
    error.value = ''
  }

  return { preview, candidates, busy, error, prepare, confirm, fingerprint, cancel }
}
