import { describe, expect, it } from 'vitest'
import { aggregateEvidence, aggregateHumanOutcomeEvidence, aggregateMechanisticPlausibility, combinedEvidenceScore, scoreEvidence } from './evidence-engine'

describe('evidence engine', () => {
  it('ranks higher quality evidence above mechanistic evidence', () => {
    const human = { id: '1', title: 'Human trial', source: 'test', evidenceLevel: 'randomized-trial' as const, confidence: 0.9 }
    const mechanism = { id: '2', title: 'Mechanism', source: 'test', evidenceLevel: 'mechanistic' as const, confidence: 1 }
    expect(scoreEvidence(human)).toBeGreaterThan(scoreEvidence(mechanism))
  })

  it('returns zero for empty evidence', () => {
    expect(aggregateEvidence([])).toBe(0)
  })

  it('caps mechanistic contribution in combined score', () => {
    const mechanistic = [{ id: '1', title: 'Mechanism', source: 'test', evidenceLevel: 'mechanistic' as const, confidence: 1 }]
    expect(aggregateMechanisticPlausibility(mechanistic)).toBeLessThanOrEqual(0.15)
    expect(combinedEvidenceScore(mechanistic)).toBeLessThanOrEqual(0.15)
  })

  it('uses human outcome evidence as the dominant term', () => {
    const human = [{ id: '1', title: 'RCT', source: 'test', evidenceLevel: 'randomized-trial' as const, confidence: 0.9 }]
    expect(aggregateHumanOutcomeEvidence(human)).toBeGreaterThan(0.8)
  })
})
