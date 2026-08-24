export type TimelineObservation = {
  id: string
  biomarker: string
  value: number
  unit: string
  collectedAt: string
  laboratory?: string
  referenceLow?: number
  referenceHigh?: number
  extractionMethod?: 'native-text' | 'ocr' | 'manual'
  sourceDocumentId?: string
}

export type TimelineSummary = {
  first: TimelineObservation
  latest: TimelineObservation
  absoluteChange: number
  relativeChangePercent?: number
  direction: 'rising' | 'falling' | 'stable' | 'insufficient-data'
  observations: number
}

export function summarizeTimeline(observations: TimelineObservation[]): TimelineSummary | null {
  if (!observations.length) return null
  const sorted = [...observations].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  if (sorted.length < 2 || first.unit !== latest.unit) {
    return { first, latest, absoluteChange: 0, direction: 'insufficient-data', observations: sorted.length }
  }
  const absoluteChange = latest.value - first.value
  const relativeChangePercent = first.value === 0 ? undefined : (absoluteChange / Math.abs(first.value)) * 100
  const epsilon = Math.max(Math.abs(first.value) * 0.02, Number.EPSILON)
  const direction = Math.abs(absoluteChange) <= epsilon ? 'stable' : absoluteChange > 0 ? 'rising' : 'falling'
  return { first, latest, absoluteChange, relativeChangePercent, direction, observations: sorted.length }
}
