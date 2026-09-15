import { describe, expect, it } from 'vitest'
import { canonicalizeHealthConnectMetric, canonicalizeHealthConnectSample } from './health-connect-metrics'

describe('health connect metrics', () => {
  it('maps Health Connect aliases onto the registry allow-list', () => {
    expect(canonicalizeHealthConnectMetric('resting-heart-rate')).toBe('resting_heart_rate')
    expect(canonicalizeHealthConnectMetric(' sleep_duration ')).toBe('sleep')
    expect(canonicalizeHealthConnectMetric('hrv_rmssd')).toBe('hrv')
    expect(canonicalizeHealthConnectMetric('steps')).toBe('steps')
  })

  it('rewrites sample metrics in place', () => {
    expect(canonicalizeHealthConnectSample({ metric: 'resting-heart-rate', value: 52 }).metric).toBe('resting_heart_rate')
  })
})
