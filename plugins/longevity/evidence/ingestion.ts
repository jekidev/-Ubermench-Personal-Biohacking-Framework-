export type EvidenceIdentifier = {
  pmid?: string
  doi?: string
  url?: string
}

export type EvidenceSource = {
  title: string
  authors?: string[]
  journal?: string
  publicationDate?: string
  identifiers: EvidenceIdentifier
}

export type EvidenceIngestionRecord = {
  id: string
  subject: string
  claim: string
  source: EvidenceSource
  importedAt: string
  sourceFingerprint: string
  status: 'candidate' | 'confirmed' | 'superseded' | 'rejected'
  supersedesId?: string
}

function normalizeDoi(doi?: string): string | undefined {
  if (!doi) return undefined
  return doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase()
}

function normalizePmid(pmid?: string): string | undefined {
  if (!pmid) return undefined
  const match = pmid.match(/\d+/)
  return match?.[0]
}

export function normalizeIdentifiers(ids: EvidenceIdentifier): EvidenceIdentifier {
  return { pmid: normalizePmid(ids.pmid), doi: normalizeDoi(ids.doi), url: ids.url?.trim() || undefined }
}

export function evidenceDedupKey(source: EvidenceSource): string {
  const ids = normalizeIdentifiers(source.identifiers)
  return ids.doi ? `doi:${ids.doi}` : ids.pmid ? `pmid:${ids.pmid}` : `title:${source.title.trim().toLowerCase()}`
}

export function isDuplicateEvidence(records: EvidenceIngestionRecord[], source: EvidenceSource): boolean {
  const key = evidenceDedupKey(source)
  return records.some((record) => evidenceDedupKey(record.source) === key)
}

export function supersede(oldRecord: EvidenceIngestionRecord, replacementId: string): EvidenceIngestionRecord {
  return { ...oldRecord, status: 'superseded', supersedesId: replacementId }
}
