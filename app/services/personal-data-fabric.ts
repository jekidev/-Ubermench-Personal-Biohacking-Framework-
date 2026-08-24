import type { BiomarkerRecord, SleepRecord, TrainingRecord } from '~/types/biology'
import type { CanonicalObservation, InterventionEvent } from '~/types/personal-state'

export function observationFromBiomarker(record: BiomarkerRecord, subjectId: string): CanonicalObservation {
  return {
    id: record.id,
    subjectId,
    observedAt: record.measuredAt,
    metric: record.name,
    value: record.value,
    unit: record.unit,
    source: record.source,
    sourceRecordId: record.id,
    quality: 1,
    confidence: 1,
    provenance: { importedAt: new Date().toISOString(), adapter: 'biomarker-record' },
  }
}

export function observationFromSleep(record: SleepRecord, subjectId: string): CanonicalObservation[] {
  const output: CanonicalObservation[] = []
  const add = (metric: string, value: number | undefined, unit: string) => {
    if (value !== undefined && Number.isFinite(value)) output.push({ id: `${record.id}:${metric}`, subjectId, observedAt: record.recordedAt, metric, value, unit, source: record.source, sourceRecordId: record.id, quality: 1, confidence: 0.9 })
  }
  add('sleep.duration', record.durationMinutes, 'min')
  add('sleep.efficiency', record.efficiency, '%')
  add('heart.rate.resting', record.restingHeartRate, 'bpm')
  add('hrv', record.hrv, 'ms')
  return output
}

export function observationFromTraining(record: TrainingRecord, subjectId: string): CanonicalObservation[] {
  const output: CanonicalObservation[] = []
  const add = (metric: string, value: number | undefined, unit: string) => {
    if (value !== undefined && Number.isFinite(value)) output.push({ id: `${record.id}:${metric}`, subjectId, observedAt: record.recordedAt, metric, value, unit, source: 'training', sourceRecordId: record.id, quality: 1, confidence: 0.9, context: { activity: record.activity } })
  }
  add('training.duration', record.durationMinutes, 'min')
  add('training.intensity', record.intensity, 'score')
  add('training.load', record.load, 'load')
  return output
}

export function sortObservations(observations: CanonicalObservation[]): CanonicalObservation[] {
  return [...observations].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
}

export function mergeObservations(...groups: CanonicalObservation[][]): CanonicalObservation[] {
  const byKey = new Map<string, CanonicalObservation>()
  for (const observation of groups.flat()) byKey.set(`${observation.subjectId}:${observation.id}`, observation)
  return sortObservations([...byKey.values()])
}

export function interventionEvent(name: string, subjectId: string, action: InterventionEvent['action'], occurredAt = new Date().toISOString(), details: Omit<InterventionEvent, 'id' | 'subjectId' | 'name' | 'action' | 'occurredAt'> = {}): InterventionEvent {
  return { id: `${subjectId}:${name}:${occurredAt}:${action}`, subjectId, name, action, occurredAt, ...details }
}
