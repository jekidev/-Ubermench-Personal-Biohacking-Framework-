import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { AnomalySignal, AuditFinding, CompiledProtocol, ObjectiveWeight } from '~/types/core'
import { auditRecommendation } from './audit-engine'
import { compileProtocol } from './protocol-compiler'
import { detectAnomalies } from './anomaly-engine'
import { rankByObjectives } from './objective-engine'
import { screenInterventionSafety } from './safety-engine'

export interface ClosedLoopRequest {
  goal: string
  objectives?: ObjectiveWeight[]
  candidates?: InterventionCandidate[]
  metrics?: Array<{ metric: string; value: number; recordedAt?: string }>
  baselines?: Array<{ metric: string; baseline: number; tolerancePct?: number }>
  monitoring?: string[]
}

export interface ClosedLoopResult {
  protocol: CompiledProtocol
  anomalies: AnomalySignal[]
  audit: AuditFinding[]
  rankedCandidates: ReturnType<typeof rankByObjectives>
  nextAction: 'research' | 'review-safety' | 'run-experiment' | 'monitor' | 'collect-data'
}

export function runClosedLoop(profile: PersonalBiologyProfile, request: ClosedLoopRequest): ClosedLoopResult {
  const rankedCandidates = rankByObjectives(request.candidates ?? [], profile, request.objectives ?? [])
  const protocol = compileProtocol(profile, { ...request, candidates: rankedCandidates })
  const anomalies = detectAnomalies(request.metrics ?? [], request.baselines ?? [])
  const safetyFlags = rankedCandidates.flatMap((candidate) => screenInterventionSafety(candidate.name, profile.medications, profile.supplements))
  const evidence = rankedCandidates.flatMap((candidate) => candidate.evidence)
  const dataCompleteness = [profile.biomarkers.length > 0, profile.sleep.length > 0, profile.training.length > 0, profile.goals.length > 0].filter(Boolean).length / 4
  const audit = auditRecommendation({ evidence, interventions: rankedCandidates, safetyFlags, dataCompleteness })

  const nextAction: ClosedLoopResult['nextAction'] =
    audit.some((item) => item.blocking) ? 'review-safety' :
    anomalies.some((item) => item.severity === 'critical') ? 'collect-data' :
    !evidence.length ? 'research' :
    protocol.steps.length ? 'run-experiment' : 'monitor'

  return { protocol, anomalies, audit, rankedCandidates, nextAction }
}
