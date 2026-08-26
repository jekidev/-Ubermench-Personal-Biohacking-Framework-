export type HealthProviderId = 'health-connect' | 'garmin'

export interface HealthProviderCapability {
  id: HealthProviderId
  name: string
  platform: 'android' | 'web' | 'desktop'
  supports: Array<'sleep' | 'heart-rate' | 'hrv' | 'training' | 'steps' | 'temperature' | 'respiratory-rate'>
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
    supports: ['sleep', 'heart-rate', 'hrv', 'training', 'steps'],
    requiresNativeAdapter: false,
  },
]

export function getHealthProvider(id: HealthProviderId) {
  return HEALTH_PROVIDER_REGISTRY.find((provider) => provider.id === id)
}
