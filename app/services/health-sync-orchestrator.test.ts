import { describe, expect, it, vi } from 'vitest'
import type { ExternalHealthSample } from './health-data-adapters'
import type { HealthProviderAdapter } from './health-provider-lifecycle'
import { HealthSyncOrchestrator } from './health-sync-orchestrator'

function adapter(samples: ExternalHealthSample[]): HealthProviderAdapter {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getStatus: vi.fn(async () => 'connected' as const),
    sync: vi.fn(async () => samples),
  }
}

describe('health sync orchestrator', () => {
  it('normalizes only supported Garmin metrics', async () => {
    const result = new HealthSyncOrchestrator({
      platform: 'desktop',
      subjectId: 'subject-1',
      adapters: {
        garmin: adapter([
          { id: 'hr-1', metric: 'heart-rate', value: 62, unit: 'bpm', recordedAt: '2026-08-26T08:00:00.000Z', source: 'garmin' },
          { id: 'temp-1', metric: 'temperature', value: 36.7, unit: 'C', recordedAt: '2026-08-26T08:00:00.000Z', source: 'garmin' },
        ]),
      },
    }).syncProvider('garmin')

    const resolved = await result
    expect(resolved.samples).toHaveLength(1)
    expect(resolved.samples[0]?.metric).toBe('heart-rate')
    expect(resolved.observations[0]?.subjectId).toBe('subject-1')
  })

  it('does not expose Android Health Connect on desktop', () => {
    const orchestrator = new HealthSyncOrchestrator({
      platform: 'desktop',
      subjectId: 'subject-1',
      adapters: { 'health-connect': adapter([]) },
    })

    expect(orchestrator.listAvailableProviders()).toEqual([])
  })

  it('syncs every configured product-supported provider deterministically', async () => {
    const orchestrator = new HealthSyncOrchestrator({
      platform: 'android',
      subjectId: 'subject-1',
      adapters: {
        garmin: adapter([
          { id: 'g-1', metric: 'steps', value: 1000, recordedAt: '2026-08-26T08:00:00.000Z', source: 'garmin' },
        ]),
        'health-connect': adapter([
          { id: 'hc-1', metric: 'hrv', value: 48, unit: 'ms', recordedAt: '2026-08-26T09:00:00.000Z', source: 'health-connect' },
        ]),
      },
    })

    const results = await orchestrator.syncAvailable()
    expect(results.map((result) => result.provider)).toEqual(['health-connect', 'garmin'])
    expect(results.flatMap((result) => result.observations)).toHaveLength(2)
  })
})
