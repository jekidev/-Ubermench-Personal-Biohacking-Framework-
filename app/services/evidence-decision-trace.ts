import type { EvidenceItem, InterventionCandidate } from '~/types/biology'
import { scoreEvidence } from './evidence-engine'

export type DecisionTraceDisposition = 'consider' | 'review' | 'defer'

export interface EvidenceDecisionTrace {
  interventionId: string
  intervention: string
  disposition: DecisionTraceDisposition
  priority: number
  personalFit: number
  evidenceScore: number
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
  const evidenceScore = candidate.evidence.length
    ? candidate.evidence.reduce((sum, item) => sum + scoreEvidence(item), 0) / candidate.evidence.length
    : 0
  const personalFit = clamp01(candidate.personalFit)
  const priority = clamp01(candidate.priority)
  const riskCount = candidate.risks.length
  const interactionCount = candidate.interactions.length
  const strongest = strongestEvidence(candidate.evidence)

  const rationale: string[] = [
    `Evidence score: ${evidenceScore.toFixed(2)} across ${candidate.evidence.length} source(s).`,
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
    evidenceCount: candidate.evidence.length,
    strongestEvidenceId: strongest?.id,
    riskCount,
    interactionCount,
    rationale,
  }
}
