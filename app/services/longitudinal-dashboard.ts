import type { PersonalBiologyProfile } from '~/types/biology'
import { summarizeLongitudinalSeries, type LongitudinalMetricSummary } from './longitudinal-analytics'
import { assessLongitudinalQuality, type LongitudinalQualitySummary } from './longitudinal-quality'
import { buildLongitudinalView, type LongitudinalView } from './longitudinal-view'
import { buildEvidenceStateTimeline, type EvidenceStateEvent, type EvidenceTimelineRecord } from './evidence-state-timeline'
import { sparklinePath, type SparklineGeometry } from './sparkline'

export interface LongitudinalSeriesCard {
  key: string
  label: string
  unit?: string
  summary?: LongitudinalMetricSummary
  quality?: LongitudinalQualitySummary
  sparkline: SparklineGeometry
  pointCount: number
  latestLabel: string
}

export interface LongitudinalDashboard {
  view: LongitudinalView
  cards: LongitudinalSeriesCard[]
  timeline: EvidenceStateEvent[]
}

export function buildLongitudinalDashboard(
  profile: PersonalBiologyProfile,
  evidence: EvidenceTimelineRecord[] = [],
): LongitudinalDashboard {
  if (!profile || typeof profile !== 'object') throw new Error('Longitudinal dashboard profile must be an object')
  const view = buildLongitudinalView(profile)
  const summaries = summarizeLongitudinalSeries(view.series)
  const quality = assessLongitudinalQuality(summaries)
  const summaryByKey = new Map(summaries.map((item) => [item.key, item]))
  const qualityByKey = new Map(quality.map((item) => [item.key, item]))

  const cards = view.series.map((series): LongitudinalSeriesCard => {
    const values = series.points.map((point) => point.value)
    const last = series.points[series.points.length - 1]
    return {
      key: series.key,
      label: series.label,
      unit: series.unit,
      summary: summaryByKey.get(series.key),
      quality: qualityByKey.get(series.key),
      sparkline: sparklinePath(values),
      pointCount: series.points.length,
      latestLabel: last ? `${last.value}${series.unit ? ` ${series.unit}` : ''} · ${last.recordedAt.slice(0, 10)}` : 'No points',
    }
  })

  return {
    view,
    cards,
    timeline: buildEvidenceStateTimeline({ events: view.events, evidence }),
  }
}
