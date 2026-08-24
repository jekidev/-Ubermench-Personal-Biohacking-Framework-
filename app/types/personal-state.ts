export type StateDomain = 'cardiovascular' | 'metabolic' | 'inflammatory' | 'hormonal' | 'neurological' | 'immune' | 'sleep' | 'stress' | 'fitness' | 'nutrition' | 'cognitive' | 'recovery'

export interface StateDimension {
  domain: StateDomain
  value: number
  unit?: string
  trend?: number
  confidence: number
  quality: number
  observedAt: string
  sources?: string[]
}

export interface HumanState {
  version: 1
  subjectId: string
  asOf: string
  dimensions: Partial<Record<StateDomain, StateDimension>>
  activeInterventions: string[]
  activeExperiments: string[]
  alerts: string[]
}

export interface CanonicalObservation {
  id: string
  subjectId: string
  observedAt: string
  metric: string
  value: number
  unit?: string
  source: string
  sourceRecordId?: string
  quality: number
  confidence: number
  context?: Record<string, string | number | boolean | null>
  provenance?: { importedAt: string; adapter?: string; sourceVersion?: string }
}

export interface InterventionEvent {
  id: string
  subjectId: string
  name: string
  action: 'start' | 'stop' | 'dose' | 'protocol'
  occurredAt: string
  dose?: number
  unit?: string
  route?: string
  metadata?: Record<string, string | number | boolean | null>
}
