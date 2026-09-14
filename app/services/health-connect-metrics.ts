const METRIC_ALIASES: Record<string, string> = {
  'resting-heart-rate': 'resting_heart_rate',
  restingheartrate: 'resting_heart_rate',
  'resting hr': 'resting_heart_rate',
  sleepduration: 'sleep',
  sleep_duration: 'sleep',
  hrv_rmssd: 'hrv',
}

export function canonicalizeHealthConnectMetric(metric: string): string {
  const normalized = metric.trim().toLowerCase()
  return METRIC_ALIASES[normalized] ?? normalized
}

export function canonicalizeHealthConnectSample<T extends { metric: string }>(sample: T): T {
  return { ...sample, metric: canonicalizeHealthConnectMetric(sample.metric) }
}
