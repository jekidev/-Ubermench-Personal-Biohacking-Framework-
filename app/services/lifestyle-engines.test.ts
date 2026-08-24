import { describe, expect, it } from 'vitest'
import { scoreNutrition, scoreSleep, scoreTraining } from './lifestyle-engines'
import { highestRisk, riskScore, findInteractions } from './interaction-engine'

describe('lifestyle engines', () => {
  it('scores sleep, training and nutrition deterministically', () => {
    expect(scoreSleep({ durationMinutes: 480, efficiency: 95, hrv: 70 }).score).toBeGreaterThan(80)
    expect(scoreTraining({ durationMinutes: 60, intensity: 80, load: 500, sessionsLast7Days: 4 }).score).toBeGreaterThan(60)
    expect(scoreNutrition({ calories: 2500, proteinGrams: 128, fiberGrams: 30, bodyWeightKg: 80 }).score).toBeGreaterThan(80)
  })

  it('filters interaction graph and returns highest risk', () => {
    const nodes = [{ id: 'a', kind: 'drug' as const, name: 'A' }, { id: 'b', kind: 'supplement' as const, name: 'B' }, { id: 'c', kind: 'gene' as const, name: 'C' }]
    const edges = [
      { from: 'a', to: 'b', mechanism: 'test', severity: 'high' as const },
      { from: 'b', to: 'c', mechanism: 'test', severity: 'low' as const },
    ]
    const active = findInteractions(nodes, edges, ['a'])
    expect(active).toHaveLength(1)
    expect(highestRisk(active)?.severity).toBe('high')
    expect(riskScore(active)).toBeGreaterThan(0.3)
  })
})
