import { appendDocument, appendObservations, appendVariants, emptyLongevityStore, loadLongevityStore, saveLongevityStore, type LocalGeneticVariant, type LocalObservation } from '../persistence/local-store'
import { sha256Hex, type SelectedLocalFile } from '../tauri/file-adapter'
import { confirmDocumentImport, previewImport, type ImportPreview } from '../tauri/import-service'
import { parseSelectedFile } from '../import/parser'

const storage = () => localStorage

export function useLongevityImport() {
  const preview = ref<ImportPreview | null>(null)
  const candidates = ref<Array<{ type: 'observation' | 'variant'; value: LocalObservation | LocalGeneticVariant }>>([])
  const busy = ref(false)
  const error = ref('')

  async function prepare(file: SelectedLocalFile) {
    busy.value = true
    error.value = ''
    try {
      preview.value = await previewImport(file)
      candidates.value = parseSelectedFile(file, preview.value.document.id)
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

  function cancel() {
    preview.value = null
    candidates.value = []
    error.value = ''
  }

  return { preview, candidates, busy, error, prepare, confirm, cancel }
}
