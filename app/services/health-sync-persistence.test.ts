import { describe, expect, it, vi } from 'vitest'
import type { HealthSyncOrchestrator } from './health-sync-orchestrator'
import { syncAndPersistHealth } from './health-sync-persistence'
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

function orchestrator() {
  return {
    syncAvailable: vi.fn(async () => [
      {
        provider: 'garmin' as const,
        state: 'connected' as const,
        samples: [],
        observations: [
          {
            id: 'obs-1',
            subjectId: 'subject-1',
            metric: 'heart_rate',
            value: 60,
            unit: 'bpm',
            observedAt: '2026-08-26T10:00:00.000Z',
          },
        ],
      },
      {
        provider: 'android-health-connect' as const,
        state: 'connected' as const,
        samples: [],
        observations: [
          {
            id: 'obs-2',
            subjectId: 'subject-1',
            metric: 'steps',
            value: 5000,
            unit: 'count',
            observedAt: '2026-08-26T11:00:00.000Z',
          },
        ],
      },
    ]),
  } satisfies Pick<HealthSyncOrchestrator, 'syncAvailable'>
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
})
