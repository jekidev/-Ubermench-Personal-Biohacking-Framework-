import type { PersonalBiologyProfile } from '~/types/biology'

export type TimelineEventType = 'biomarker' | 'medication' | 'supplement' | 'symptom' | 'sleep' | 'training' | 'goal'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  occurredAt: string
  label: string
  value?: number | string
  unit?: string
  source?: string
}

export function buildBiologyTimeline(profile: PersonalBiologyProfile): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...profile.biomarkers.map((item) => ({ id: item.id, type: 'biomarker' as const, occurredAt: item.measuredAt, label: item.name, value: item.value, unit: item.unit, source: item.source })),
    ...profile.medications.map((item) => ({ id: item.id, type: 'medication' as const, occurredAt: item.startedAt ?? profile.updatedAt, label: item.name, value: item.dose, source: 'medication-record' })),
    ...profile.supplements.map((item) => ({ id: item.id, type: 'supplement' as const, occurredAt: profile.updatedAt, label: item.name, value: item.dose, source: 'supplement-record' })),
    ...profile.symptoms.map((item) => ({ id: item.id, type: 'symptom' as const, occurredAt: item.recordedAt, label: item.name, value: item.severity, source: item.notes })),
    ...profile.sleep.map((item) => ({ id: item.id, type: 'sleep' as const, occurredAt: item.recordedAt, label: 'Sleep', value: item.durationMinutes, unit: 'min', source: item.source })),
    ...profile.training.map((item) => ({ id: item.id, type: 'training' as const, occurredAt: item.recordedAt, label: item.activity, value: item.load, source: 'training-record' })),
    ...profile.goals.map((goal, index) => ({ id: `goal-${index}`, type: 'goal' as const, occurredAt: profile.updatedAt, label: goal, source: 'profile' })),
  ]
  return events.filter((event) => !Number.isNaN(Date.parse(event.occurredAt))).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export function eventsBetween(events: TimelineEvent[], start: string, end: string): TimelineEvent[] {
  const startTs = Date.parse(start)
  const endTs = Date.parse(end)
  if (Number.isNaN(startTs) || Number.isNaN(endTs) || endTs < startTs) return []
  return events.filter((event) => {
    const ts = Date.parse(event.occurredAt)
    return ts >= startTs && ts <= endTs
  })
}
