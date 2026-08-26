export interface SensitivityObservation {
  recordedAt: string
  value: number
  phase: 'baseline' | 'intervention'
}

export interface ExperimentSensitivityResult {
  includedCount: number
  excludedCount: number
  baselineCount: number
  interventionCount: number
  baselineMean?: number
  interventionMean?: number
  delta?: number
  leaveOneOutDeltaMin?: number
  leaveOneOutDeltaMax?: number
  missingnessRate: number
  conclusion: 'stable' | 'sensitive-to-observations' | 'insufficient-data'
}

function mean(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

function deltaFor(observations: SensitivityObservation[]): number | undefined {
  const baseline = mean(observations.filter((item) => item.phase === 'baseline').map((item) => item.value))
  const intervention = mean(observations.filter((item) => item.phase === 'intervention').map((item) => item.value))
  return baseline === undefined || intervention === undefined ? undefined : intervention - baseline
}

/**
 * Quantifies whether the observed within-person signal depends heavily on a
 * single observation. Invalid/missing observations are excluded explicitly;
 * they are never converted into zeros.
 */
export function analyzeExperimentSensitivity(observations: SensitivityObservation[]): ExperimentSensitivityResult {
  const included = observations.filter((item) => Number.isFinite(item.value) && Number.isFinite(new Date(item.recordedAt).getTime()))
  const excludedCount = observations.length - included.length
  const baseline = included.filter((item) => item.phase === 'baseline')
  const intervention = included.filter((item) => item.phase === 'intervention')
  const delta = deltaFor(included)

  const leaveOneOutDeltas = included
    .map((_, index) => deltaFor(included.filter((__, candidateIndex) => candidateIndex !== index)))
    .filter((value): value is number => value !== undefined)

  const min = leaveOneOutDeltas.length ? Math.min(...leaveOneOutDeltas) : undefined
  const max = leaveOneOutDeltas.length ? Math.max(...leaveOneOutDeltas) : undefined
  const spread = min === undefined || max === undefined ? undefined : max - min
  const magnitude = delta === undefined ? undefined : Math.max(Math.abs(delta), 1e-9)
  const relativeSpread = spread === undefined || magnitude === undefined ? undefined : spread / magnitude

  let conclusion: ExperimentSensitivityResult['conclusion'] = 'insufficient-data'
  if (delta !== undefined && baseline.length >= 2 && intervention.length >= 2) {
    conclusion = relativeSpread !== undefined && relativeSpread > 0.5 ? 'sensitive-to-observations' : 'stable'
  }

  return {
    includedCount: included.length,
    excludedCount,
    baselineCount: baseline.length,
    interventionCount: intervention.length,
    baselineMean: mean(baseline.map((item) => item.value)),
    interventionMean: mean(intervention.map((item) => item.value)),
    delta,
    leaveOneOutDeltaMin: min,
    leaveOneOutDeltaMax: max,
    missingnessRate: observations.length ? excludedCount / observations.length : 0,
    conclusion,
  }
}
