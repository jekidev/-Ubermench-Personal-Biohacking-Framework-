import { describe, expect, it } from 'vitest'
import type { ExternalHealthSample } from './health-data-adapters'
import { filterSupportedProviderSamples, isSupportedProviderMetric } from './health-provider-capabilities'

describe('health-provider-capabilities', () => {
  it('uses the registry as the runtime metric allow-list', () => {
    expect(isSupportedProviderMetric('garmin', 'sleep')).toBe(true)
    expect(isSupportedProviderMetric('garmin', 'respiratory-rate')).toBe(false)
    expect(isSupportedProviderMetric('health-connect', 'respiratory-rate')).toBe(true)
  })

  it('normalizes metric names before capability checks', () => {
    expect(isSupportedProviderMetric('garmin', ' HEART-RATE ')).toBe(true)
  })

  it('filters unsupported samples without changing accepted records', () => {
    const accepted: ExternalHealthSample = {
      id: 'g-1',
      metric: 'heart-rate',
      value: 61,
      recordedAt: '2026-08-26T01:00:00.000Z',
      source: 'garmin',
    }
    const rejected: ExternalHealthSample = {
      id: 'g-2',
      metric: 'temperature',
      value: 36.7,
      recordedAt: '2026-08-26T01:01:00.000Z',
      source: 'garmin',
    }

    expect(filterSupportedProviderSamples([accepted, rejected])).toEqual([accepted])
  })

  it('has no path for removed providers', () => {
    expect(isSupportedProviderMetric('garmin', 'oura-readiness')).toBe(false)
    expect(isSupportedProviderMetric('garmin', 'whoop-recovery')).toBe(false)
    expect(isSupportedProviderMetric('garmin', 'apple-health')).toBe(false)
  })
})
