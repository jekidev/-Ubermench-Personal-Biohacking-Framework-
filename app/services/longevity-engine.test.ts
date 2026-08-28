import { describe, expect, it } from 'vitest'
import { assessLongevity, rankInterventions } from './longevity-engine'
import type { InterventionCandidate, PersonalBiologyProfile } from '../types/biology'

const profile = (biomarkers: PersonalBiologyProfile['biomarkers']): PersonalBiologyProfile => ({
  version: 1,
  biomarkers,
  variants: [],
  medications: [],
  supplements: [],
  symptoms: [],
  sleep: [],
  training: [],
  goals: [],
  updatedAt: '2026-08-28T00:00:00.000Z'
})

describe('assessLongevity', () => {
  it('classifies biomarkers using supplied laboratory bounds only', () => {
    const result = assessLongevity(profile([
      { id: 'a', name: 'Marker A', value: 5, unit: 'u', measuredAt: '2026-08-28', source: 'lab-import', referenceLow: 6, referenceHigh: 10 },
      { id: 'b', name: 'Marker B', value: 8, unit: 'u', measuredAt: '2026-08-28', source: 'lab-import', referenceLow: 6, referenceHigh: 10 },
      { id: 'c', name: 'No bounds', value: 100, unit: 'u', measuredAt: '2026-08-28', source: 'manual' }
    ]))

    expect(result.signals).toHaveLength(2)
    expect(result.signals[0].direction).toBe('low')
    expect(result.priorities).toEqual(['Marker A'])
    expect(result.score).toBeLessThan(100)
  })
})

describe('rankInterventions', () => {
  it('prefers stronger evidence and personal fit while preserving input immutability', () => {
    const candidates: InterventionCandidate[] = [
      {
        id: 'weak', name: 'Weak', expectedBenefits: [], risks: [], interactions: [], personalFit: 90, priority: 50,
        evidence: [{ id: 'e1', title: 'Mechanistic', source: 'test', evidenceLevel: 'mechanistic', confidence: 80 }]
      },
      {
        id: 'strong', name: 'Strong', expectedBenefits: [], risks: [], interactions: [], personalFit: 80, priority: 50,
        evidence: [{ id: 'e2', title: 'Meta', source: 'test', evidenceLevel: 'meta-analysis', confidence: 80 }]
      }
    ]

    const result = rankInterventions(candidates)
    expect(result[0].id).toBe('strong')
    expect(candidates[0].priority).toBe(50)
    expect(candidates[1].priority).toBe(50)
  })
})
