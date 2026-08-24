import type { PersonalBiologyProfile } from './biology'

export interface ProvenanceRecord {
  sourceType: 'manual' | 'lab-import' | 'wearable' | 'genomics-import' | 'model' | 'api'
  sourceId?: string
  capturedAt?: string
  importedAt: string
  parserVersion?: string
  confidence: number
  note?: string
}

export interface DataQualityReport {
  completeness: number
  sourceCoverage: number
  timestampCoverage: number
  unitCoverage: number
  issues: string[]
}

export interface DataGap {
  metric: string
  reason: string
  expectedDecisionImpact: number
}

export function emptyProvenance(sourceType: ProvenanceRecord['sourceType']): ProvenanceRecord {
  return { sourceType, importedAt: new Date().toISOString(), confidence: 0.5 }
}

export type BiologyProfileWithProvenance = PersonalBiologyProfile & {
  provenance?: Record<string, ProvenanceRecord[]>
}
