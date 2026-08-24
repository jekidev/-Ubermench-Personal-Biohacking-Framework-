import { describe, expect, it } from 'vitest'
import { buildMarkerTimeline, type LabResultEvent } from '../domain/lab-timeline'

const events: LabResultEvent[] = [
  {
    id: '1', canonicalMarker: 'apoB', displayMarker: 'ApoB', value: 1.2,
    unit: 'g/L', collectionDate: '2026-01-01', reference: {}, sourceDocumentId: 'doc-1', confidence: 1, warnings: [],
  },
  {
    id: '2', canonicalMarker: 'apoB', displayMarker: 'ApoB', value: 0.9,
    unit: 'g/L', collectionDate: '2026-08-01', reference: {}, sourceDocumentId: 'doc-2', confidence: 1, warnings: [],
  },
]

describe('buildMarkerTimeline', () => {
  it('sorts points and reports a falling trend', () => {
    const timeline = buildMarkerTimeline(events, 'apoB')
    expect(timeline.points.map((p) => p.date)).toEqual(['2026-01-01', '2026-08-01'])
    expect(timeline.direction).toBe('falling')
    expect(timeline.deltaAbsolute).toBeCloseTo(-0.3)
    expect(timeline.deltaRelative).toBeCloseTo(-0.25)
  })

  it('requires two observations for a trend', () => {
    const timeline = buildMarkerTimeline(events.slice(0, 1), 'apoB')
    expect(timeline.direction).toBe('insufficient_data')
  })
})
