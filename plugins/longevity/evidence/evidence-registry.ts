export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type EvidenceType = 'observation' | 'association' | 'causal' | 'hypothesis'
export type EvidenceStatus = 'active' | 'superseded' | 'needs-review' | 'insufficient-evidence'

export type EvidenceRecord = {
  id: string
  subject: string
  claim: string
  evidenceType: EvidenceType
  grade: EvidenceGrade
  status: EvidenceStatus
  source: {
    title: string
    url?: string
    publishedAt?: string
    accessedAt: string
    version: string
  }
  population?: string
  endpoint?: string
  notes?: string
  supersedes?: string
}

export const EVIDENCE_REGISTRY: EvidenceRecord[] = [
  {
    id: 'example-blood-pressure-longevity',
    subject: 'blood-pressure',
    claim: 'Blood-pressure lowering is associated with reduced cardiovascular events and mortality risk in appropriately selected populations.',
    evidenceType: 'causal',
    grade: 'A',
    status: 'needs-review',
    source: {
      title: 'Evidence placeholder — replace with reviewed source',
      accessedAt: '2026-08-24',
      version: '0.1',
    },
    notes: 'Placeholder only. Do not display as validated clinical guidance until a reviewed source is attached.',
  },
]

export function evidenceForSubject(subject: string): EvidenceRecord[] {
  return EVIDENCE_REGISTRY.filter((record) => record.subject === subject)
}
