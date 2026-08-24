export type UnifiedHealthRecord = {
  id: string
  kind: 'biomarker' | 'sleep' | 'training' | 'heart-rate' | 'hrv' | 'activity'
  recordedAt: string
  value?: number
  unit?: string
  name?: string
  source: 'health-connect' | 'apple-health' | 'garmin' | 'oura' | 'whoop' | 'fitbit' | 'polar' | 'csv' | 'json' | 'manual'
  provenance?: string
}

function validIso(value: string) {
  return !Number.isNaN(Date.parse(value))
}

export function normalizeHealthRecords(records: Array<Partial<UnifiedHealthRecord> & { recordedAt: string; kind: UnifiedHealthRecord['kind'] }>, source: UnifiedHealthRecord['source']): UnifiedHealthRecord[] {
  return records.filter((item) => validIso(item.recordedAt)).map((item, index) => ({
    id: item.id ?? `${source}-${item.recordedAt}-${item.kind}-${index}`,
    kind: item.kind,
    recordedAt: new Date(item.recordedAt).toISOString(),
    value: typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : undefined,
    unit: item.unit?.trim() || undefined,
    name: item.name?.trim() || undefined,
    source,
    provenance: item.provenance ?? source,
  }))
}

export function deduplicateHealthRecords(records: UnifiedHealthRecord[]) {
  const map = new Map<string, UnifiedHealthRecord>()
  for (const record of records) {
    const key = `${record.kind}|${record.name ?? ''}|${record.recordedAt}|${record.value ?? ''}|${record.unit ?? ''}`
    if (!map.has(key)) map.set(key, record)
  }
  return [...map.values()].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}
