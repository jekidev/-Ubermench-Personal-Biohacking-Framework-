import { describe, expect, it } from 'vitest'
import { healthConnectCommandNames } from './bridge'
import { canonicalizeHealthConnectMetric } from '../../app/services/health-connect-metrics'

describe('health connect bridge', () => {
  it('tries the Android plugin command before the desktop Rust stub', () => {
    expect(healthConnectCommandNames('health_connect_is_available')).toEqual([
      'plugin:health-connect|health_connect_is_available',
      'health_connect_is_available',
    ])
  })

  it('keeps plugin payloads on the registry metric names', () => {
    expect(canonicalizeHealthConnectMetric('resting-heart-rate')).toBe('resting_heart_rate')
  })
})
