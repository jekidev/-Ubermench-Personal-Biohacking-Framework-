export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'E'
export type EvidenceStatus = 'active' | 'needs-review' | 'insufficient-evidence' | 'superseded'

export type EvidenceRecord = {
  id: string
  subject: string
  claim: string
  evidenceLevel: EvidenceLevel
  status: EvidenceStatus
  evidenceType: 'meta-analysis' | 'systematic-review' | 'rct' | 'cohort' | 'mechanistic' | 'expert-consensus' | 'hypothesis'
  population?: string
  endpoint?: string
  sourceTitle: string
  sourceUrl?: string
  publicationDate?: string
  accessedAt: string
  version: number
  supersedes?: string
}

export function currentEvidence(records: EvidenceRecord[], subject: string): EvidenceRecord[] {
  return records
    .filter((r) => r.subject === subject && r.status === 'active')
    .sort((a, b) => b.version - a.version)
}

export function evidenceLabel(level: EvidenceLevel): string {
  return ({ A: 'High', B: 'Moderate', C: 'Limited', D: 'Very limited', E: 'Hypothesis' } as const)[level]
}
