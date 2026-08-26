import { describe, expect, it } from 'vitest'
import { deduplicateEvidence, resolveEvidenceIdentity } from './evidence-identity'
import type { EvidenceItem } from '~/types/biology'

const item = (id: string, title: string, source: string, url?: string): EvidenceItem => ({
  id, title, source, url, evidenceLevel: 'human-study', confidence: 0.8,
})

describe('evidence identity', () => {
  it('resolves DOI and PMID from common citation forms', () => {
    const identity = resolveEvidenceIdentity(item('x', 'Example', 'PMID: 12345678 DOI: 10.1000/Example.1'))
    expect(identity.doi).toBe('10.1000/example.1')
    expect(identity.pmid).toBe('12345678')
  })

  it('deduplicates by DOI before fallback fingerprint', () => {
    const records = [
      item('a', 'First', 'journal', 'https://doi.org/10.1000/test.1'),
      item('b', 'Same paper', 'journal', 'https://doi.org/10.1000/TEST.1'),
      item('c', 'Different', 'journal', 'https://doi.org/10.1000/test.2'),
    ]
    expect(deduplicateEvidence(records).map((record) => record.id)).toEqual(['a', 'c'])
  })
})
