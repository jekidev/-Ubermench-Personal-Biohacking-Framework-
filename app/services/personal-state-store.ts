import type { CanonicalObservation, HumanState, InterventionEvent } from '~/types/personal-state'

export const PERSONAL_STATE_STORAGE_KEY = 'ubermench:personal-state:v1'
export const PERSONAL_STATE_SCHEMA_VERSION = 1

export interface PersonalStateStore {
  schemaVersion: 1
  observations: CanonicalObservation[]
  interventions: InterventionEvent[]
  states: HumanState[]
  updatedAt: string
}

export function emptyPersonalStateStore(now = new Date().toISOString()): PersonalStateStore {
  return {
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    observations: [],
    interventions: [],
    states: [],
    updatedAt: now,
  }
}

function validDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

export function loadPersonalStateStore(storage: Pick<Storage, 'getItem'>): PersonalStateStore {
  const raw = storage.getItem(PERSONAL_STATE_STORAGE_KEY)
  if (!raw) return emptyPersonalStateStore()
  try {
    const parsed = JSON.parse(raw) as Partial<PersonalStateStore>
    if (parsed.schemaVersion !== PERSONAL_STATE_SCHEMA_VERSION) return emptyPersonalStateStore()
    return {
      schemaVersion: 1,
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
      states: Array.isArray(parsed.states) ? parsed.states : [],
      updatedAt: typeof parsed.updatedAt === 'string' && validDate(parsed.updatedAt) ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return emptyPersonalStateStore()
  }
}

export function savePersonalStateStore(storage: Pick<Storage, 'setItem'>, store: PersonalStateStore): void {
  storage.setItem(PERSONAL_STATE_STORAGE_KEY, JSON.stringify(store))
}

export function appendCanonicalObservations(store: PersonalStateStore, observations: CanonicalObservation[], now = new Date().toISOString()): PersonalStateStore {
  const byId = new Map(store.observations.map((item) => [item.id, item]))
  for (const observation of observations) byId.set(observation.id, observation)
  return {
    ...store,
    observations: [...byId.values()].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()),
    updatedAt: now,
  }
}

export function appendInterventionEvents(store: PersonalStateStore, events: InterventionEvent[], now = new Date().toISOString()): PersonalStateStore {
  const byId = new Map(store.interventions.map((item) => [item.id, item]))
  for (const event of events) byId.set(event.id, event)
  return { ...store, interventions: [...byId.values()], updatedAt: now }
}

export function appendHumanState(store: PersonalStateStore, state: HumanState, now = new Date().toISOString()): PersonalStateStore {
  const key = `${state.subjectId}:${state.asOf}`
  const byKey = new Map(store.states.map((item) => [`${item.subjectId}:${item.asOf}`, item]))
  byKey.set(key, state)
  return {
    ...store,
    states: [...byKey.values()].sort((a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()),
    updatedAt: now,
  }
}

export function selectSubjectObservations(store: PersonalStateStore, subjectId: string): CanonicalObservation[] {
  return store.observations.filter((item) => item.subjectId === subjectId)
}

export function latestSubjectState(store: PersonalStateStore, subjectId: string): HumanState | undefined {
  return store.states
    .filter((item) => item.subjectId === subjectId)
    .sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime())[0]
}
