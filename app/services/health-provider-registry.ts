export type HealthProviderId = 'health-connect' | 'apple-health' | 'garmin' | 'oura' | 'whoop' | 'fitbit' | 'polar' | 'manual'

export interface HealthProviderCapability {
  id: HealthProviderId
  name: string
  platform: 'android' | 'ios' | 'web' | 'desktop'
  supports: Array<'sleep' | 'heart-rate' | 'hrv' | 'training' | 'steps' | 'temperature' | 'respiratory-rate'>
  requiresNativeAdapter: boolean
}

export const HEALTH_PROVIDER_REGISTRY: HealthProviderCapability[] = [
  { id: 'health-connect', name: 'Android Health Connect', platform: 'android', supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps', 'temperature', 'respiratory-rate'], requiresNativeAdapter: true },
  { id: 'apple-health', name: 'Apple Health', platform: 'ios', supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps', 'temperature', 'respiratory-rate'], requiresNativeAdapter: true },
  { id: 'garmin', name: 'Garmin', platform: 'web', supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps'], requiresNativeAdapter: false },
  { id: 'oura', name: 'Oura', platform: 'web', supports: ['sleep', 'heart-rate', 'hrv', 'temperature'], requiresNativeAdapter: false },
  { id: 'whoop', name: 'WHOOP', platform: 'web', supports: ['sleep', 'heart-rate', 'hrv', 'training', 'respiratory-rate'], requiresNativeAdapter: false },
  { id: 'fitbit', name: 'Fitbit', platform: 'web', supports: ['sleep', 'heart-rate', 'steps', 'training'], requiresNativeAdapter: false },
  { id: 'polar', name: 'Polar', platform: 'web', supports: ['heart-rate', 'hrv', 'training'], requiresNativeAdapter: false },
  { id: 'manual', name: 'Manual import', platform: 'web', supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps', 'temperature', 'respiratory-rate'], requiresNativeAdapter: false },
]

export function getHealthProvider(id: HealthProviderId) {
  return HEALTH_PROVIDER_REGISTRY.find((provider) => provider.id === id)
}
