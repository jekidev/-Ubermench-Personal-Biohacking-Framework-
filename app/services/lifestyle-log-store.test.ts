import { describe, expect, it } from 'vitest'
import type { SleepLog, WorkoutLog } from '~/types/lifestyle'
import {
  emptyLifestyleLogStore,
  indexLifestyleLogs,
  lifestyleLogById,
  loadLifestyleLogStore,
  mergeSleepIntoBiology,
  mergeWorkoutIntoBiology,
  parseLifestyleLog,
  removeLifestyleLog,
  saveLifestyleLogStore,
  selectLifestyleLogs,
  sleepLogToBiology,
  upsertLifestyleLog,
  workoutLogToTraining,
} from './lifestyle-log-store'

function memoryStorage(initial = ''): { getItem: () => string | null; setItem: (_key: string, next: string) => void; value: string } {
  let value = initial
  return {
    getItem: () => value || null,
    setItem: (_key: string, next: string) => { value = next },
    get value() { return value },
  }
}

const workout: WorkoutLog = {
  id: 'w1',
  kind: 'workout',
  recordedAt: '2026-09-11T07:00:00.000Z',
  activity: 'Goblet squat',
  exerciseId: 'goblet-squat',
  durationMinutes: 40,
  intensity: 7,
}

const sleep: SleepLog = {
  id: 's1',
  kind: 'sleep',
  recordedAt: '2026-09-11T05:00:00.000Z',
  durationMinutes: 430,
  quality: 8,
  notes: 'Woke once',
}

describe('lifestyle-log-store', () => {
  it('round-trips a versioned store and indexes by id', () => {
    const storage = memoryStorage()
    let store = upsertLifestyleLog(emptyLifestyleLogStore('2026-09-11T08:00:00.000Z'), workout, '2026-09-11T08:01:00.000Z')
    store = upsertLifestyleLog(store, sleep, '2026-09-11T08:02:00.000Z')
    store = upsertLifestyleLog(store, { ...workout, durationMinutes: 45 }, '2026-09-11T08:03:00.000Z')
    saveLifestyleLogStore(storage, store)
    const loaded = loadLifestyleLogStore(storage)
    expect(loaded.logs).toHaveLength(2)
    expect(lifestyleLogById(loaded, 'w1')).toMatchObject({ durationMinutes: 45 })
    expect(selectLifestyleLogs(loaded, 'sleep')).toHaveLength(1)
    expect(indexLifestyleLogs(loaded.logs)[0]?.id).toBe('w1')
  })

  it('rejects incompatible schema versions and invalid logs', () => {
    expect(loadLifestyleLogStore({ getItem: () => JSON.stringify({ schemaVersion: 99 }) }).logs).toHaveLength(0)
    expect(parseLifestyleLog({ id: 'x', kind: 'meal', recordedAt: 'nope', name: 'Oats' })).toBeUndefined()
    expect(parseLifestyleLog({ id: 'x', kind: 'meditation', recordedAt: '2026-09-11T00:00:00.000Z' })).toBeUndefined()
    expect(parseLifestyleLog({ id: 'x', kind: 'workout', recordedAt: '2026-09-11T00:00:00.000Z' })).toBeUndefined()
  })

  it('removes logs and maps sleep/workout into biology records', () => {
    let store = upsertLifestyleLog(emptyLifestyleLogStore(), workout)
    store = upsertLifestyleLog(store, sleep)
    store = removeLifestyleLog(store, 'w1')
    expect(store.logs.map((item) => item.id)).toEqual(['s1'])
    expect(sleepLogToBiology(sleep)).toMatchObject({ id: 's1', durationMinutes: 430, source: 'manual' })
    expect(workoutLogToTraining(workout)).toMatchObject({ activity: 'Goblet squat', intensity: 7 })
    expect(mergeSleepIntoBiology([{ id: 's1', recordedAt: 'old', source: 'wearable' }], sleep)).toHaveLength(1)
    expect(mergeWorkoutIntoBiology([], workout)[0]?.activity).toBe('Goblet squat')
  })
})
