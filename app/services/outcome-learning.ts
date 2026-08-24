import type { OutcomeLearningResult } from '~/types/adaptive'

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function standardDeviation(values: number[], avg: number) {
  if (values.length < 2) return 0
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1))
}

export function learnOutcome(
  metric: string,
  baseline: number[],
  intervention: number[],
  direction: OutcomeLearningResult['direction'] = 'higher-is-better',
): OutcomeLearningResult {
  const cleanBaseline = baseline.filter(Number.isFinite)
  const cleanIntervention = intervention.filter(Number.isFinite)
  const baselineMean = mean(cleanBaseline)
  const interventionMean = mean(cleanIntervention)
  const delta = interventionMean - baselineMean
  const beneficialDelta = direction === 'higher-is-better' ? delta : -delta
  const pooled = Math.sqrt((standardDeviation(cleanBaseline, baselineMean) ** 2 + standardDeviation(cleanIntervention, interventionMean) ** 2) / 2)
  const standardizedEffect = pooled > 0
    ? beneficialDelta / pooled
    : beneficialDelta > 0 ? Number.POSITIVE_INFINITY : beneficialDelta < 0 ? Number.NEGATIVE_INFINITY : 0
  const sampleSize = cleanBaseline.length + cleanIntervention.length
  const confidence: OutcomeLearningResult['confidence'] = sampleSize >= 20 ? 'high' : sampleSize >= 8 ? 'moderate' : 'low'
  const recommendation: OutcomeLearningResult['recommendation'] =
    standardizedEffect <= -0.5 ? 'possible-harm' :
    standardizedEffect >= 0.5 ? 'retain-signal' : 'insufficient-signal'
  return { metric, direction, baselineMean, interventionMean, delta, beneficialDelta, standardizedEffect, confidence, recommendation }
}
