import type { ExternalHealthSample } from '../health-data-adapters'

export const REJECTED_BIOMETRIC_PROVIDERS = [
  'oura',
  'whoop',
  'fitbit',
  'apple',
  'apple-health',
  'dexcom',
  'nightscout',
  'suna',
] as const

export type RejectedBiometricProvider = typeof REJECTED_BIOMETRIC_PROVIDERS[number]

export type GarminBiometricMetric =
  | 'sleep_score'
  | 'hrv_rmssd'
  | 'resting_hr'
  | 'steps'
  | 'training_load'
  | 'spo2'
  | 'body_weight'
  | 'workout_duration'

export type GarminBiometricSample = {
  metric: GarminBiometricMetric
  value: number
  unit: string
  recordedAt: string
  provider: 'garmin'
  sourceId: string
}

const METRIC_MAP: Record<GarminBiometricMetric, { metric: string; unit: string }> = {
  sleep_score: { metric: 'sleep_score', unit: 'score' },
  hrv_rmssd: { metric: 'hrv', unit: 'ms' },
  resting_hr: { metric: 'resting_heart_rate', unit: 'bpm' },
  steps: { metric: 'steps', unit: 'count' },
  training_load: { metric: 'training_load', unit: 'au' },
  spo2: { metric: 'spo2', unit: '%' },
  body_weight: { metric: 'weight', unit: 'kg' },
  workout_duration: { metric: 'workout_duration', unit: 'min' },
}

function requireFinite(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

export function assertSupportedBiometricProvider(provider: string): asserts provider is 'garmin' {
  const normalized = provider.trim().toLowerCase()
  if ((REJECTED_BIOMETRIC_PROVIDERS as readonly string[]).includes(normalized)) {
    throw new Error(`${provider} is outside Ubermench health-provider scope. Use Garmin or Android Health Connect.`)
  }
  if (normalized !== 'garmin') {
    throw new Error(`Unsupported biometric provider: ${provider}`)
  }
}

export function mapGarminBiometricToHealthSample(sample: GarminBiometricSample): ExternalHealthSample {
  if (!sample || typeof sample !== 'object') throw new Error('Garmin biometric sample must be an object')
  assertSupportedBiometricProvider(sample.provider)
  const sourceId = sample.sourceId.trim()
  if (!sourceId) throw new Error('Garmin sample sourceId is required')
  if (!Number.isFinite(Date.parse(sample.recordedAt))) throw new Error('Garmin sample recordedAt must be an ISO timestamp')
  const mapped = METRIC_MAP[sample.metric]
  if (!mapped) throw new Error(`Unsupported Garmin biometric metric: ${String(sample.metric)}`)
  return {
    id: sourceId,
    metric: mapped.metric,
    value: requireFinite(sample.value, 'Garmin sample value'),
    unit: sample.unit || mapped.unit,
    recordedAt: sample.recordedAt,
    source: 'garmin',
    metadata: { schema: 'bio-vibing-garmin', originalMetric: sample.metric },
  }
}

export function mapGarminBiometricsToHealthSamples(samples: readonly GarminBiometricSample[]): ExternalHealthSample[] {
  if (!Array.isArray(samples)) throw new Error('Garmin samples must be an array')
  return samples.map(mapGarminBiometricToHealthSample)
}
