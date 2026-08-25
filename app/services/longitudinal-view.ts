import type { BiomarkerRecord, PersonalBiologyProfile, SleepRecord, SymptomRecord, TrainingRecord } from '~/types/biology'

export type LongitudinalEventKind = 'biomarker' | 'symptom' | 'sleep' | 'training'

export interface LongitudinalEvent {
  id: string
  kind: LongitudinalEventKind
  recordedAt: string
  label: string
  value?: number
  unit?: string
  quality: 'measured' | 'self-reported' | 'derived'
}

export interface MetricPoint {
  id: string
  recordedAt: string
  value: number
  unit?: string
}

export interface LongitudinalMetricSeries {
  key: string
  label: string
  unit?: string
  points: MetricPoint[]
}

export interface LongitudinalView {
  events: LongitudinalEvent[]
  series: LongitudinalMetricSeries[]
}

const validTimestamp = (value: string): boolean => Number.isFinite(Date.parse(value))

const byTimestamp = (a: LongitudinalEvent, b: LongitudinalEvent): number => {
  const time = Date.parse(a.recordedAt) - Date.parse(b.recordedAt)
  if (time !== 0) return time
  return `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)
}

const biomarkerEvent = (record: BiomarkerRecord): LongitudinalEvent => ({
  id: record.id,
  kind: 'biomarker',
  recordedAt: record.measuredAt,
  label: record.name,
  value: record.value,
  unit: record.unit,
  quality: 'measured',
})

const symptomEvent = (record: SymptomRecord): LongitudinalEvent => ({
  id: record.id,
  kind: 'symptom',
  recordedAt: record.recordedAt,
  label: record.name,
  value: record.severity,
  quality: 'self-reported',
})

const sleepEvent = (record: SleepRecord): LongitudinalEvent => ({
  id: record.id,
  kind: 'sleep',
  recordedAt: record.recordedAt,
  label: 'Sleep duration',
  value: record.durationMinutes,
  unit: 'min',
  quality: 'measured',
})

const trainingEvent = (record: TrainingRecord): LongitudinalEvent => ({
  id: record.id,
  kind: 'training',
  recordedAt: record.recordedAt,
  label: record.activity,
  value: record.load ?? record.durationMinutes,
  unit: record.load !== undefined ? 'load' : 'min',
  quality: 'self-reported',
})

const toSeries = (events: LongitudinalEvent[]): LongitudinalMetricSeries[] => {
  const grouped = new Map<string, LongitudinalMetricSeries>()

  for (const event of events) {
    if (event.value === undefined || !Number.isFinite(event.value)) continue
    const key = `${event.kind}:${event.label}:${event.unit ?? ''}`
    const current = grouped.get(key)
    const point = { id: event.id, recordedAt: event.recordedAt, value: event.value, unit: event.unit }

    if (current) current.points.push(point)
    else grouped.set(key, { key, label: event.label, unit: event.unit, points: [point] })
  }

  return [...grouped.values()]
    .map((series) => ({
      ...series,
      points: [...series.points].sort((a, b) => {
        const time = Date.parse(a.recordedAt) - Date.parse(b.recordedAt)
        return time !== 0 ? time : a.id.localeCompare(b.id)
      }),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/** Build a deterministic, visualization-ready longitudinal view from canonical profile data. */
export function buildLongitudinalView(profile: PersonalBiologyProfile): LongitudinalView {
  const events = [
    ...profile.biomarkers.filter((record) => validTimestamp(record.measuredAt)).map(biomarkerEvent),
    ...profile.symptoms.filter((record) => validTimestamp(record.recordedAt)).map(symptomEvent),
    ...profile.sleep.filter((record) => validTimestamp(record.recordedAt)).map(sleepEvent),
    ...profile.training.filter((record) => validTimestamp(record.recordedAt)).map(trainingEvent),
  ].sort(byTimestamp)

  return { events, series: toSeries(events) }
}
