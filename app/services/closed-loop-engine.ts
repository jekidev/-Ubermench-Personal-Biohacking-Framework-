import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { AnomalySignal, AuditFinding, CompiledProtocol, ObjectiveWeight } from '~/types/core'
import type { DataGap, DataQualityReport } from '~/types/data-quality'
import { auditRecommendation } from './audit-engine'
import { compileProtocol } from './protocol-compiler'
import { detectAnomalies } from './anomaly-engine'
import { rankByObjectives } from './objective-engine'
import { screenInterventionSafety } from './safety-engine'
import { assessDataQuality, identifyDataGaps } from './data-quality-engine'
import { estimateInterventionEffect, type CausalObservation, type CausalEstimate } from './causal-engine'

export interface ClosedLoopRequest {
  goal: string
  objectives?: ObjectiveWeight[]
  candidates?: InterventionCandidate[]
  metrics?: Array<{ metric: string; value: number; recordedAt?: string }>
  baselines?: Array<{ metric: string; baseline: number; tolerancePct?: number }>
  monitoring?: string[]
  causalObservations?: CausalObservation[]
  causalTargets?: Array<{ metric: string; intervention: string }>
}

export interface ClosedLoopResult {
  protocol: CompiledProtocol
  anomalies: AnomalySignal[]
  audit: AuditFinding[]
  rankedCandidates: ReturnType<typeof rankByObjectives>
  dataQuality: DataQualityReport
  dataGaps: DataGap[]
  causalEstimates: CausalEstimate[]
  nextAction: 'research' | 'review-safety' | 'run-experiment' | 'monitor' | 'collect-data' | 'update-model'
}

export function runClosedLoop(profile: PersonalBiologyProfile, request: ClosedLoopRequest): ClosedLoopResult {
  const rankedCandidates = rankByObjectives(request.candidates ?? [], profile, request.objectives ?? [])
  const protocol = compileProtocol(profile, { ...request, candidates: rankedCandidates })
  const anomalies = detectAnomalies(request.metrics ?? [], request.baselines ?? [])
  const safetyFlags = rankedCandidates.flatMap((candidate) => screenInterventionSafety(candidate.name, profile.medications, profile.supplements))
  const evidence = rankedCandidates.flatMap((candidate) => candidate.evidence)
  const dataQuality = assessDataQuality(profile)
  const dataGaps = identifyDataGaps(profile)
  const causalEstimates = (request.causalTargets ?? []).map((target) => estimateInterventionEffect(request.causalObservations ?? [], target.metric, target.intervention))
  const audit = auditRecommendation({ evidence, interventions: rankedCandidates, safetyFlags, dataCompleteness: dataQuality.completeness })

  const nextAction: ClosedLoopResult['nextAction'] =
    audit.some((item) => item.blocking) ? 'review-safety' :
    anomalies.some((item) => item.severity === 'critical') ? 'collect-data' :
    dataQuality.completeness < 0.5 ? 'collect-data' :
    causalEstimates.some((estimate) => estimate.delta !== undefined && estimate.confidence >= 0.6) ? 'update-model' :
    !evidence.length ? 'research' :
    protocol.steps.length ? 'run-experiment' : 'monitor'

  return { protocol, anomalies, audit, rankedCandidates, dataQuality, dataGaps, causalEstimates, nextAction }
}
