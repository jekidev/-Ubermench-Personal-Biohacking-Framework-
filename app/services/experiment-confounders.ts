export type ConfounderCategory = 'sleep' | 'training' | 'nutrition' | 'medication' | 'illness' | 'stress' | 'other'

export interface ExperimentConfounder {
  id: string
  recordedAt: string
  category: ConfounderCategory
  description: string
  severity: 0 | 1 | 2 | 3
  phase?: 'baseline' | 'washout' | 'intervention' | 'followup'
}

export interface ConfounderSummary {
  count: number
  highImpactCount: number
  byCategory: Record<ConfounderCategory, number>
}

const categories: ConfounderCategory[] = ['sleep', 'training', 'nutrition', 'medication', 'illness', 'stress', 'other']

export function summarizeExperimentConfounders(events: ExperimentConfounder[]): ConfounderSummary {
  const byCategory = Object.fromEntries(categories.map((category) => [category, 0])) as Record<ConfounderCategory, number>
  for (const event of events) {
    if (categories.includes(event.category)) byCategory[event.category] += 1
  }
  return {
    count: events.length,
    highImpactCount: events.filter((event) => event.severity >= 2).length,
    byCategory,
  }
}

export function filterConfoundersForPhase(events: ExperimentConfounder[], phase: ExperimentConfounder['phase']): ExperimentConfounder[] {
  return events
    .filter((event) => !event.phase || event.phase === phase)
    .filter((event) => Number.isFinite(new Date(event.recordedAt).getTime()))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id))
}
