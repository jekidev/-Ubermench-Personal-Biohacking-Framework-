import type { AuditFinding } from '~/types/core'
import type { EvidenceItem, InterventionCandidate } from '~/types/biology'

export interface AuditInput {
  evidence: EvidenceItem[]
  interventions: InterventionCandidate[]
  safetyFlags: Array<{ severity: 'green' | 'yellow' | 'orange' | 'red'; code: string; requiresReview: boolean }>
  dataCompleteness?: number
}

export function auditRecommendation(input: AuditInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  const evidence = input.evidence
  const humanEvidence = evidence.filter((item) => ['meta-analysis', 'randomized-trial', 'human-study'].includes(item.evidenceLevel))

  if (!evidence.length) {
    findings.push({ id: 'audit-no-evidence', category: 'evidence', severity: 'critical', message: 'No evidence items are attached to the recommendation.', blocking: true })
  } else if (!humanEvidence.length) {
    findings.push({ id: 'audit-no-human-evidence', category: 'evidence', severity: 'warning', message: 'Evidence is mechanistic, animal, in-silico or expert-only; human evidence is absent.', blocking: false })
  }

  const redSafety = input.safetyFlags.filter((flag) => flag.severity === 'red')
  if (redSafety.length) {
    findings.push({ id: 'audit-red-safety', category: 'safety', severity: 'critical', message: `${redSafety.length} red safety rule(s) require review before proceeding.`, blocking: true })
  } else if (input.safetyFlags.some((flag) => flag.requiresReview)) {
    findings.push({ id: 'audit-safety-review', category: 'safety', severity: 'warning', message: 'Safety rules require review before action.', blocking: false })
  }

  if (input.dataCompleteness !== undefined && input.dataCompleteness < 0.7) {
    findings.push({ id: 'audit-data-quality', category: 'data-quality', severity: 'warning', message: 'Personal data completeness is below 70%; personalization confidence should be reduced.', blocking: false })
  }

  if (input.interventions.length > 1 && input.interventions.every((item) => item.personalFit < 0.4)) {
    findings.push({ id: 'audit-personalization', category: 'personalization', severity: 'warning', message: 'No candidate has strong personal-fit evidence.', blocking: false })
  }

  findings.push({ id: 'audit-causality', category: 'causality', severity: 'info', message: 'Association is not causation; individual response should be evaluated with a prospective experiment where feasible.', blocking: false })
  return findings
}
