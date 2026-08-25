import { describe, expect, it } from 'vitest'
import { appendCanonicalObservations, appendHumanState, appendInterventionEvents, emptyPersonalStateStore, latestSubjectState, loadPersonalStateStore, savePersonalStateStore, selectSubjectObservations } from './personal-state-store'

describe('personal-state-store', () => {
  it('round-trips a versioned store through Storage', () => {
    let value = ''
    const storage = {
      getItem: () => value || null,
      setItem: (_key: string, next: string) => { value = next },
    }
    const observation = { id: 'o1', subjectId: 's1', observedAt: '2026-08-25T08:00:00Z', metric: 'hrv', value: 55, unit: 'ms', source: 'wearable', quality: 1, confidence: 0.9 }
    const store = appendCanonicalObservations(emptyPersonalStateStore('2026-08-25T08:00:00Z'), [observation], '2026-08-25T08:01:00Z')
    savePersonalStateStore(storage, store)
    expect(loadPersonalStateStore(storage).observations).toHaveLength(1)
  })

  it('deduplicates observations and interventions by id', () => {
    const observation = { id: 'o1', subjectId: 's1', observedAt: '2026-08-25T08:00:00Z', metric: 'hrv', value: 55, source: 'wearable', quality: 1, confidence: 0.9 }
    const event = { id: 'e1', subjectId: 's1', name: 'x', action: 'start' as const, occurredAt: '2026-08-25T08:00:00Z' }
    let store = appendCanonicalObservations(emptyPersonalStateStore(), [observation, observation])
    store = appendInterventionEvents(store, [event, event])
    expect(store.observations).toHaveLength(1)
    expect(store.interventions).toHaveLength(1)
  })

  it('selects observations and the latest state for a subject', () => {
    const first = { version: 1 as const, subjectId: 's1', asOf: '2026-08-25T08:00:00Z', dimensions: {}, activeInterventions: [], activeExperiments: [], alerts: [] }
    const second = { ...first, asOf: '2026-08-25T09:00:00Z' }
    let store = emptyPersonalStateStore()
    store = appendHumanState(store, first)
    store = appendHumanState(store, second)
    store = appendCanonicalObservations(store, [{ id: 'o1', subjectId: 's1', observedAt: '2026-08-25T08:30:00Z', metric: 'hrv', value: 55, source: 'wearable', quality: 1, confidence: 0.9 }])
    expect(selectSubjectObservations(store, 's1')).toHaveLength(1)
    expect(latestSubjectState(store, 's1')?.asOf).toBe('2026-08-25T09:00:00Z')
  })

  it('rejects incompatible schema versions by falling back to an empty store', () => {
    const storage = { getItem: () => JSON.stringify({ schemaVersion: 99 }), setItem: () => undefined }
    expect(loadPersonalStateStore(storage).schemaVersion).toBe(1)
    expect(loadPersonalStateStore(storage).observations).toHaveLength(0)
  })
})
