export interface SleepInput { durationMinutes?: number; efficiency?: number; hrv?: number; restingHeartRate?: number }
export interface TrainingInput { durationMinutes?: number; intensity?: number; load?: number; sessionsLast7Days?: number }
export interface NutritionInput { calories?: number; proteinGrams?: number; fiberGrams?: number; bodyWeightKg?: number }

const clamp = (x: number) => Math.max(0, Math.min(100, x))

export function scoreSleep(input: SleepInput) {
  const duration = input.durationMinutes === undefined ? 50 : clamp(100 - Math.abs(input.durationMinutes - 480) * 0.35)
  const efficiency = input.efficiency === undefined ? 50 : clamp(input.efficiency)
  const hrv = input.hrv === undefined ? 50 : clamp(input.hrv)
  return { score: Math.round(duration * 0.45 + efficiency * 0.35 + hrv * 0.2), components: { duration, efficiency, hrv } }
}

export function scoreTraining(input: TrainingInput) {
  const duration = input.durationMinutes === undefined ? 50 : clamp(input.durationMinutes / 60 * 25)
  const intensity = input.intensity === undefined ? 50 : clamp(input.intensity)
  const load = input.load === undefined ? 50 : clamp(input.load / 10)
  const frequency = input.sessionsLast7Days === undefined ? 50 : clamp(input.sessionsLast7Days / 4 * 100)
  return { score: Math.round(duration * 0.2 + intensity * 0.25 + load * 0.2 + frequency * 0.35), components: { duration, intensity, load, frequency } }
}

export function scoreNutrition(input: NutritionInput) {
  const proteinTarget = input.bodyWeightKg ? input.bodyWeightKg * 1.6 : undefined
  const protein = input.proteinGrams === undefined || proteinTarget === undefined ? 50 : clamp(input.proteinGrams / proteinTarget * 100)
  const fiber = input.fiberGrams === undefined ? 50 : clamp(input.fiberGrams / 30 * 100)
  const calories = input.calories === undefined ? 50 : clamp(100 - Math.abs(input.calories - 2500) / 25)
  return { score: Math.round(protein * 0.4 + fiber * 0.3 + calories * 0.3), components: { protein, fiber, calories } }
}
