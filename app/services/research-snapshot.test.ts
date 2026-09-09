import { describe, expect, it } from 'vitest'
import type { NormalizedEvidenceRecord } from './evidence-normalizer'
import { createResearchSnapshot, parseResearchSnapshot, persistResearchSnapshot } from './research-snapshot'

function record(partial: Partial<NormalizedEvidenceRecord> = {}): NormalizedEvidenceRecord {
  return {
    id: 'doi:10.1000/example',
    title: 'Metformin may be associated with lower HbA1c in adults.',
    source: 'europe-pmc',
    evidenceLevel: 'observational',
    confidence: 0.4,
    publishedAt: '2024-01-01',
    summary: 'Metformin may be associated with lower HbA1c in adults.',
    retrievedAt: '2026-09-07T00:00:00.000Z',
    reviewRequired: true,
    claimUncertainty: 'high',
    mechanisticOnly: false,
    doi: '10.1000/example',
    ...partial,
  }
}

describe('research snapshot', () => {
  it('creates a checksummed snapshot with claims and retraction counts', async () => {
    const snapshot = await createResearchSnapshot([
      record(),
      record({
        id: 'doi:10.1000/retracted',
        doi: '10.1000/retracted',
        title: 'Withdrawn vitamin study',
        retracted: true,
        retractionNotice: 'Retracted.',
      }),
    ], { query: 'metformin hba1c', createdAt: '2026-09-07T12:00:00.000Z' })

    expect(snapshot.format).toBe('ubermench-research-snapshot')
    expect(snapshot.recordCount).toBe(2)
    expect(snapshot.retractedCount).toBe(1)
    expect(snapshot.claims.length).toBeGreaterThan(0)
    expect(snapshot.checksum).toHaveLength(64)
    await expect(parseResearchSnapshot(JSON.stringify(snapshot))).resolves.toMatchObject({ checksum: snapshot.checksum })
  })

  it('rejects tampered snapshot checksums', async () => {
    const snapshot = await createResearchSnapshot([record()], { createdAt: '2026-09-07T12:00:00.000Z' })
    snapshot.checksum = '0'.repeat(64)
    await expect(parseResearchSnapshot(JSON.stringify(snapshot))).rejects.toThrow(/checksum/i)
  })

  it('persists snapshots in insertion order without dropping the newest', async () => {
    const storage = new Map<string, string>()
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
    }
    const first = await createResearchSnapshot([record({ id: 'a' })], { createdAt: '2026-09-07T12:00:00.000Z' })
    const second = await createResearchSnapshot([record({ id: 'b' })], { createdAt: '2026-09-07T13:00:00.000Z' })
    persistResearchSnapshot(first, store)
    const saved = persistResearchSnapshot(second, store)
    expect(saved.map((item) => item.createdAt)).toEqual(['2026-09-07T13:00:00.000Z', '2026-09-07T12:00:00.000Z'])
  })
})
