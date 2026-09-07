import { assertSupportedBiometricProvider, type GarminBiometricSample } from './garmin-biometric-schema'

const REJECTED_ENVELOPE_KEYS = ['oura', 'whoop', 'apple', 'apple-health', 'fitbit', 'dexcom'] as const

export async function hashGarminSampleIdentity(sample: GarminBiometricSample): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify({
      metric: sample.metric,
      value: sample.value,
      unit: sample.unit,
      recordedAt: sample.recordedAt,
      sourceId: sample.sourceId,
    })),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseGarminWellnessPayload(payload: unknown): GarminBiometricSample[] {
  if (payload == null) throw new Error('Garmin Wellness payload is required')
  if (typeof payload !== 'object') throw new Error('Garmin Wellness payload must be an object or array')

  assertGarminEnvelope(payload)

  const records = collectWellnessRecords(payload)
  const samples: GarminBiometricSample[] = []

  for (const record of records) {
    samples.push(...extractSamplesFromRecord(record))
  }

  return dedupeSamples(samples)
}

function assertGarminEnvelope(payload: unknown): void {
  if (Array.isArray(payload) || !payload || typeof payload !== 'object') return
  const record = payload as Record<string, unknown>
  const claimed = firstString(record.provider, record.source, record.vendor)
  if (claimed) assertSupportedBiometricProvider(claimed)

  for (const key of Object.keys(record)) {
    if ((REJECTED_ENVELOPE_KEYS as readonly string[]).includes(key.toLowerCase())) {
      throw new Error(`${key} is outside Ubermench health-provider scope. Use Garmin or Android Health Connect.`)
    }
  }
}

function collectWellnessRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }
  if (!isRecord(payload)) return []

  const collections = [
    payload.dailies,
    payload.dailySummaries,
    payload.sleeps,
    payload.hrv,
    payload.hrvSummaries,
    payload.bodyComps,
    payload.bodyComposition,
    payload.pulseOx,
    payload.pulseOxSummaries,
    payload.activities,
    payload.activityList,
    payload.records,
  ]

  const nested = collections.flatMap((value) => Array.isArray(value) ? value.filter(isRecord) : [])
  if (nested.length) return nested
  return [payload]
}

function extractSamplesFromRecord(record: Record<string, unknown>): GarminBiometricSample[] {
  const recordedAt = resolveRecordedAt(record)
  if (!recordedAt) return []

  const dateKey = recordedAt.slice(0, 10)
  const samples: GarminBiometricSample[] = []

  pushNumeric(samples, [record.restingHeartRate, record.resting_hr, record.rhr], 'resting_hr', 'bpm', recordedAt, `garmin:daily:${dateKey}:resting_hr`)
  pushNumeric(samples, [record.steps, record.totalSteps], 'steps', 'count', recordedAt, `garmin:daily:${dateKey}:steps`)
  pushNumeric(samples, sleepScoreKeys(record), 'sleep_score', 'score', recordedAt, `garmin:sleep:${dateKey}:sleep_score`)
  pushNumeric(samples, hrvKeys(record), 'hrv_rmssd', 'ms', recordedAt, `garmin:hrv:${dateKey}:hrv_rmssd`)
  pushNumeric(samples, spo2Keys(record), 'spo2', '%', recordedAt, `garmin:pulseox:${dateKey}:spo2`)

  const weightKg = resolveWeightKg(record)
  if (weightKg !== undefined) {
    samples.push({
      metric: 'body_weight',
      value: weightKg,
      unit: 'kg',
      recordedAt,
      provider: 'garmin',
      sourceId: `garmin:body:${dateKey}:weight`,
    })
  }

  const trainingLoad = firstFinite(record.activityTrainingLoad, record.trainingLoad, record.training_load)
  if (trainingLoad !== undefined) {
    const activityId = firstString(record.activityId, record.activityName) ?? dateKey
    samples.push({
      metric: 'training_load',
      value: trainingLoad,
      unit: 'au',
      recordedAt,
      provider: 'garmin',
      sourceId: `garmin:activity:${activityId}:training_load`,
    })
  }

  const durationSeconds = firstFinite(record.duration, record.durationInSeconds, record.elapsedDuration)
  if (durationSeconds !== undefined && (record.activityId != null || record.activityType != null || record.activityName != null)) {
    const activityId = firstString(record.activityId, record.activityName) ?? dateKey
    samples.push({
      metric: 'workout_duration',
      value: durationSeconds / 60,
      unit: 'min',
      recordedAt,
      provider: 'garmin',
      sourceId: `garmin:activity:${activityId}:workout_duration`,
    })
  }

  return samples
}

function sleepScoreKeys(record: Record<string, unknown>): unknown[] {
  const scores = isRecord(record.sleepScores) ? record.sleepScores : {}
  const overall = isRecord(record.overallSleepScore) ? record.overallSleepScore : {}
  return [scores.overallScore, overall.value, record.sleepScore, record.overallSleepScore]
}

function hrvKeys(record: Record<string, unknown>): unknown[] {
  const summary = isRecord(record.hrvSummary) ? record.hrvSummary : {}
  return [record.lastNightAvg, summary.lastNightAvg, record.weeklyAvg, summary.weeklyAvg, record.hrv]
}

function spo2Keys(record: Record<string, unknown>): unknown[] {
  return [record.averageSpo2, record.avgSpo2, record.spo2]
}

function resolveWeightKg(record: Record<string, unknown>): number | undefined {
  const kg = firstFinite(record.weightInKg, record.weight)
  if (kg !== undefined && kg < 400) return kg
  const grams = firstFinite(record.weightInGrams)
  if (grams !== undefined) return grams / 1000
  return undefined
}

function resolveRecordedAt(record: Record<string, unknown>): string | undefined {
  const direct = toIsoTimestamp(record.calendarDate)
    ?? toIsoTimestamp(record.startTimeGMT)
    ?? toIsoTimestamp(record.measurementTimeInSeconds)
    ?? toIsoTimestamp(record.startTimeInSeconds)
    ?? toIsoTimestamp(record.recordedAt)
  return direct
}

function toIsoTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return new Date(value).toISOString()
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000
    const date = new Date(ms)
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
  }
  return undefined
}

function pushNumeric(
  samples: GarminBiometricSample[],
  values: unknown[],
  metric: GarminBiometricSample['metric'],
  unit: string,
  recordedAt: string,
  sourceId: string,
): void {
  const value = firstFinite(...values)
  if (value === undefined) return
  samples.push({ metric, value, unit, recordedAt, provider: 'garmin', sourceId })
}

function firstFinite(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return undefined
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function dedupeSamples(samples: GarminBiometricSample[]): GarminBiometricSample[] {
  const seen = new Map<string, GarminBiometricSample>()
  for (const sample of samples) {
    seen.set(sample.sourceId, sample)
  }
  return [...seen.values()]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
