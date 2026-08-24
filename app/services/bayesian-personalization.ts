import { summarizeUncertainty } from './uncertainty-engine'

export interface BayesianSignal {
  mean: number
  precision: number
  confidence: number
  source: 'prior' | 'population' | 'personal'
}

export interface PersonalPosterior {
  mean: number
  variance: number
  confidence: number
  evidence: BayesianSignal[]
}

export function gaussianUpdate(prior: BayesianSignal, observation: BayesianSignal): PersonalPosterior {
  const priorPrecision = Math.max(prior.precision, 1e-9)
  const observationPrecision = Math.max(observation.precision, 1e-9)
  const posteriorPrecision = priorPrecision + observationPrecision
  const mean = (prior.mean * priorPrecision + observation.mean * observationPrecision) / posteriorPrecision
  const variance = 1 / posteriorPrecision
  const confidence = Math.min(1, (prior.confidence + observation.confidence) / 2 + 0.1)
  return { mean, variance, confidence, evidence: [prior, observation] }
}

export function personalEffect(baseline: number[], intervention: number[], direction: 'higher-is-better' | 'lower-is-better' = 'higher-is-better') {
  const b = summarizeUncertainty(baseline)
  const i = summarizeUncertainty(intervention)
  const delta = direction === 'higher-is-better' ? i.value - b.value : b.value - i.value
  const variance = (b.standardError ?? 0) ** 2 + (i.standardError ?? 0) ** 2
  const precision = variance > 0 ? 1 / variance : Math.max(b.confidence + i.confidence, 0.1)
  return { ...gaussianUpdate({ mean: 0, precision: 1, confidence: 0.5, source: 'prior' }, { mean: delta, precision, confidence: Math.min(b.confidence, i.confidence), source: 'personal' }), delta, baseline: b, intervention: i }
}
