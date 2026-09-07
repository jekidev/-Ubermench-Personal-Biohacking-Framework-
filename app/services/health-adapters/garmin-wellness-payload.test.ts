import { describe, expect, it } from 'vitest'
import { mapGarminBiometricsToHealthSamples } from './garmin-biometric-schema'
import { hashGarminSampleIdentity, parseGarminWellnessPayload } from './garmin-wellness-payload'

const FIXTURE = {
  provider: 'garmin',
  dailies: [
    { calendarDate: '2026-09-06', restingHeartRate: 52, steps: 8432 },
    { calendarDate: '2026-09-05', restingHeartRate: 54, steps: 6100 },
  ],
  sleeps: [
    { calendarDate: '2026-09-06', sleepScores: { overallScore: 81 } },
  ],
  hrv: [
    { calendarDate: '2026-09-06', lastNightAvg: 48 },
  ],
  bodyComps: [
    { calendarDate: '2026-09-06', weightInGrams: 74500 },
  ],
  pulseOx: [
    { calendarDate: '2026-09-06', averageSpo2: 97 },
  ],
  activities: [
    {
      activityId: 991,
      startTimeGMT: '2026-09-06T06:15:00.000Z',
      duration: 3600,
      activityTrainingLoad: 42,
    },
  ],
}

describe('garmin wellness payload', () => {
  it('parses Wellness collections into biometric samples without inventing values', () => {
    const samples = parseGarminWellnessPayload(FIXTURE)
    const metrics = samples.map((sample) => sample.metric).sort()
    expect(metrics).toEqual([
      'body_weight',
      'hrv_rmssd',
      'resting_hr',
      'resting_hr',
      'sleep_score',
      'spo2',
      'steps',
      'steps',
      'training_load',
      'workout_duration',
    ])
    expect(samples.find((sample) => sample.metric === 'resting_hr' && sample.sourceId.includes('2026-09-06'))?.value).toBe(52)
    expect(samples.find((sample) => sample.metric === 'body_weight')?.value).toBe(74.5)
    expect(samples.every((sample) => sample.provider === 'garmin')).toBe(true)
  })

  it('maps parsed samples through the Garmin biometric schema', () => {
    const mapped = mapGarminBiometricsToHealthSamples(parseGarminWellnessPayload(FIXTURE))
    expect(mapped.every((sample) => sample.source === 'garmin')).toBe(true)
    expect(mapped.some((sample) => sample.metric === 'resting_heart_rate' && sample.value === 52)).toBe(true)
    expect(mapped.some((sample) => sample.metric === 'hrv' && sample.value === 48)).toBe(true)
    expect(mapped.some((sample) => sample.id === 'garmin:activity:991:training_load')).toBe(true)
  })

  it('rejects Oura/WHOOP/Apple envelopes instead of importing them', () => {
    expect(() => parseGarminWellnessPayload({ provider: 'oura', dailies: [] })).toThrow('outside Ubermench')
    expect(() => parseGarminWellnessPayload({ whoop: [{ recovery: 80 }] })).toThrow('outside Ubermench')
    expect(() => parseGarminWellnessPayload({ source: 'apple-health' })).toThrow('outside Ubermench')
  })

  it('skips incomplete records instead of fabricating measurements', () => {
    const samples = parseGarminWellnessPayload({
      dailies: [{ calendarDate: '2026-09-06' }, { restingHeartRate: 58 }],
    })
    expect(samples).toEqual([])
  })

  it('produces a stable payload hash for the same sample identity', async () => {
    const [sample] = parseGarminWellnessPayload({
      dailies: [{ calendarDate: '2026-09-06', restingHeartRate: 52 }],
    })
    if (!sample) throw new Error('expected a parsed sample')
    expect(await hashGarminSampleIdentity(sample)).toBe(await hashGarminSampleIdentity(sample))
  })
})
