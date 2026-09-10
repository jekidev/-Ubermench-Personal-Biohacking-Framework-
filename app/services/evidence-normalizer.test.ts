import { describe, expect, it, vi } from 'vitest'
import { normalizeEuropePmcResults, normalizeResearchHit, persistNormalizedEvidence, type NormalizedEvidenceRecord } from './evidence-normalizer'

describe('evidence normalizer', () => {
  it('normalizes Europe PMC hits into durable records', () => {
    const record = normalizeResearchHit({
      id: '12345',
      title: 'NAD+ and mitochondrial function',
      source: 'europe-pmc',
      doi: '10.1000/example',
      abstract: 'Mechanistic review.',
      publishedAt: '2024-01-01',
      url: 'https://example.org/paper',
    }, '2026-09-06T00:00:00.000Z')

    expect(record.id).toBe('doi:10.1000/example')
    expect(record.reviewRequired).toBe(true)
    expect(record.claimUncertainty).toBe('high')
    expect(record.retrievedAt).toBe('2026-09-06T00:00:00.000Z')
  })

  it('deduplicates normalized Europe PMC batches by DOI', () => {
    const hits = [
      { id: '1', title: 'Paper A', source: 'europe-pmc' as const, doi: '10.1000/a' },
      { id: '2', title: 'Paper A duplicate', source: 'europe-pmc' as const, doi: '10.1000/a' },
    ]
    const records = normalizeEuropePmcResults(hits, '2026-09-06T00:00:00.000Z')
    expect(records).toHaveLength(1)
    expect(records[0]?.doi).toBe('10.1000/a')
  })

  it('merges persisted evidence by DOI and keeps the newest retrieval', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
    })

    const older: NormalizedEvidenceRecord = {
      id: 'pmid:111',
      title: 'Paper A',
      source: 'europe-pmc',
      evidenceLevel: 'observational',
      confidence: 0.3,
      doi: '10.1000/a',
      retrievedAt: '2026-09-01T00:00:00.000Z',
      reviewRequired: true,
      claimUncertainty: 'high',
      mechanisticOnly: false,
    }
    const newer: NormalizedEvidenceRecord = {
      ...older,
      id: 'doi:10.1000/a',
      title: 'Paper A updated title',
      retrievedAt: '2026-09-08T00:00:00.000Z',
    }

    persistNormalizedEvidence([older])
    const merged = persistNormalizedEvidence([newer])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.title).toBe('Paper A updated title')
    expect(merged[0]?.retrievedAt).toBe('2026-09-08T00:00:00.000Z')

    vi.unstubAllGlobals()
  })
})
