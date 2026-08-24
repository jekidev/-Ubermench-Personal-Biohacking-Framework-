import { describe, expect, it } from 'vitest'
import { aggregateEvidence, scoreEvidence } from './evidence-engine'

describe('evidence engine', () => {
  it('ranks higher quality evidence above mechanistic evidence', () => {
    const human = { id: '1', title: 'Human trial', source: 'test', evidenceLevel: 'randomized-trial' as const, confidence: 0.9 }
    const mechanism = { id: '2', title: 'Mechanism', source: 'test', evidenceLevel: 'mechanistic' as const, confidence: 1 }
    expect(scoreEvidence(human)).toBeGreaterThan(scoreEvidence(mechanism))
  })

  it('returns zero for empty evidence', () => {
    expect(aggregateEvidence([])).toBe(0)
  })
})
