import type { ExternalHealthSample } from './health-data-adapters'
import { canonicalizeHealthConnectMetric } from './health-connect-metrics'
import { getHealthProvider, type HealthProviderId } from './health-provider-registry'

/**
 * Runtime capability guard for imported provider samples.
 *
 * The registry is the single source of truth for supported integrations.
 * Samples outside a provider's declared metric capability are rejected before
 * they enter canonical observation/state pipelines.
 */
export function isSupportedProviderMetric(provider: HealthProviderId, metric: string): boolean {
  const capability = getHealthProvider(provider)
  if (!capability) return false

  const normalized = provider === 'health-connect'
    ? canonicalizeHealthConnectMetric(metric)
    : metric.trim().toLowerCase()
  return capability.supports.includes(normalized as (typeof capability.supports)[number])
}

export function filterSupportedProviderSamples(samples: ExternalHealthSample[]): ExternalHealthSample[] {
  return samples
    .map((sample) => sample.source === 'health-connect'
      ? { ...sample, metric: canonicalizeHealthConnectMetric(sample.metric) }
      : sample)
    .filter((sample) => isSupportedProviderMetric(sample.source, sample.metric))
}
