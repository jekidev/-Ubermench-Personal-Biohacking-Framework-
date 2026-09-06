import { describe, expect, it } from 'vitest'
import type { EvidenceItem } from '~/types/biology'
import { makeCandidate, rankInterventions } from './intervention-engine'
import { emptyBiologyProfile } from './biology-store'

describe('intervention engine', () => {
  it('ranks human-outcome evidence above mechanistic-only evidence at equal personal fit', () => {
    const humanEvidence: EvidenceItem[] = [{
      id: 'rct-1',
      title: 'RCT',
      source: 'test',
      evidenceLevel: 'randomized-trial',
      confidence: 0.9,
    }]
    const mechanisticEvidence: EvidenceItem[] = [{
      id: 'mech-1',
      title: 'Mechanism',
      source: 'test',
      evidenceLevel: 'mechanistic',
      confidence: 1,
    }]

    const ranked = rankInterventions(emptyBiologyProfile(), [
      makeCandidate('Mechanistic only', mechanisticEvidence, 0.8),
      makeCandidate('Human outcome', humanEvidence, 0.8),
    ])

    expect(ranked[0]?.name).toBe('Human outcome')
    expect(ranked[0]?.priority).toBeGreaterThan(ranked[1]?.priority ?? 0)
  })
})
