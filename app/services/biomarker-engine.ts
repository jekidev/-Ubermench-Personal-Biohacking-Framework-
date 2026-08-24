import type { BiomarkerRecord } from '~/types/biology'

export interface BiomarkerTrend {
  name: string
  unit: string
  count: number
  first?: BiomarkerRecord
  latest?: BiomarkerRecord
  delta?: number
  percentChange?: number
  direction: 'up' | 'down' | 'stable' | 'insufficient-data' | 'unit-mismatch'
}

function validDate(value: string) {
  return !Number.isNaN(Date.parse(value))
}

export function calculateBiomarkerTrend(records: BiomarkerRecord[], name: string): BiomarkerTrend {
  const values = records
    .filter((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase())
    .filter((item) => Number.isFinite(item.value) && validDate(item.measuredAt))
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))

  if (values.length < 2) return { name, unit: values[0]?.unit ?? '', count: values.length, first: values[0], latest: values.at(-1), direction: 'insufficient-data' }

  const units = new Set(values.map((item) => item.unit.trim()))
  if (units.size > 1) {
    const latest = values.at(-1)
    return { name, unit: latest?.unit ?? '', count: values.length, first: values[0], latest, direction: 'unit-mismatch' }
  }

  const first = values[0]
  const latest = values.at(-1)
  if (!first || !latest) return { name, unit: '', count: values.length, direction: 'insufficient-data' }
  const delta = latest.value - first.value
  const percentChange = first.value === 0 ? undefined : (delta / Math.abs(first.value)) * 100
  const direction = Math.abs(delta) < Math.max(Math.abs(first.value) * 0.01, 0.000001) ? 'stable' : delta > 0 ? 'up' : 'down'
  return { name, unit: latest.unit, count: values.length, first, latest, delta, percentChange, direction }
}

export function getBiomarkerNames(records: BiomarkerRecord[]): string[] {
  return [...new Set(records.map((item) => item.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
