import type { CanonicalObservation } from '~/types/personal-state'

export type ExternalHealthSample = {
  id: string
  metric: string
  value: number
  unit?: string
  recordedAt: string
  source: 'apple-health' | 'health-connect' | 'garmin' | 'oura' | 'whoop' | 'fitbit' | 'polar' | 'withings' | 'manual' | 'api'
  quality?: number
  confidence?: number
  metadata?: Record<string, string | number | boolean | null>
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export function normalizeHealthSample(sample: ExternalHealthSample, subjectId: string): CanonicalObservation {
  const quality = Number.isFinite(sample.quality) ? clamp(sample.quality as number) : 1
  const confidence = Number.isFinite(sample.confidence) ? clamp(sample.confidence as number) : 0.9
  return {
    id: `${sample.source}:${sample.id}`,
    subjectId,
    observedAt: sample.recordedAt,
    metric: sample.metric.trim().toLowerCase(),
    value: sample.value,
    unit: sample.unit,
    source: 'wearable',
    sourceRecordId: sample.id,
    quality,
    confidence,
    context: sample.metadata,
    provenance: { importedAt: new Date().toISOString(), adapter: sample.source },
  }
}

export function normalizeHealthSamples(samples: ExternalHealthSample[], subjectId: string): CanonicalObservation[] {
  return samples
    .filter((sample) => Number.isFinite(sample.value) && !Number.isNaN(new Date(sample.recordedAt).getTime()))
    .map((sample) => normalizeHealthSample(sample, subjectId))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
}
