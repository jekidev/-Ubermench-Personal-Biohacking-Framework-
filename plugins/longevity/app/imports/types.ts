export type ImportFormat =
  | 'csv'
  | 'tsv'
  | 'json'
  | 'vcf'
  | 'pdf'
  | 'manual'
  | 'unknown'

export interface BloodMarkerImport {
  id: string
  marker: string
  canonicalMarker: string
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  collectionDate: string
  labName?: string
  sourceDocumentId: string
  sourceRow?: number
  confidence: number
  warnings: string[]
}

export interface BloodImportPreview {
  format: ImportFormat
  collectionDate?: string
  labName?: string
  markers: BloodMarkerImport[]
  duplicateCount: number
  warningCount: number
  sourceDocumentId: string
}

export interface GeneticVariant {
  id: string
  rsid?: string
  gene?: string
  chromosome?: string
  position?: number
  genotype: string
  sourceDocumentId: string
  confidence: number
}

export interface GeneticFinding {
  id: string
  title: string
  description: string
  variants: string[]
  evidenceGrade: 'A' | 'B' | 'C' | 'D' | 'E'
  sourceReferences: string[]
  lastReviewedAt?: string
}

export interface GeneticImportPreview {
  format: ImportFormat
  variantCount: number
  findingCount: number
  evidenceCoverage: number
  variants: GeneticVariant[]
  findings: GeneticFinding[]
  sourceDocumentId: string
}

export interface StoredImportDocument {
  id: string
  kind: 'blood_report' | 'dna_raw' | 'dna_report'
  fileName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  importedAt: string
  collectionDate?: string
  localOnly: boolean
}
