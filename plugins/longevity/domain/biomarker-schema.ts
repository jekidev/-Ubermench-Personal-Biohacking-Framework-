export type LabSource = 'manual' | 'csv' | 'json' | 'pdf' | 'ocr' | 'api'

export interface LabReferenceRange {
  low?: number
  high?: number
  unit: string
  sex?: 'male' | 'female' | 'unknown'
  ageMin?: number
  ageMax?: number
  source?: string
}

export interface BloodMarkerResult {
  id: string
  panelId: string
  measuredAt: string
  name: string
  canonicalName: string
  value: number
  unit: string
  referenceRange?: LabReferenceRange
  flag?: 'low' | 'normal' | 'high' | 'critical' | 'unknown'
  labName?: string
  source: LabSource
  originalLabel?: string
  notes?: string
}

export interface BloodPanel {
  id: string
  collectedAt: string
  reportedAt?: string
  labName?: string
  source: LabSource
  documentName?: string
  markers: BloodMarkerResult[]
  importWarnings: string[]
  parserVersion: string
}

export interface BiomarkerTrend {
  canonicalName: string
  unit: string
  points: Array<{ measuredAt: string; value: number; panelId: string }>
  direction: 'improving' | 'stable' | 'declining' | 'mixed' | 'insufficient_data'
}
