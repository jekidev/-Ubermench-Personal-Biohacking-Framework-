import type { EvidenceItem } from '~/types/biology'
import type { ResearchHit } from './research-engine'
import { extractEvidenceClaims, highestClaimUncertainty } from './evidence-claims'
import { deduplicateEvidence, resolveEvidenceIdentity } from './evidence-identity'

export type NormalizedEvidenceRecord = EvidenceItem & {
  doi?: string
  pmid?: string
  retrievedAt: string
  reviewRequired: boolean
  claimUncertainty: 'high' | 'medium' | 'low'
  mechanisticOnly: boolean
  retracted?: boolean
  retractionNotice?: string
}

const STORAGE_KEY = 'ubermench.evidence.records.v1'

export function normalizeResearchHit(hit: ResearchHit, retrievedAt: string): NormalizedEvidenceRecord {
  const item: EvidenceItem = {
    id: hit.doi ? `doi:${hit.doi}` : `pmid:${hit.id}`,
    title: hit.title,
    source: hit.source,
    url: hit.url,
    evidenceLevel: 'observational',
    confidence: 0.35,
    publishedAt: hit.publishedAt,
    summary: hit.abstract,
  }
  const identity = resolveEvidenceIdentity(item)
  const claims = extractEvidenceClaims({ title: item.title, summary: item.summary, evidenceLevel: item.evidenceLevel })
  return {
    ...item,
    doi: identity.doi,
    pmid: identity.pmid,
    retrievedAt,
    reviewRequired: true,
    claimUncertainty: highestClaimUncertainty(claims),
    mechanisticOnly: false,
  }
}

export function loadEvidenceStore(): NormalizedEvidenceRecord[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as NormalizedEvidenceRecord[] : []
  } catch {
    return []
  }
}

export function saveEvidenceStore(records: NormalizedEvidenceRecord[]): void {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function evidenceMergeKey(record: NormalizedEvidenceRecord): string {
  const identity = resolveEvidenceIdentity(record)
  if (identity.doi) return `doi:${identity.doi}`
  if (identity.pmid) return `pmid:${identity.pmid}`
  return `id:${record.id}`
}

export function persistNormalizedEvidence(records: NormalizedEvidenceRecord[]): NormalizedEvidenceRecord[] {
  const byKey = new Map<string, NormalizedEvidenceRecord>()
  for (const record of [...loadEvidenceStore(), ...records]) {
    const key = evidenceMergeKey(record)
    const existing = byKey.get(key)
    if (!existing || record.retrievedAt >= existing.retrievedAt) {
      byKey.set(key, record)
    }
  }
  const next = [...byKey.values()]
  saveEvidenceStore(next)
  return next
}

export function normalizeEuropePmcResults(hits: ResearchHit[], retrievedAt: string): NormalizedEvidenceRecord[] {
  const records = hits.map((hit) => normalizeResearchHit(hit, retrievedAt))
  const unique = deduplicateEvidence(records.map((record) => ({
    id: record.id,
    title: record.title,
    source: record.source,
    url: record.url,
    evidenceLevel: record.evidenceLevel,
    confidence: record.confidence,
    publishedAt: record.publishedAt,
    summary: record.summary,
  })))
  const byId = new Map(records.map((record) => [record.id, record]))
  return unique.map((item) => byId.get(item.id)!)
}
