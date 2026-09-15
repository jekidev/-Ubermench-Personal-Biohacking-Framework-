import { describe, expect, it, vi } from 'vitest'
import type { HealthProviderSyncResult, HealthSyncOrchestrator } from './health-sync-orchestrator'
import { persistCanonicalObservations, syncAndPersistHealth } from './health-sync-persistence'
import { PERSONAL_STATE_STORAGE_KEY } from './personal-state-store'

function storage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size },
  }
}

function orchestrator(): Pick<HealthSyncOrchestrator, 'syncAvailable'> {
  const results: HealthProviderSyncResult[] = [
    {
      provider: 'garmin',
      state: { provider: 'garmin', status: 'connected' },
      samples: [],
      observations: [
        {
          id: 'obs-1',
          subjectId: 'subject-1',
          metric: 'heart_rate',
          value: 60,
          unit: 'bpm',
          observedAt: '2026-08-26T10:00:00.000Z',
          source: 'garmin',
          quality: 1,
          confidence: 1,
        },
      ],
    },
    {
      provider: 'health-connect',
      state: { provider: 'health-connect', status: 'connected' },
      samples: [],
      observations: [
        {
          id: 'obs-2',
          subjectId: 'subject-1',
          metric: 'steps',
          value: 5000,
          unit: 'count',
          observedAt: '2026-08-26T11:00:00.000Z',
          source: 'health-connect',
          quality: 1,
          confidence: 1,
        },
      ],
    },
  ]

  return {
    syncAvailable: vi.fn(async () => results),
  }
}

describe('health sync persistence', () => {
  it('persists only canonical observations from the orchestrator', async () => {
    const store = storage()
    const result = await syncAndPersistHealth(orchestrator(), store)

    expect(result.observations.map((item) => item.id)).toEqual(['obs-1', 'obs-2'])
    expect(result.store.observations).toHaveLength(2)
    expect(JSON.parse(store.getItem(PERSONAL_STATE_STORAGE_KEY) ?? '{}').observations).toHaveLength(2)
  })

  it('is idempotent for repeated provider sync output', async () => {
    const store = storage()
    const source = orchestrator()

    await syncAndPersistHealth(source, store)
    const result = await syncAndPersistHealth(source, store)

    expect(result.store.observations.map((item) => item.id)).toEqual(['obs-1', 'obs-2'])
  })

  it('persists a single Health Connect sync without inventing samples', () => {
    const store = storage()
    const next = persistCanonicalObservations([
      {
        id: 'health-connect:hc-steps',
        subjectId: 'self',
        metric: 'steps',
        value: 8432,
        unit: 'count',
        observedAt: '2026-09-13T08:00:00.000Z',
        source: 'wearable',
        quality: 1,
        confidence: 1,
      },
    ], store)
    expect(next.observations).toHaveLength(1)
    expect(next.observations[0]?.metric).toBe('steps')
  })

  it('persists canonical Health Connect sleep and resting heart rate', () => {
    const store = storage()
    const next = persistCanonicalObservations([
      {
        id: 'health-connect:hc-sleep',
        subjectId: 'self',
        metric: 'sleep',
        value: 7.2,
        unit: 'hours',
        observedAt: '2026-09-13T06:00:00.000Z',
        source: 'wearable',
        quality: 1,
        confidence: 1,
      },
      {
        id: 'health-connect:hc-rhr',
        subjectId: 'self',
        metric: 'resting_heart_rate',
        value: 52,
        unit: 'bpm',
        observedAt: '2026-09-13T06:05:00.000Z',
        source: 'wearable',
        quality: 1,
        confidence: 1,
      },
    ], store)
    expect(next.observations.map((item) => item.metric)).toEqual(['sleep', 'resting_heart_rate'])
  })
})
