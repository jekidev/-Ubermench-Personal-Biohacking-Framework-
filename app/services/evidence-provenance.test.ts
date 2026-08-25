import { describe, expect, it } from 'vitest'
import { fingerprintClaim, supersedeEvidence, versionEvidence } from './evidence-provenance'

describe('evidence-provenance', () => {
  const item = {
    id: 'e1',
    title: 'Example study',
    source: 'Europe PMC',
    evidenceLevel: 'human-study' as const,
    confidence: 0.8,
    publishedAt: '2026-01-01T00:00:00Z',
    summary: 'A structured claim',
  }

  it('creates a stable claim fingerprint', () => {
    expect(fingerprintClaim(item)).toBe(fingerprintClaim({ ...item, title: ' Example study ' }))
  })

  it('attaches retrieval provenance to an evidence item', () => {
    const versioned = versionEvidence(item, '2026-08-25T10:00:00Z', 'source-v1')
    expect(versioned.provenance.evidenceId).toBe('e1')
    expect(versioned.provenance.sourceVersion).toBe('source-v1')
    expect(versioned.provenance.retrievedAt).toBe('2026-08-25T10:00:00Z')
  })

  it('records the replaced evidence id when superseding a claim', () => {
    const current = versionEvidence(item, '2026-08-25T10:00:00Z')
    const replacement = versionEvidence({ ...item, id: 'e2', confidence: 0.9 }, '2026-08-25T11:00:00Z')
    const result = supersedeEvidence(current, replacement)
    expect(result.provenance.supersedes).toEqual(['e1'])
  })
})
