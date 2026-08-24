import type { EvidenceItem, InterventionCandidate, PersonalBiologyProfile } from './biology'

export type ObjectiveId = 'longevity' | 'cardiovascular' | 'metabolic' | 'brain' | 'mental-resilience' | 'sleep' | 'performance' | 'recovery' | 'quality-of-life'

export interface ObjectiveWeight {
  id: ObjectiveId
  weight: number
  direction?: 'maximize' | 'minimize'
}

export interface GoalSpec {
  id: string
  title: string
  description?: string
  objectives: ObjectiveWeight[]
  createdAt: string
}

export interface ProtocolStep {
  id: string
  intervention: string
  rationale: string
  priority: number
  safety: 'green' | 'yellow' | 'orange' | 'red'
  monitoring: string[]
  evidence: EvidenceItem[]
}

export interface OptimizationResult {
  objectiveScores: Record<ObjectiveId, number>
  weightedScore: number
  dominatedBy?: string[]
}

export interface CompiledProtocol {
  goal: GoalSpec
  biologicalState: ReturnType<typeof import('../services/digital-twin').deriveBiologicalState>
  researchQuery: string
  steps: ProtocolStep[]
  alternatives: InterventionCandidate[]
  uncertainty: 'low' | 'moderate' | 'high'
  generatedAt: string
}

export interface AnomalySignal {
  metric: string
  observed: number
  baseline: number
  deviationPct: number
  severity: 'info' | 'warning' | 'critical'
  direction: 'up' | 'down'
  detectedAt: string
}

export interface AuditFinding {
  id: string
  category: 'evidence' | 'safety' | 'causality' | 'personalization' | 'data-quality'
  severity: 'info' | 'warning' | 'critical'
  message: string
  blocking: boolean
}

export interface PersonalizationContext {
  profile: PersonalBiologyProfile
  objectives: ObjectiveWeight[]
}
