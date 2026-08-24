import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import { deriveBiologicalState } from './digital-twin'

export interface SimulationRequest {
  intervention: InterventionCandidate
  horizonDays?: number
}

export interface SimulationResult {
  intervention: string
  horizonDays: number
  baseline: ReturnType<typeof deriveBiologicalState>
  expected: ReturnType<typeof deriveBiologicalState>
  expectedBenefits: string[]
  risks: string[]
  confidence: number
  limitations: string[]
}

export function simulateIntervention(profile: PersonalBiologyProfile, request: SimulationRequest): SimulationResult {
  const horizonDays = Math.max(1, Math.round(request.horizonDays ?? 28))
  const baseline = deriveBiologicalState(profile)
  const expected = {
    ...baseline,
    activeSupplementCount: baseline.activeSupplementCount + (/supplement|nutrition|nutrient/i.test(request.intervention.name) ? 1 : 0),
    trainingSamples: baseline.trainingSamples + (/training|exercise|running|strength|cardio/i.test(request.intervention.name) ? Math.max(1, Math.round(horizonDays / 3)) : 0),
    updatedAt: new Date(Date.now() + horizonDays * 86400000).toISOString(),
  }
  return {
    intervention: request.intervention.name,
    horizonDays,
    baseline,
    expected,
    expectedBenefits: request.intervention.expectedBenefits,
    risks: request.intervention.risks,
    confidence: Math.max(0, Math.min(1, request.intervention.personalFit * (request.intervention.evidence.length ? 0.75 : 0.3))),
    limitations: [
      'This is a heuristic scenario model, not a validated physiological simulation.',
      'It does not predict individual biomarker trajectories without calibrated longitudinal data.',
    ],
  }
}
