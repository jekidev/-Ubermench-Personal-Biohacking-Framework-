import { describe, expect, it } from 'vitest'
import { buildInteractionRisk } from './interaction-engine'

describe('interaction-engine', () => {
  it('aggregates direct and graph interaction risk', () => {
    const result = buildInteractionRisk([
      { id: 'm1', name: 'warfarin', active: true },
    ], [
      { id: 's1', name: 'fish oil', active: true },
    ], [
      { id: 'm1', kind: 'drug', name: 'warfarin' },
      { id: 's1', kind: 'supplement', name: 'fish oil' },
    ], [
      { from: 'm1', to: 's1', mechanism: 'bleeding', severity: 'moderate' },
    ])
    expect(result.score).toBeGreaterThan(0)
    expect(result.flags[0]?.severity).toBe('caution')
    expect(result.highest?.severity).toBe('moderate')
  })
})
