import catalog from './exercises.catalog.json'

export type ExerciseRecord = {
  id: string
  name: string
  category: string
  bodyPart: string
  equipment: string
  target: string
  muscleGroup: string
  secondaryMuscles: string[]
  instructionsEn: string
  stepsEn: string[]
  source: string
  attribution: string
}

export type ExerciseCatalog = {
  schemaVersion: 1
  source: string
  license: string
  count: number
  exercises: ExerciseRecord[]
}

function isExercise(value: unknown): value is ExerciseRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.name === 'string'
    && typeof record.category === 'string'
    && typeof record.equipment === 'string'
    && typeof record.instructionsEn === 'string'
    && Array.isArray(record.secondaryMuscles)
    && Array.isArray(record.stepsEn)
}

export function loadExerciseCatalog(payload: unknown = catalog): ExerciseCatalog {
  if (!payload || typeof payload !== 'object') throw new Error('Exercise catalog must be an object')
  const record = payload as Record<string, unknown>
  if (record.schemaVersion !== 1) throw new Error('Unsupported exercise catalog version')
  if (!Array.isArray(record.exercises)) throw new Error('Exercise catalog is missing exercises')
  const exercises = record.exercises.filter(isExercise)
  if (!exercises.length) throw new Error('Exercise catalog is empty')
  return {
    schemaVersion: 1,
    source: typeof record.source === 'string' ? record.source : 'hasaneyldrm/exercises-dataset',
    license: typeof record.license === 'string' ? record.license : 'MIT metadata only',
    count: exercises.length,
    exercises,
  }
}

export function listExercisesByEquipment(equipment: string, payload?: unknown): ExerciseRecord[] {
  const needle = equipment.trim().toLowerCase()
  if (!needle) throw new Error('Equipment filter is required')
  return loadExerciseCatalog(payload).exercises.filter((exercise) => exercise.equipment.toLowerCase() === needle)
}

export function listExercisesByCategory(category: string, payload?: unknown): ExerciseRecord[] {
  const needle = category.trim().toLowerCase()
  if (!needle) throw new Error('Category filter is required')
  return loadExerciseCatalog(payload).exercises.filter((exercise) => exercise.category.toLowerCase() === needle)
}

export function searchExercises(term: string, payload?: unknown): ExerciseRecord[] {
  const needle = term.trim().toLowerCase()
  if (!needle) throw new Error('Search term is required')
  return loadExerciseCatalog(payload).exercises.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.target} ${exercise.muscleGroup} ${exercise.equipment}`.toLowerCase()
    return haystack.includes(needle)
  })
}
