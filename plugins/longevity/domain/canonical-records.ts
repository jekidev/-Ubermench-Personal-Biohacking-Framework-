export type RecordKind = 'source-document' | 'import-event' | 'observation' | 'variant' | 'interpretation' | 'derived-metric'

export type Provenance = {
  sourceId: string
  sourceType: 'pdf' | 'image' | 'csv' | 'vcf' | 'manual' | 'wearable' | 'device' | 'api'
  contentHash?: string
  sourcePage?: number
  extractionMethod?: 'native-text' | 'ocr' | 'structured' | 'manual' | 'wearable-api' | 'device-api'
  confidence?: number
  importedAt: string
}

export type CanonicalRecord<TPayload = unknown> = {
  id: string
  kind: RecordKind
  schemaVersion: string
  createdAt: string
  supersedesId?: string
  payload: TPayload
  provenance: Provenance[]
}

export type SourceDocument = {
  filename: string
  mimeType: string
  contentHash: string
  sizeBytes: number
  localPath?: string
}

export type ImportEvent = {
  sourceDocumentId: string
  parser: string
  parserVersion: string
  status: 'candidate' | 'reviewed' | 'confirmed' | 'rejected'
  errors?: string[]
}

export type Observation = {
  subject: 'biomarker' | 'vital' | 'wearable' | 'body-composition'
  key: string
  value: number | string | boolean | null
  unit?: string
  referenceRange?: { low?: number; high?: number; unit?: string }
  observedAt: string
  status: 'candidate' | 'confirmed' | 'rejected'
}

export type VariantObservation = {
  genomeBuild?: string
  chrom: string
  position: number
  rsid?: string
  ref: string
  alt: string
  genotype: string
  status: 'candidate' | 'confirmed' | 'rejected'
}

export type Interpretation = {
  subjectRecordId: string
  label: string
  statement: string
  evidenceIds: string[]
  confidence?: number
  status: 'candidate' | 'confirmed' | 'rejected'
}

export type DerivedMetric = {
  key: string
  value: number | string | boolean | null
  unit?: string
  algorithmVersion: string
  inputRecordIds: string[]
  calculatedAt: string
}

export const CANONICAL_SCHEMA_VERSION = '1.0.0'

export function createRecord<TPayload>(input: {
  id: string
  kind: RecordKind
  payload: TPayload
  provenance: Provenance[]
  createdAt?: string
  supersedesId?: string
}): CanonicalRecord<TPayload> {
  return {
    id: input.id,
    kind: input.kind,
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.supersedesId ? { supersedesId: input.supersedesId } : {}),
    payload: input.payload,
    provenance: input.provenance,
  }
}

export function assertConfirmed(record: CanonicalRecord<{ status?: string }>): void {
  if (record.payload.status !== 'confirmed') {
    throw new Error('Record is not confirmed and cannot enter the confirmed longitudinal dataset.')
  }
}
