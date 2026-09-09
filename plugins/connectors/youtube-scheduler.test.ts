import { describe, expect, it } from 'vitest'
import { isYouTubeSchedulerDue, loadYouTubeSchedulerStore, saveYouTubeSchedulerStore } from './youtube-scheduler'

describe('youtube-scheduler', () => {
  it('is due when enabled and never run', () => {
    const store = { schemaVersion: 1 as const, enabled: true, intervalHours: 168, sources: [] }
    expect(isYouTubeSchedulerDue(store)).toBe(true)
  })

  it('persists scheduler store', () => {
    const storage = new Map<string, string>()
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    saveYouTubeSchedulerStore({ schemaVersion: 1, enabled: true, intervalHours: 24, sources: [] }, store)
    expect(loadYouTubeSchedulerStore(store).intervalHours).toBe(24)
  })
})
