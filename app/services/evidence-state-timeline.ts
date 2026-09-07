import type { LongitudinalEvent } from './longitudinal-view'

export type EvidenceStateLane = 'state' | 'evidence'

export interface EvidenceTimelineRecord {
  id: string
  title: string
  retrievedAt: string
  publishedAt?: string
  retracted?: boolean
}

export interface EvidenceStateEvent {
  at: string
  lane: EvidenceStateLane
  id: string
  label: string
  kind: string
  detail?: string
  value?: number
  unit?: string
  retracted?: boolean
}

const validTimestamp = (value: string): boolean => Number.isFinite(Date.parse(value))

function byTimeThenId(left: EvidenceStateEvent, right: EvidenceStateEvent): number {
  const time = Date.parse(left.at) - Date.parse(right.at)
  if (time !== 0) return time
  if (left.lane !== right.lane) return left.lane.localeCompare(right.lane)
  return left.id.localeCompare(right.id)
}

/**
 * Overlay stored evidence timestamps on longitudinal state events.
 * Published dates are used when present; otherwise retrieval time.
 * This does not infer that evidence caused a state change.
 */
export function buildEvidenceStateTimeline(input: {
  events: LongitudinalEvent[]
  evidence?: EvidenceTimelineRecord[]
}): EvidenceStateEvent[] {
  if (!input || typeof input !== 'object') throw new Error('Evidence-state timeline input must be an object')
  if (!Array.isArray(input.events)) throw new Error('Longitudinal events must be an array')

  const stateEvents: EvidenceStateEvent[] = input.events
    .filter((event) => validTimestamp(event.recordedAt))
    .map((event) => ({
      at: event.recordedAt,
      lane: 'state',
      id: event.id,
      label: event.label,
      kind: event.kind,
      value: event.value,
      unit: event.unit,
    }))

  const evidenceEvents: EvidenceStateEvent[] = (input.evidence ?? [])
    .flatMap((record) => {
      const at = record.publishedAt && validTimestamp(record.publishedAt) ? record.publishedAt : record.retrievedAt
      if (!validTimestamp(at)) return []
      return [{
        at,
        lane: 'evidence' as const,
        id: record.id,
        label: record.title,
        kind: 'evidence',
        detail: record.publishedAt && validTimestamp(record.publishedAt) ? 'published' : 'retrieved',
        retracted: record.retracted === true,
      }]
    })

  return [...stateEvents, ...evidenceEvents].sort(byTimeThenId)
}
