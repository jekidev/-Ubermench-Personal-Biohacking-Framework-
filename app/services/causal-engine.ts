export interface CausalObservation {
  recordedAt: string
  metric: string
  value: number
  intervention?: string
  covariates?: Record<string, number>
}

export interface CausalEstimate {
  metric: string
  intervention: string
  baselineMean?: number
  interventionMean?: number
  delta?: number
  standardizedEffect?: number
  confidence: number
  limitations: string[]
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

function sd(values: number[], average?: number) {
  if (values.length < 2 || average === undefined) return undefined
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1))
}

export function estimateInterventionEffect(observations: CausalObservation[], metric: string, intervention: string): CausalEstimate {
  const relevant = observations.filter((item) => item.metric.toLowerCase() === metric.toLowerCase())
  const baselineValues = relevant.filter((item) => item.intervention !== intervention).map((item) => item.value)
  const interventionValues = relevant.filter((item) => item.intervention === intervention).map((item) => item.value)
  const baselineMean = mean(baselineValues)
  const interventionMean = mean(interventionValues)
  const delta = baselineMean === undefined || interventionMean === undefined ? undefined : interventionMean - baselineMean
  const pooledSd = (() => {
    const a = sd(baselineValues, baselineMean)
    const b = sd(interventionValues, interventionMean)
    return a === undefined || b === undefined ? undefined : Math.sqrt((a ** 2 + b ** 2) / 2)
  })()
  const standardizedEffect = delta === undefined || !pooledSd || pooledSd === 0 ? undefined : delta / pooledSd
  const sampleFactor = Math.min(1, (baselineValues.length + interventionValues.length) / 20)
  const confidence = Math.max(0, Math.min(1, sampleFactor * (delta === undefined ? 0.1 : 0.8)))
  const limitations = [
    'This is an observational N-of-1 estimate, not proof of causality.',
    'Unmeasured confounding and time trends may explain part of the effect.',
  ]
  if (baselineValues.length < 3 || interventionValues.length < 3) limitations.push('Small sample size limits reliability.')
  return { metric, intervention, baselineMean, interventionMean, delta, standardizedEffect, confidence, limitations }
}

export function estimateMultipleEffects(observations: CausalObservation[], pairs: Array<{ metric: string; intervention: string }>) {
  return pairs.map((pair) => estimateInterventionEffect(observations, pair.metric, pair.intervention))
}
