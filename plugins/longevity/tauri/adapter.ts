export type FileKind = 'blood_report' | 'dna_raw' | 'dna_report'

export interface FilePickRequest {
  acceptedKinds: FileKind[]
  extensions: string[]
}

export interface PickedFile {
  pathToken: string
  filename: string
  mimeType: string
  sizeBytes: number
}

export interface StoreSourceInput {
  sourceDocumentId: string
  filename: string
  mimeType: string
  bytes: Uint8Array
  kind: FileKind
}

export interface StoredSource {
  sourceDocumentId: string
  sha256: string
  filename: string
  sizeBytes: number
  localOnly: true
}

export interface LongevityNativeFileAdapter {
  pickFile(request: FilePickRequest): Promise<PickedFile>
  readFile(pathToken: string): Promise<Uint8Array>
  storeSource(input: StoreSourceInput): Promise<StoredSource>
  deleteSource(sourceDocumentId: string): Promise<void>
}

export const BLOOD_FILE_PICK_REQUEST: FilePickRequest = {
  acceptedKinds: ['blood_report'],
  extensions: ['pdf', 'csv', 'tsv', 'json'],
}

export const DNA_FILE_PICK_REQUEST: FilePickRequest = {
  acceptedKinds: ['dna_raw', 'dna_report'],
  extensions: ['vcf', 'csv', 'tsv', 'json', 'pdf'],
}

export function classifyFilename(filename: string): FileKind | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  if (ext === 'vcf') return 'dna_raw'
  if (['csv', 'tsv', 'json'].includes(ext)) return 'unknown'
  if (ext === 'pdf') return 'blood_report'
  return 'unknown'
}
