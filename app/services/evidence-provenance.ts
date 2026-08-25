import type { EvidenceItem } from '~/types/biology'

export interface EvidenceProvenance {
  evidenceId: string
  source: string
  publishedAt?: string
  retrievedAt: string
  sourceVersion?: string
  supersedes?: string[]
  supersededBy?: string
  claimFingerprint: string
}

export interface VersionedEvidenceItem extends EvidenceItem {
  provenance: EvidenceProvenance
}

export function fingerprintClaim(item: Pick<EvidenceItem, 'title' | 'source' | 'summary'>): string {
  const raw = `${item.title.trim().toLowerCase()}|${item.source.trim().toLowerCase()}|${(item.summary ?? '').trim().toLowerCase()}`
  let hash = 2166136261
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function versionEvidence(item: EvidenceItem, retrievedAt = new Date().toISOString(), sourceVersion?: string): VersionedEvidenceItem {
  return {
    ...item,
    provenance: {
      evidenceId: item.id,
      source: item.source,
      publishedAt: item.publishedAt,
      retrievedAt,
      sourceVersion,
      claimFingerprint: fingerprintClaim(item),
    },
  }
}

export function supersedeEvidence(current: VersionedEvidenceItem, replacement: VersionedEvidenceItem): VersionedEvidenceItem {
  return {
    ...replacement,
    provenance: {
      ...replacement.provenance,
      supersedes: [...(replacement.provenance.supersedes ?? []), current.id],
    },
  }
}
