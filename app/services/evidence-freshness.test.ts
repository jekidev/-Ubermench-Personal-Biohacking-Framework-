import { describe, expect, it } from 'vitest'
import { evidenceFreshness, rankEvidenceRecords } from './evidence-freshness'
import type { EvidenceItem } from '~/types/biology'

const now = new Date('2026-09-06T00:00:00.000Z')

function item(partial: Partial<EvidenceItem> & Pick<EvidenceItem, 'id' | 'title'>): EvidenceItem {
  return {
    source: 'test',
    evidenceLevel: 'observational',
    confidence: 0.4,
    ...partial,
  }
}

describe('evidence freshness and ranking', () => {
  it('bands publication dates into current, aging and stale', () => {
    expect(evidenceFreshness('2025-09-01', now).band).toBe('current')
    expect(evidenceFreshness('2023-01-01', now).band).toBe('aging')
    expect(evidenceFreshness('2018-01-01', now).band).toBe('stale')
    expect(evidenceFreshness(undefined, now).band).toBe('unknown')
  })

  it('ranks human outcome evidence above mechanistic and prefers fresher ties', () => {
    const ranked = rankEvidenceRecords([
      item({ id: 'old-rct', title: 'Old RCT', evidenceLevel: 'randomized-trial', confidence: 0.9, publishedAt: '2015-01-01' }),
      item({ id: 'fresh-rct', title: 'Fresh RCT', evidenceLevel: 'randomized-trial', confidence: 0.9, publishedAt: '2026-01-01' }),
      item({ id: 'mechanism', title: 'Mechanism', evidenceLevel: 'mechanistic', confidence: 1, publishedAt: '2026-06-01' }),
    ], now)

    expect(ranked[0]?.record.id).toBe('fresh-rct')
    expect(ranked[0]?.evidenceKind).toBe('human-outcome')
    expect(ranked[1]?.record.id).toBe('old-rct')
    expect(ranked[2]?.evidenceKind).toBe('mechanistic')
  })
})
