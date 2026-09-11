import { describe, expect, it } from 'vitest'
import { GARMIN_UNCONFIGURED_MESSAGE, garminStatusNextStep, summarizeGarminObservations, withGarminStatusGuidance } from './garmin-plugin-status'
import type { CanonicalObservation } from '~/types/personal-state'

function observation(partial: Partial<CanonicalObservation> & Pick<CanonicalObservation, 'id' | 'metric' | 'observedAt'>): CanonicalObservation {
  return {
    subjectId: 'self',
    value: 1,
    source: 'wearable',
    quality: 1,
    confidence: 0.9,
    ...partial,
  }
}

describe('garmin-plugin-status', () => {
  it('counts garmin observations and last timestamp', () => {
    const summary = summarizeGarminObservations([
      observation({
        id: 'health-connect:1',
        metric: 'steps',
        observedAt: '2026-09-10T00:00:00.000Z',
        provenance: { importedAt: '2026-09-10T00:00:00.000Z', adapter: 'health-connect' },
      }),
      observation({
        id: 'garmin:1',
        metric: 'hrv',
        observedAt: '2026-09-08T00:00:00.000Z',
        provenance: { importedAt: '2026-09-08T00:00:00.000Z', adapter: 'garmin' },
      }),
      observation({
        id: 'garmin:2',
        metric: 'steps',
        observedAt: '2026-09-11T00:00:00.000Z',
        provenance: { importedAt: '2026-09-11T00:00:00.000Z', adapter: 'garmin' },
      }),
    ])
    expect(summary.observationCount).toBe(2)
    expect(summary.lastObservedAt).toBe('2026-09-11T00:00:00.000Z')
    expect(summary.metrics).toEqual(['hrv', 'steps'])
  })

  it('explains the unconfigured Health Sync path without faking OAuth', () => {
    const status = withGarminStatusGuidance({
      oauthConfigured: false,
      oauthConnected: false,
      observationCount: 0,
      lastObservedAt: null,
      metrics: [],
    })
    expect(status.nextStep).toBe(GARMIN_UNCONFIGURED_MESSAGE)
    expect(status.healthSyncHref).toBe('/health-sync')
    expect(status.settingsHref).toContain('tab=plugins')
    expect(garminStatusNextStep({
      oauthConfigured: true,
      oauthConnected: false,
      observationCount: 0,
    })).toMatch(/developer client/i)
  })
})
