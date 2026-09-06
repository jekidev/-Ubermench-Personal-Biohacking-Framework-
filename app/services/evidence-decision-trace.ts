import type { EvidenceItem, InterventionCandidate } from '~/types/biology'
import {
  aggregateHumanOutcomeEvidence,
  aggregateMechanisticPlausibility,
  combinedEvidenceScore,
  scoreEvidence,
} from './evidence-engine'

export type DecisionTraceDisposition = 'consider' | 'review' | 'defer'

export interface EvidenceDecisionTrace {
  interventionId: string
  intervention: string
  disposition: DecisionTraceDisposition
  priority: number
  personalFit: number
  evidenceScore: number
  humanOutcomeScore: number
  mechanisticPlausibilityScore: number
  evidenceCount: number
  strongestEvidenceId?: string
  riskCount: number
  interactionCount: number
  rationale: string[]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function strongestEvidence(items: EvidenceItem[]): EvidenceItem | undefined {
  return [...items].sort((a, b) => scoreEvidence(b) - scoreEvidence(a) || a.id.localeCompare(b.id))[0]
}

/**
 * Build an explainable, deterministic trace for an intervention decision.
 * This is decision support only: it does not prescribe treatment.
 */
export function buildEvidenceDecisionTrace(candidate: InterventionCandidate): EvidenceDecisionTrace {
  const humanOutcomeScore = aggregateHumanOutcomeEvidence(candidate.evidence)
  const mechanisticPlausibilityScore = aggregateMechanisticPlausibility(candidate.evidence)
  const evidenceScore = combinedEvidenceScore(candidate.evidence)
  const personalFit = clamp01(candidate.personalFit)
  const priority = clamp01(candidate.priority)
  const riskCount = candidate.risks.length
  const interactionCount = candidate.interactions.length
  const strongest = strongestEvidence(candidate.evidence)

  const rationale: string[] = [
    `Human outcome score: ${humanOutcomeScore.toFixed(2)}; mechanistic plausibility: ${mechanisticPlausibilityScore.toFixed(2)}.`,
    `Combined evidence score: ${evidenceScore.toFixed(2)} across ${candidate.evidence.length} source(s).`,
    `Personal fit: ${personalFit.toFixed(2)}; priority: ${priority.toFixed(2)}.`,
  ]

  if (strongest) rationale.push(`Strongest evidence: ${strongest.id} (${strongest.evidenceLevel}).`)
  if (riskCount) rationale.push(`${riskCount} risk signal(s) require review.`)
  if (interactionCount) rationale.push(`${interactionCount} interaction signal(s) require review.`)

  const disposition: DecisionTraceDisposition = riskCount || interactionCount
    ? 'review'
    : evidenceScore >= 0.7 && personalFit >= 0.7 && priority >= 0.5
      ? 'consider'
      : 'defer'

  return {
    interventionId: candidate.id,
    intervention: candidate.name,
    disposition,
    priority,
    personalFit,
    evidenceScore,
    humanOutcomeScore,
    mechanisticPlausibilityScore,
    evidenceCount: candidate.evidence.length,
    strongestEvidenceId: strongest?.id,
    riskCount,
    interactionCount,
    rationale,
  }
}
