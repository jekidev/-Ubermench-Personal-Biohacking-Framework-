export interface ReferenceInterval {
  low?: number
  high?: number
  text?: string
}

export interface LabResultEvent {
  id: string
  canonicalMarker: string
  displayMarker: string
  value: number
  unit: string
  collectionDate: string
  labName?: string
  reference: ReferenceInterval
  sourceDocumentId: string
  sourceLocator?: string
  confidence: number
  warnings: string[]
}

export interface MarkerTrendPoint {
  date: string
  value: number
  unit: string
  sourceDocumentId: string
  confidence: number
}

export interface MarkerTimeline {
  canonicalMarker: string
  points: MarkerTrendPoint[]
  firstDate?: string
  latestDate?: string
  deltaAbsolute?: number
  deltaRelative?: number
  direction: 'rising' | 'falling' | 'stable' | 'insufficient_data'
}

export function buildMarkerTimeline(
  events: LabResultEvent[],
  canonicalMarker: string,
  stableFraction = 0.05,
): MarkerTimeline {
  const points = events
    .filter((event) => event.canonicalMarker === canonicalMarker)
    .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
    .map((event) => ({
      date: event.collectionDate,
      value: event.value,
      unit: event.unit,
      sourceDocumentId: event.sourceDocumentId,
      confidence: event.confidence,
    }))

  if (points.length < 2) {
    return { canonicalMarker, points, direction: 'insufficient_data' }
  }

  const first = points[0]
  const latest = points[points.length - 1]
  const deltaAbsolute = latest.value - first.value
  const denominator = Math.max(Math.abs(first.value), Number.EPSILON)
  const deltaRelative = deltaAbsolute / denominator

  let direction: MarkerTimeline['direction'] = 'stable'
  if (Math.abs(deltaRelative) >= stableFraction) {
    direction = deltaAbsolute > 0 ? 'rising' : 'falling'
  }

  return {
    canonicalMarker,
    points,
    firstDate: first.date,
    latestDate: latest.date,
    deltaAbsolute,
    deltaRelative,
    direction,
  }
}
