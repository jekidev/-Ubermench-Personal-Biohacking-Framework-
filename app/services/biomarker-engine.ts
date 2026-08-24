import type { BiomarkerRecord } from '~/types/biology'

export interface BiomarkerTrend { name: string; unit: string; count: number; first?: BiomarkerRecord; latest?: BiomarkerRecord; delta?: number; percentChange?: number; direction: 'up' | 'down' | 'stable' | 'insufficient-data' }

export function calculateBiomarkerTrend(records: BiomarkerRecord[], name: string): BiomarkerTrend {
  const values = records.filter((item) => item.name.toLowerCase() === name.toLowerCase()).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  if (values.length < 2) return { name, unit: values[0]?.unit ?? '', count: values.length, first: values[0], latest: values.at(-1), direction: 'insufficient-data' }
  const first = values[0]
  const latest = values.at(-1)!
  const delta = latest.value - first.value
  const percentChange = first.value === 0 ? undefined : (delta / Math.abs(first.value)) * 100
  const direction = Math.abs(delta) < Math.max(Math.abs(first.value) * 0.01, 0.000001) ? 'stable' : delta > 0 ? 'up' : 'down'
  return { name, unit: latest.unit, count: values.length, first, latest, delta, percentChange, direction }
}

export function getBiomarkerNames(records: BiomarkerRecord[]): string[] {
  return [...new Set(records.map((item) => item.name))].sort()
}
