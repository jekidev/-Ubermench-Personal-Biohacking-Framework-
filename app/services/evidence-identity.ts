import type { EvidenceItem } from '~/types/biology'

export interface EvidenceIdentity {
  doi?: string
  pmid?: string
  fingerprint: string
}

function normalizeDoi(value: string): string | undefined {
  const match = value.match(/(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/[\-._;()/:A-Z0-9]+)(?:[\s?#]|$)/i)
  return match?.[1]?.toLowerCase().replace(/[.,;]+$/, '')
}

function normalizePmid(value: string): string | undefined {
  const match = value.match(/(?:pubmed\.ncbi\.nlm\.nih\.gov\/|pmid[:\s]*)(\d{5,10})/i)
  return match?.[1]
}

export function resolveEvidenceIdentity(item: EvidenceItem): EvidenceIdentity {
  const haystack = [item.id, item.title, item.source, item.url ?? ''].join(' ')
  const doi = normalizeDoi(haystack)
  const pmid = normalizePmid(haystack)
  const raw = `${doi ?? ''}|${pmid ?? ''}|${item.title.trim().toLowerCase()}`
  let hash = 2166136261
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return { doi, pmid, fingerprint: (hash >>> 0).toString(16).padStart(8, '0') }
}

export function deduplicateEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const identity = resolveEvidenceIdentity(item)
    const key = identity.doi ? `doi:${identity.doi}` : identity.pmid ? `pmid:${identity.pmid}` : `fingerprint:${identity.fingerprint}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
