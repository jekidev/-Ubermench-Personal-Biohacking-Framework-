import type { CanonicalObservation, HumanState, StateDimension, StateDomain } from '~/types/personal-state'

const DOMAIN_METRICS: Record<StateDomain, string[]> = {
  cardiovascular: ['heart.rate.resting', 'blood.pressure.systolic', 'blood.pressure.diastolic'],
  metabolic: ['glucose', 'hba1c', 'triglycerides', 'ldl', 'hdl'],
  inflammatory: ['crp', 'il6', 'tnf-alpha'],
  hormonal: ['testosterone', 'estradiol', 'cortisol', 'tsh'],
  neurological: ['reaction.time', 'cognitive.score'],
  immune: ['wbc', 'lymphocytes', 'neutrophils'],
  sleep: ['sleep.duration', 'sleep.efficiency'],
  stress: ['hrv', 'cortisol'],
  fitness: ['vo2max', 'training.load'],
  nutrition: ['calories', 'protein', 'fiber'],
  cognitive: ['cognitive.score', 'focus.score'],
  recovery: ['hrv', 'sleep.duration', 'heart.rate.resting'],
}

function domainValue(domain: StateDomain, observations: CanonicalObservation[]): StateDimension | undefined {
  const accepted = new Set(DOMAIN_METRICS[domain])
  const values = observations.filter((x) => accepted.has(x.metric) && Number.isFinite(x.value))
  if (!values.length) return undefined
  values.sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
  const latest = values[values.length - 1]
  if (!latest) return undefined
  const recent = values.slice(-7)
  const avg = recent.reduce((sum, x) => sum + x.value, 0) / recent.length
  const previousValues = values.length > 7 ? values.slice(-14, -7) : []
  const previous = previousValues.length ? previousValues.reduce((sum, x) => sum + x.value, 0) / previousValues.length : avg
  return {
    domain,
    value: avg,
    trend: avg - previous,
    confidence: recent.reduce((sum, x) => sum + x.confidence, 0) / recent.length,
    quality: recent.reduce((sum, x) => sum + x.quality, 0) / recent.length,
    observedAt: latest.observedAt,
    sources: [...new Set(recent.map((x) => x.source))],
  }
}

export function buildHumanState(subjectId: string, observations: CanonicalObservation[], activeInterventions: string[] = [], activeExperiments: string[] = [], alerts: string[] = [], asOf = new Date().toISOString()): HumanState {
  const dimensions = {} as HumanState['dimensions']
  for (const domain of Object.keys(DOMAIN_METRICS) as StateDomain[]) {
    const dimension = domainValue(domain, observations)
    if (dimension) dimensions[domain] = dimension
  }
  return { version: 1, subjectId, asOf, dimensions, activeInterventions, activeExperiments, alerts }
}
