import type { TimelineObservation } from './bloods-timeline-model'

export type ChartPoint = {
  date: string
  value: number
  label: string
  source?: string
}

export type ReferenceBand = {
  low?: number
  high?: number
}

export type BiomarkerChartModel = {
  biomarker: string
  unit: string
  points: ChartPoint[]
  baseline?: ChartPoint
  latest?: ChartPoint
  reference: ReferenceBand
}

export function buildBiomarkerChartModel(
  biomarker: string,
  observations: TimelineObservation[],
  from?: string,
  to?: string,
): BiomarkerChartModel | null {
  const filtered = [...observations]
    .filter((item) => item.biomarker === biomarker)
    .filter((item) => !from || item.collectedAt >= from)
    .filter((item) => !to || item.collectedAt <= to)
    .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))

  if (!filtered.length) return null

  const unit = filtered[0].unit
  const compatible = filtered.filter((item) => item.unit === unit)
  if (!compatible.length) return null

  const points = compatible.map((item) => ({
    date: item.collectedAt,
    value: item.value,
    label: `${item.value} ${item.unit}`,
    source: item.sourceDocumentId,
  }))

  const referenceObservation = compatible[compatible.length - 1]
  return {
    biomarker,
    unit,
    points,
    baseline: points[0],
    latest: points[points.length - 1],
    reference: {
      low: referenceObservation.referenceLow,
      high: referenceObservation.referenceHigh,
    },
  }
}

export function filterDateRange(
  observations: TimelineObservation[],
  range: '3m' | '6m' | '1y' | 'all',
  now = new Date('2026-08-24T00:00:00Z'),
): TimelineObservation[] {
  if (range === 'all') return observations
  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12
  const from = new Date(now)
  from.setUTCMonth(from.getUTCMonth() - months)
  const fromDate = from.toISOString().slice(0, 10)
  return observations.filter((item) => item.collectedAt >= fromDate)
}
