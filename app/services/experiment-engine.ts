export interface NOf1Observation { recordedAt: string; metric: string; value: number }
export interface NOf1Experiment {
  id: string
  intervention: string
  baselineDays: number
  interventionDays: number
  washoutDays?: number
  observations: NOf1Observation[]
  status: 'planned' | 'running' | 'complete'
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

function standardDeviation(values: number[], average?: number) {
  if (values.length < 2 || average === undefined) return undefined
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function summarizeNOf1(experiment: NOf1Experiment) {
  const now = new Date()
  const interventionStart = new Date(now)
  interventionStart.setDate(interventionStart.getDate() - experiment.interventionDays)
  const baselineStart = new Date(interventionStart)
  baselineStart.setDate(baselineStart.getDate() - experiment.baselineDays)

  const baseline = experiment.observations.filter((item) => {
    const date = new Date(item.recordedAt)
    return date >= baselineStart && date < interventionStart
  })
  const recent = experiment.observations.filter((item) => new Date(item.recordedAt) >= interventionStart)
  const baselineValues = baseline.map((x) => x.value)
  const interventionValues = recent.map((x) => x.value)
  const baselineMean = mean(baselineValues)
  const interventionMean = mean(interventionValues)
  const baselineSd = standardDeviation(baselineValues, baselineMean)
  const interventionSd = standardDeviation(interventionValues, interventionMean)
  const delta = baselineMean === undefined || interventionMean === undefined ? undefined : interventionMean - baselineMean
  const pooledSd = baselineSd === undefined || interventionSd === undefined ? undefined : Math.sqrt((baselineSd ** 2 + interventionSd ** 2) / 2)
  const standardizedEffect = delta === undefined || !pooledSd || pooledSd === 0 ? undefined : delta / pooledSd

  return {
    baselineMean,
    interventionMean,
    baselineSd,
    interventionSd,
    delta,
    standardizedEffect,
    baselineCount: baseline.length,
    interventionCount: recent.length,
    interpretation: standardizedEffect === undefined ? 'Insufficient data for standardised effect estimation.' : Math.abs(standardizedEffect) < 0.2 ? 'Small signal' : Math.abs(standardizedEffect) < 0.5 ? 'Moderate signal' : 'Large signal',
  }
}
