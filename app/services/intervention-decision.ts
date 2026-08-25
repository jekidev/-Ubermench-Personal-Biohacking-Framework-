import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import { buildEvidenceDecisionTrace, type EvidenceDecisionTrace } from './evidence-decision-trace'
import { rankInterventions } from './intervention-engine'

export interface RankedInterventionDecision {
  candidate: InterventionCandidate
  trace: EvidenceDecisionTrace
}

/**
 * Rank intervention candidates and attach the same deterministic decision trace
 * used to explain the resulting disposition. This remains decision support only.
 */
export function rankInterventionDecisions(
  profile: PersonalBiologyProfile,
  candidates: InterventionCandidate[],
): RankedInterventionDecision[] {
  return rankInterventions(profile, candidates).map((candidate) => ({
    candidate,
    trace: buildEvidenceDecisionTrace(candidate),
  }))
}
