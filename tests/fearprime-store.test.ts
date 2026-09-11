import { describe, expect, it, beforeEach } from 'vitest'
import { useFearprimeStore } from '../app/composables/useFearprimeStore'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}

describe('useFearprimeStore', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  })

  it('provides methods to create memory targets and list them', async () => {
    const store = useFearprimeStore()
    const targetsBefore = await store.listMemoryTargets()
    expect(Array.isArray(targetsBefore)).toBe(true)

    const created = await store.createMemoryTarget({
      label: 'Spider confrontation',
      threatPrediction: 'Immediate attack',
      safetyRule: 'Spiders are harmless in this controlled room',
      status: 'active',
    })

    expect(created.id).toBeDefined()
    expect(created.label).toBe('Spider confrontation')
    expect(created.status).toBe('active')

    const targetsAfter = await store.listMemoryTargets()
    expect(targetsAfter.some((t) => t.id === created.id)).toBe(true)
  })

  it('saves daily state events', async () => {
    const store = useFearprimeStore()
    const event = await store.saveDailyState({
      fear: 3,
      sleepQuality: 8,
      hyperarousal: 2,
    })

    expect(event.type).toBe('daily_state')
    expect(event.payload).toMatchObject({ fear: 3, sleepQuality: 8 })

    const events = await store.loadEvents()
    expect(events.some((e) => e.id === event.id)).toBe(true)
  })

  it('lists pending follow-ups filtered by status pending', async () => {
    const store = useFearprimeStore()
    await store.appendEvent({
      id: 'fu-1',
      type: 'follow_up',
      timestamp: '2026-09-11T10:00:00.000Z',
      payload: { timepoint: '24h', status: 'pending' },
      schemaVersion: '1.1',
    })
    await store.appendEvent({
      id: 'fu-2',
      type: 'follow_up',
      timestamp: '2026-09-11T11:00:00.000Z',
      payload: { timepoint: '7d', status: 'completed' },
      schemaVersion: '1.1',
    })

    const pending = await store.listPendingFollowUps()
    expect(pending.length).toBe(1)
    expect(pending[0]?.id).toBe('fu-1')
  })
})
