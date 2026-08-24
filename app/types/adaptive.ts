import type { PersonalBiologyProfile } from './biology'
import type { ObjectiveWeight, ProtocolStep } from './core'

export type AdaptationAction = 'continue' | 'reduce' | 'pause' | 'collect-data' | 'review-safety'

export interface PolicyRule {
  id: string
  when: { metric: string; operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'; value: number }
  action: AdaptationAction
  reason: string
}

export interface AdaptationDecision {
  action: AdaptationAction
  matchedRules: PolicyRule[]
  rationale: string[]
}

export interface DailyPlan {
  date: string
  readiness: number
  recoveryState: 'low' | 'moderate' | 'good'
  priorities: Array<{ id: string; title: string; score: number }>
  actions: Array<{ title: string; reason: string; safety: 'green' | 'yellow' | 'orange' | 'red' }>
  suppressedSteps: ProtocolStep[]
}

export interface ValueOfInformationItem {
  metric: string
  value: number
  rationale: string
}

export interface OutcomeLearningResult {
  metric: string
  baselineMean: number
  interventionMean: number
  delta: number
  standardizedEffect: number
  confidence: 'low' | 'moderate' | 'high'
  recommendation: 'retain-signal' | 'insufficient-signal' | 'possible-harm'
}

export interface DailyPlanRequest {
  profile: PersonalBiologyProfile
  objectives: ObjectiveWeight[]
  protocol: ProtocolStep[]
  observations: Array<{ metric: string; value: number }>
}
