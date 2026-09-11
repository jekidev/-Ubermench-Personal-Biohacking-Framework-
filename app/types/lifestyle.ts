export const LIFESTYLE_KINDS = ['workout', 'sleep', 'meal', 'meditation'] as const
export type LifestyleKind = (typeof LIFESTYLE_KINDS)[number]

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealType = (typeof MEAL_TYPES)[number]

export interface LifestyleLogBase {
  id: string
  kind: LifestyleKind
  recordedAt: string
  notes?: string
}

export interface WorkoutLog extends LifestyleLogBase {
  kind: 'workout'
  activity: string
  exerciseId?: string
  durationMinutes?: number
  intensity?: number
}

export interface SleepLog extends LifestyleLogBase {
  kind: 'sleep'
  durationMinutes?: number
  quality?: number
}

export interface MealLog extends LifestyleLogBase {
  kind: 'meal'
  name: string
  mealType?: MealType
  calories?: number
}

export interface MeditationLog extends LifestyleLogBase {
  kind: 'meditation'
  durationMinutes: number
}

export type LifestyleLog = WorkoutLog | SleepLog | MealLog | MeditationLog
