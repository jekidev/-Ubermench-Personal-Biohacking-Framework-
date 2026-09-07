export type HealthProviderId = 'health-connect' | 'garmin'

export type HealthProviderMetric =
  | 'sleep'
  | 'sleep_score'
  | 'heart-rate'
  | 'resting_heart_rate'
  | 'hrv'
  | 'training'
  | 'training_load'
  | 'workout_duration'
  | 'steps'
  | 'spo2'
  | 'weight'
  | 'temperature'
  | 'respiratory-rate'

export interface HealthProviderCapability {
  id: HealthProviderId
  name: string
  platform: 'android' | 'web' | 'desktop'
  supports: HealthProviderMetric[]
  requiresNativeAdapter: boolean
}

/**
 * Supported health integrations are deliberately kept small.
 * Product scope: Garmin + Android Health Connect only.
 */
export const HEALTH_PROVIDER_REGISTRY: HealthProviderCapability[] = [
  {
    id: 'health-connect',
    name: 'Android Health Connect',
    platform: 'android',
    supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps', 'temperature', 'respiratory-rate'],
    requiresNativeAdapter: true,
  },
  {
    id: 'garmin',
    name: 'Garmin',
    platform: 'web',
    supports: [
      'sleep',
      'sleep_score',
      'heart-rate',
      'resting_heart_rate',
      'hrv',
      'training',
      'training_load',
      'workout_duration',
      'steps',
      'spo2',
      'weight',
    ],
    requiresNativeAdapter: false,
  },
]

export function getHealthProvider(id: HealthProviderId) {
  return HEALTH_PROVIDER_REGISTRY.find((provider) => provider.id === id)
}
