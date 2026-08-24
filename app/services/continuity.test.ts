import { describe, expect, it } from 'vitest'
import { BackgroundSyncScheduler } from './background-sync'
import { calibrateDigitalTwin } from './digital-twin-calibration'
import { InMemoryOutcomeStore } from './outcome-store'

const profile = {
  version: 1 as const,
  biomarkers: [], variants: [], medications: [], supplements: [], symptoms: [], sleep: [], training: [], goals: ['longevity'], updatedAt: '2026-08-24T00:00:00.000Z',
}

describe('continuity layer', () => {
  it('stores and returns cloned outcomes', async () => {
    const store = new InMemoryOutcomeStore()
    await store.save({ id: 'o1', intervention: 'test', metric: 'HRV', baseline: [40], observed: [45], createdAt: '2026-08-24T00:00:00.000Z' })
    const item = await store.get('o1')
    expect(item?.metric).toBe('HRV')
    expect(item).not.toBe(await store.get('missing'))
  })

  it('calibrates the twin only from usable estimates', () => {
    const estimate = { metric: 'HRV', intervention: 'training', delta: 5, confidence: 'high' as const }
    const result = calibrateDigitalTwin(profile, [estimate])
    expect(result.version).toBe(1)
    expect(result.adjustments[0]?.target).toBe('HRV')
  })

  it('registers and cancels sync tasks', () => {
    const scheduler = new BackgroundSyncScheduler()
    const task = scheduler.register('health', 60_000, async () => 1)
    expect(task.id).toBe('health')
    scheduler.cancel('health')
    scheduler.clear()
  })
})
