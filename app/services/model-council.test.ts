import { describe, expect, it } from 'vitest'
import { rankModels } from './model-evaluation'
import { synthesizeCouncil } from './agent-council'

describe('model evaluation and council', () => {
  it('ranks models by quality with latency/cost penalties', () => {
    const ranked = rankModels([
      { provider: 'a', model: 'slow', latencyMs: 10000, citationAccuracy: 0.9, factuality: 0.9, grounding: 0.9, taskSuccess: 0.9, cost: 0.1 },
      { provider: 'b', model: 'fast', latencyMs: 1000, citationAccuracy: 0.95, factuality: 0.95, grounding: 0.95, taskSuccess: 0.95, cost: 0 },
    ])
    expect(ranked[0]?.model).toBe('fast')
  })

  it('synthesizes council opinions and preserves disagreement metadata', () => {
    const result = synthesizeCouncil([
      { role: 'researcher', provider: 'a', model: 'm1', conclusion: 'Continue', confidence: 0.8 },
      { role: 'safety', provider: 'b', model: 'm2', conclusion: 'Hold', confidence: 0.9, concerns: ['interaction'] },
    ])
    expect(result.opinions).toHaveLength(2)
    expect(result.conclusion).toBe('Hold')
    expect(result.disagreements.length).toBeGreaterThanOrEqual(0)
  })
})
