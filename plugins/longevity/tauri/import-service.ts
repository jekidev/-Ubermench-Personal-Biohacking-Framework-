import type { NativeFileAdapter, SelectedLocalFile } from './file-adapter'
import { detectImportMime, sha256Hex } from './file-adapter'
import { appendDocument, appendObservations, appendVariants, type LongevityLocalStore } from '../persistence/local-store'

export type ImportKind = 'blood_report' | 'dna_raw' | 'dna_report'

export type ImportPreview = {
  document: {
    id: string
    filename: string
    mimeType: string
    sizeBytes: number
    sha256: string
    localOnly: true
  }
  format: ReturnType<typeof detectImportMime>
  kind: ImportKind
  warnings: string[]
}

function documentId(sha256: string): string {
  return `doc-${sha256.slice(0, 24)}`
}

export function classifyImport(file: SelectedLocalFile): ImportKind {
  const format = detectImportMime(file.name, file.mimeType)
  if (format === 'vcf') return 'dna_raw'
  if (format === 'pdf') {
    return /dna|genetic|genome|23andme|ancestry/i.test(file.name) ? 'dna_report' : 'blood_report'
  }
  if (format === 'csv' || format === 'tsv' || format === 'json') {
    return /dna|genetic|variant|rsid|vcf/i.test(file.name) ? 'dna_raw' : 'blood_report'
  }
  return 'blood_report'
}

export async function previewImport(file: SelectedLocalFile): Promise<ImportPreview> {
  const sha256 = await sha256Hex(file.contents)
  const format = detectImportMime(file.name, file.mimeType)
  const warnings: string[] = []

  if (format === 'unknown') warnings.push('Unsupported or unknown file format')
  if (format === 'pdf') warnings.push('PDF extraction requires text-layout/OCR adapter before clinical values can be confirmed')

  return {
    document: {
      id: documentId(sha256),
      filename: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      sha256,
      localOnly: true,
    },
    format,
    kind: classifyImport(file),
    warnings,
  }
}

export async function confirmDocumentImport(
  adapter: NativeFileAdapter,
  file: SelectedLocalFile,
  store: LongevityLocalStore,
): Promise<{ store: LongevityLocalStore; localPath: string }> {
  const sha256 = await sha256Hex(file.contents)
  const id = documentId(sha256)

  if (store.documents.some((document) => document.sha256 === sha256)) {
    return { store, localPath: '' }
  }

  const persisted = await adapter.persistSourceFile(file, sha256)
  const nextStore = appendDocument(store, {
    id,
    sha256,
    filename: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: new Date().toISOString(),
    localOnly: true,
  })

  return { store: nextStore, localPath: persisted.localPath }
}

export { appendObservations, appendVariants }
