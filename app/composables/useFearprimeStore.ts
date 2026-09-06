export type MemoryTarget = {
  id: string
  label: string
  threatPrediction?: string
  safetyRule?: string
  createdAt: string
  status: 'untested' | 'active' | 'learning' | 'retained' | 'generalised' | 'stable' | 'reassess'
}

export type FearprimeEvent = {
  id: string
  type: 'memory_target' | 'prediction_lock' | 'learning_event' | 'follow_up' | 'daily_state'
  timestamp: string
  payload: Record<string, unknown>
  schemaVersion: string
}

const EVENTS_KEY = 'fearprime:events'
const MEMORY_KEY = 'fearprime:memoryTargets'

function browserGet<T>(key: string, fallback: T): T {
  if (!import.meta.client) return fallback
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function browserSet<T>(key: string, value: T) {
  if (import.meta.client) localStorage.setItem(key, JSON.stringify(value))
}

export function useFearprimeStore() {
  async function loadEvents(): Promise<FearprimeEvent[]> {
    return browserGet<FearprimeEvent[]>(EVENTS_KEY, [])
  }

  async function saveEvents(events: FearprimeEvent[]) {
    browserSet(EVENTS_KEY, events)
  }

  async function appendEvent(event: FearprimeEvent) {
    const events = await loadEvents()
    await saveEvents([...events, event])
    return event
  }

  async function listMemoryTargets(): Promise<MemoryTarget[]> {
    return browserGet<MemoryTarget[]>(MEMORY_KEY, [])
  }

  async function createMemoryTarget(input: Omit<MemoryTarget, 'id' | 'createdAt'>) {
    const target: MemoryTarget = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const targets = await listMemoryTargets()
    browserSet(MEMORY_KEY, [...targets, target])
    await appendEvent({ id: crypto.randomUUID(), type: 'memory_target', timestamp: target.createdAt, payload: target, schemaVersion: '1.1' })
    return target
  }

  async function listPendingFollowUps() {
    const events = await loadEvents()
    return events
      .filter((event) => event.type === 'follow_up')
      .map((event) => ({ id: event.id, timestamp: event.timestamp, ...(event.payload as Record<string, unknown>) }))
      .filter((followUp) => (followUp as Record<string, unknown>).status === 'pending')
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
  }

  async function saveDailyState(payload: Record<string, unknown>) {
    return appendEvent({
      id: crypto.randomUUID(),
      type: 'daily_state',
      timestamp: new Date().toISOString(),
      payload,
      schemaVersion: '1.1',
    })
  }

  return {
    loadEvents,
    appendEvent,
    listMemoryTargets,
    createMemoryTarget,
    listPendingFollowUps,
    saveDailyState,
  }
}
