import { describe, expect, it } from 'vitest'
import { assertSupportedBiometricProvider, mapGarminBiometricToHealthSample } from './garmin-biometric-schema'

describe('garmin biometric schema', () => {
  it('maps Garmin HRV samples into the health-sync contract', () => {
    const sample = mapGarminBiometricToHealthSample({
      metric: 'hrv_rmssd',
      value: 48,
      unit: 'ms',
      recordedAt: '2026-09-06T07:00:00.000Z',
      provider: 'garmin',
      sourceId: 'g-hrv-1',
    })
    expect(sample.source).toBe('garmin')
    expect(sample.metric).toBe('hrv')
    expect(sample.metadata?.schema).toBe('bio-vibing-garmin')
  })

  it('rejects Oura, Whoop, Apple Health and other out-of-scope providers', () => {
    expect(() => assertSupportedBiometricProvider('oura')).toThrow('outside Ubermench')
    expect(() => assertSupportedBiometricProvider('whoop')).toThrow('outside Ubermench')
    expect(() => assertSupportedBiometricProvider('apple-health')).toThrow('outside Ubermench')
    expect(() => assertSupportedBiometricProvider('dexcom')).toThrow('outside Ubermench')
  })
})
