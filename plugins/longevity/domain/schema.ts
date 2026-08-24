export type TrendStatus =
  | 'unknown'
  | 'baseline'
  | 'stable'
  | 'improving'
  | 'declining'
  | 'needs_review'

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export type MetricCategory =
  | 'cardiovascular'
  | 'metabolic'
  | 'fitness'
  | 'sleep'
  | 'organ_health'
  | 'body_composition'
  | 'prevention'
  | 'research'

export interface Measurement<T = number> {
  id: string
  metric: string
  category: MetricCategory
  value: T
  unit?: string
  timestamp: string
  source?: 'manual' | 'wearable' | 'lab' | 'device' | 'import'
  context?: Record<string, string | number | boolean | null>
  protocolVersion: string
}

export interface Trend {
  metric: string
  status: TrendStatus
  windowDays: number
  baseline?: number
  current?: number
  delta?: number
  confidence?: number
  algorithmVersion: string
}

export interface SafetyFlag {
  id: string
  severity: 'info' | 'warning' | 'urgent'
  category: string
  message: string
  triggeredAt: string
  requiresClinicianReview: boolean
}

export interface Intervention {
  id: string
  name: string
  type: 'medication' | 'supplement' | 'lifestyle' | 'device' | 'experimental'
  indication?: string
  status: 'considering' | 'active' | 'paused' | 'stopped'
  startDate?: string
  endDate?: string
  evidenceGrade: EvidenceGrade
  humanMortalityEvidence: 'positive' | 'neutral' | 'mixed' | 'none' | 'unknown'
  safetyNotes: string[]
}

export interface LongevityProfile {
  schemaVersion: string
  updatedAt: string
  measurements: Measurement[]
  trends: Trend[]
  interventions: Intervention[]
  safetyFlags: SafetyFlag[]
  prevention: {
    screeningItems: string[]
    vaccinationItems: string[]
    lastReviewedAt?: string
  }
}
