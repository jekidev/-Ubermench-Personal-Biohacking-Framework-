import type { InterventionCandidate, PersonalBiologyProfile, EvidenceItem } from '~/types/biology'
import { aggregateEvidence } from './evidence-engine'

export function rankInterventions(profile: PersonalBiologyProfile, candidates: InterventionCandidate[]): InterventionCandidate[] {
  return candidates.map((candidate) => {
    const evidence = aggregateEvidence(candidate.evidence)
    const interactionPenalty = candidate.interactions.length ? Math.min(0.5, candidate.interactions.length * 0.1) : 0
    const riskPenalty = Math.min(0.3, candidate.risks.length * 0.05)
    const priority = Math.max(0, Math.min(1, evidence * 0.45 + candidate.personalFit * 0.55 - interactionPenalty - riskPenalty))
    return { ...candidate, priority }
  }).sort((a, b) => b.priority - a.priority)
}

export function makeCandidate(name: string, evidence: EvidenceItem[] = [], personalFit = 0.5): InterventionCandidate {
  return { id: crypto.randomUUID(), name, expectedBenefits: [], risks: [], interactions: [], evidence, personalFit, priority: aggregateEvidence(evidence) * 0.45 + personalFit * 0.55 }
}
