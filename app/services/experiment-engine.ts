export interface NOf1Observation { recordedAt: string; metric: string; value: number }
export interface NOf1Experiment { id: string; intervention: string; baselineDays: number; interventionDays: number; observations: NOf1Observation[]; status: 'planned' | 'running' | 'complete' }

export function summarizeNOf1(experiment: NOf1Experiment) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - experiment.interventionDays)
  const recent = experiment.observations.filter((item) => new Date(item.recordedAt) >= cutoff)
  const baseline = experiment.observations.filter((item) => new Date(item.recordedAt) < cutoff)
  const mean = (values: NOf1Observation[]) => values.length ? values.reduce((sum, item) => sum + item.value, 0) / values.length : undefined
  const baselineMean = mean(baseline)
  const interventionMean = mean(recent)
  return { baselineMean, interventionMean, delta: baselineMean === undefined || interventionMean === undefined ? undefined : interventionMean - baselineMean, baselineCount: baseline.length, interventionCount: recent.length }
}
