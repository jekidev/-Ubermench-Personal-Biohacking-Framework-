import type { SleepRecord, TrainingRecord } from '~/types/biology'
import type {
  LifestyleKind,
  LifestyleLog,
  MealLog,
  MeditationLog,
  MealType,
  SleepLog,
  WorkoutLog,
} from '~/types/lifestyle'
import { LIFESTYLE_KINDS, MEAL_TYPES } from '~/types/lifestyle'

export const LIFESTYLE_LOG_STORAGE_KEY = 'ubermench:lifestyle-logs:v1'
export const LIFESTYLE_LOG_SCHEMA_VERSION = 1

export interface LifestyleLogStore {
  schemaVersion: 1
  logs: LifestyleLog[]
  updatedAt: string
}

export function emptyLifestyleLogStore(now = new Date().toISOString()): LifestyleLogStore {
  return {
    schemaVersion: LIFESTYLE_LOG_SCHEMA_VERSION,
    logs: [],
    updatedAt: now,
  }
}

function validDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

export function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function optionalFinite(value: unknown): number | undefined {
  return asFiniteNumber(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && (MEAL_TYPES as readonly string[]).includes(value)
}

export function isLifestyleKind(value: unknown): value is LifestyleKind {
  return typeof value === 'string' && (LIFESTYLE_KINDS as readonly string[]).includes(value)
}

export function parseLifestyleLog(value: unknown): LifestyleLog | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string' || !record.id.trim()) return undefined
  if (!isLifestyleKind(record.kind)) return undefined
  if (typeof record.recordedAt !== 'string' || !validDate(record.recordedAt)) return undefined

  const base = {
    id: record.id.trim(),
    recordedAt: record.recordedAt,
    notes: optionalString(record.notes),
  }

  switch (record.kind) {
    case 'workout': {
      const activity = optionalString(record.activity)
      if (!activity) return undefined
      return {
        ...base,
        kind: 'workout',
        activity,
        exerciseId: optionalString(record.exerciseId),
        durationMinutes: optionalFinite(record.durationMinutes),
        intensity: optionalFinite(record.intensity),
      } satisfies WorkoutLog
    }
    case 'sleep':
      return {
        ...base,
        kind: 'sleep',
        durationMinutes: optionalFinite(record.durationMinutes),
        quality: optionalFinite(record.quality),
      } satisfies SleepLog
    case 'meal': {
      const name = optionalString(record.name)
      if (!name) return undefined
      return {
        ...base,
        kind: 'meal',
        name,
        mealType: isMealType(record.mealType) ? record.mealType : undefined,
        calories: optionalFinite(record.calories),
      } satisfies MealLog
    }
    case 'meditation': {
      const durationMinutes = optionalFinite(record.durationMinutes)
      if (durationMinutes === undefined) return undefined
      return {
        ...base,
        kind: 'meditation',
        durationMinutes,
      } satisfies MeditationLog
    }
    default: {
      const _exhaustive: never = record.kind
      return _exhaustive
    }
  }
}

export function loadLifestyleLogStore(storage: Pick<Storage, 'getItem'>): LifestyleLogStore {
  const raw = storage.getItem(LIFESTYLE_LOG_STORAGE_KEY)
  if (!raw) return emptyLifestyleLogStore()
  try {
    const parsed = JSON.parse(raw) as Partial<LifestyleLogStore>
    if (parsed.schemaVersion !== LIFESTYLE_LOG_SCHEMA_VERSION) return emptyLifestyleLogStore()
    const logs = Array.isArray(parsed.logs)
      ? parsed.logs.map(parseLifestyleLog).filter((item): item is LifestyleLog => Boolean(item))
      : []
    return {
      schemaVersion: 1,
      logs: indexLifestyleLogs(logs),
      updatedAt: typeof parsed.updatedAt === 'string' && validDate(parsed.updatedAt)
        ? parsed.updatedAt
        : new Date().toISOString(),
    }
  } catch {
    return emptyLifestyleLogStore()
  }
}

export function saveLifestyleLogStore(storage: Pick<Storage, 'setItem'>, store: LifestyleLogStore): void {
  storage.setItem(LIFESTYLE_LOG_STORAGE_KEY, JSON.stringify(store))
}

export function indexLifestyleLogs(logs: LifestyleLog[]): LifestyleLog[] {
  const byId = new Map<string, LifestyleLog>()
  for (const log of logs) byId.set(log.id, log)
  return [...byId.values()].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
}

export function upsertLifestyleLog(
  store: LifestyleLogStore,
  log: LifestyleLog,
  now = new Date().toISOString(),
): LifestyleLogStore {
  const parsed = parseLifestyleLog(log)
  if (!parsed) throw new Error('Lifestyle log failed validation')
  return {
    ...store,
    logs: indexLifestyleLogs([...store.logs, parsed]),
    updatedAt: now,
  }
}

export function removeLifestyleLog(
  store: LifestyleLogStore,
  id: string,
  now = new Date().toISOString(),
): LifestyleLogStore {
  return {
    ...store,
    logs: store.logs.filter((item) => item.id !== id),
    updatedAt: now,
  }
}

export function selectLifestyleLogs(store: LifestyleLogStore, kind: LifestyleKind): LifestyleLog[] {
  return store.logs.filter((item) => item.kind === kind)
}

export function lifestyleLogById(store: LifestyleLogStore, id: string): LifestyleLog | undefined {
  return store.logs.find((item) => item.id === id)
}

export function sleepLogToBiology(log: SleepLog): SleepRecord {
  return {
    id: log.id,
    recordedAt: log.recordedAt,
    durationMinutes: log.durationMinutes,
    source: 'manual',
  }
}

export function workoutLogToTraining(log: WorkoutLog): TrainingRecord {
  return {
    id: log.id,
    recordedAt: log.recordedAt,
    activity: log.activity,
    durationMinutes: log.durationMinutes,
    intensity: log.intensity,
  }
}

export function mergeSleepIntoBiology(existing: SleepRecord[], log: SleepLog): SleepRecord[] {
  const next = sleepLogToBiology(log)
  return [...existing.filter((item) => item.id !== log.id), next]
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
}

export function mergeWorkoutIntoBiology(existing: TrainingRecord[], log: WorkoutLog): TrainingRecord[] {
  const next = workoutLogToTraining(log)
  return [...existing.filter((item) => item.id !== log.id), next]
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
}
