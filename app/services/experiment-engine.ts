export interface NOf1Observation { recordedAt: string; metric: string; value: number }
export interface NOf1Experiment {
  id: string
  intervention: string
  metric?: string
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

export function summarizeNOf1(experiment: NOf1Experiment, nowInput: Date = new Date()) {
  const baselineDays = Math.max(0, Math.floor(experiment.baselineDays))
  const interventionDays = Math.max(0, Math.floor(experiment.interventionDays))
  const washoutDays = Math.max(0, Math.floor(experiment.washoutDays ?? 0))
  const now = new Date(nowInput)
  const interventionStart = new Date(now)
  interventionStart.setDate(interventionStart.getDate() - interventionDays)
  const washoutStart = new Date(interventionStart)
  washoutStart.setDate(washoutStart.getDate() - washoutDays)
  const baselineStart = new Date(washoutStart)
  baselineStart.setDate(baselineStart.getDate() - baselineDays)

  const observations = experiment.observations.filter((item) => {
    const date = new Date(item.recordedAt)
    return Number.isFinite(item.value) && !Number.isNaN(date.getTime()) && (!experiment.metric || item.metric === experiment.metric)
  })

  // The washout interval is open at its baseline-side boundary: an observation
  // exactly at washoutStart belongs to baseline, while observations after it
  // and through interventionStart are washout. The intervention start itself
  // remains outside the intervention window.
  const baseline = observations.filter((item) => {
    const date = new Date(item.recordedAt)
    return date >= baselineStart && date <= washoutStart
  })
  const intervention = observations.filter((item) => {
    const date = new Date(item.recordedAt)
    return date > interventionStart && date <= now
  })
  const baselineValues = baseline.map((x) => x.value)
  const interventionValues = intervention.map((x) => x.value)
  const baselineMean = mean(baselineValues)
  const interventionMean = mean(interventionValues)
  const baselineSd = standardDeviation(baselineValues, baselineMean)
  const interventionSd = standardDeviation(interventionValues, interventionMean)
  const delta = baselineMean === undefined || interventionMean === undefined ? undefined : interventionMean - baselineMean
  const pooledSd = baselineSd === undefined || interventionSd === undefined ? undefined : Math.sqrt((baselineSd ** 2 + interventionSd ** 2) / 2)
  const standardizedEffect = delta === undefined || pooledSd === undefined || pooledSd === 0 ? undefined : delta / pooledSd

  return {
    baselineMean,
    interventionMean,
    baselineSd,
    interventionSd,
    delta,
    standardizedEffect,
    baselineCount: baseline.length,
    interventionCount: intervention.length,
    washoutDays,
    metric: experiment.metric,
    interpretation: standardizedEffect === undefined
      ? 'Insufficient data for standardised effect estimation.'
      : Math.abs(standardizedEffect) < 0.2
        ? 'Small signal'
        : Math.abs(standardizedEffect) < 0.5
          ? 'Moderate signal'
          : 'Large signal',
  }
}
