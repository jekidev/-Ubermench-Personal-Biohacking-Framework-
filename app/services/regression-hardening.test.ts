import { describe, expect, it, vi } from 'vitest'
import { BackgroundSyncScheduler } from './background-sync'
import { learnOutcome } from './outcome-learning'
import { synthesizeCouncil } from './agent-council'

describe('regression hardening', () => {
  it('does not reschedule a cancelled task after its callback finishes', async () => {
    vi.useFakeTimers()
    try {
      const scheduler = new BackgroundSyncScheduler()
      let runs = 0
      scheduler.register('sync', 10, async () => { runs += 1; return 1 })
      await vi.advanceTimersByTimeAsync(10)
      scheduler.cancel('sync')
      await vi.advanceTimersByTimeAsync(100)
      expect(runs).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('interprets lower-is-better metrics in the beneficial direction', () => {
    const result = learnOutcome('CRP', [5, 5, 5], [3, 3, 3], 'lower-is-better')
    expect(result.beneficialDelta).toBeGreaterThan(0)
    expect(result.recommendation).toBe('retain-signal')
  })

  it('reports actual disagreement when council conclusions differ', () => {
    const result = synthesizeCouncil([
      { role: 'safety', provider: 'a', model: 'a', conclusion: 'Proceed', confidence: 0.6 },
      { role: 'auditor', provider: 'b', model: 'b', conclusion: 'Do not proceed', confidence: 0.9 },
    ])
    expect(result.disagreements).toEqual(['Proceed', 'Do not proceed'])
    expect(result.conclusion).toBe('Do not proceed')
  })
})
