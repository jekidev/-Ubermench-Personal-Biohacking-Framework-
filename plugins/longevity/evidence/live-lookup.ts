export type EvidenceLookupInput = { identifier: string }

export type EvidenceMetadata = {
  identifier: string
  source: 'pubmed' | 'crossref'
  title: string
  authors: string[]
  journal?: string
  publicationDate?: string
  doi?: string
  pmid?: string
  abstract?: string
  canonicalUrl?: string
  retrievedAt: string
}

export type EvidencePreview = {
  metadata: EvidenceMetadata
  status: 'candidate'
  evidenceLevel: null
  reviewRequired: true
  notes: string[]
}

export function normalizeIdentifier(raw: string): EvidenceLookupInput {
  const value = raw.trim()
  const doi = value.replace(/^https?:\/\/(doi\.org|dx\.doi\.org)\//i, '').replace(/^doi:\s*/i, '')
  const pmid = value.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '').replace(/\/$/, '')
  if (/^10\.\d{4,9}\/\S+$/i.test(doi)) return { identifier: `doi:${doi}` }
  if (/^\d{1,9}$/.test(pmid)) return { identifier: `pmid:${pmid}` }
  throw new Error('Enter a valid DOI or PMID.')
}

export function toPreview(metadata: EvidenceMetadata): EvidencePreview {
  return {
    metadata,
    status: 'candidate',
    evidenceLevel: null,
    reviewRequired: true,
    notes: ['Metadata was retrieved from a bibliographic source.', 'Evidence strength is not assigned automatically.', 'Human review is required before registry insertion.'],
  }
}

export function pubmedEndpoint(pmid: string): string {
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=json`
}

export function crossrefEndpoint(doi: string): string {
  return `https://api.crossref.org/v1/works/${encodeURIComponent(doi)}`
}
