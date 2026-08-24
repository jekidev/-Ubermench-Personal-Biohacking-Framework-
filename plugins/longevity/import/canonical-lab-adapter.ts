import { createRecord, type Observation, type Provenance } from '../domain/canonical-records'

export type LabCandidate = {
  id: string
  key: string
  value: number | string | null
  unit?: string
  observedAt: string
  referenceRange?: { low?: number; high?: number; unit?: string }
  sourcePage?: number
  confidence: number
  provenance: Provenance
}

export function labCandidateToRecord(candidate: LabCandidate) {
  const payload: Observation = {
    subject: 'biomarker',
    key: candidate.key.trim(),
    value: candidate.value,
    unit: candidate.unit?.trim(),
    observedAt: candidate.observedAt,
    referenceRange: candidate.referenceRange,
    status: 'candidate',
  }

  return createRecord({
    id: candidate.id,
    kind: 'observation',
    payload,
    provenance: [{ ...candidate.provenance, sourcePage: candidate.sourcePage, confidence: candidate.confidence }],
  })
}

export function normalizeNumericUnit(value: number, analyte: string, unit: string, targetUnit: string): number {
  if (unit.trim().toLowerCase() === targetUnit.trim().toLowerCase()) return value
  const key = `${analyte.trim().toLowerCase()}:${unit.trim().toLowerCase()}->${targetUnit.trim().toLowerCase()}`
  const factors: Record<string, number> = {
    'glucose:mg/dl->mmol/l': 0.0555,
    'glucose:mmol/l->mg/dl': 18.0182,
  }
  const factor = factors[key]
  if (factor === undefined) throw new Error(`Unsupported unit conversion for ${analyte}: ${unit} -> ${targetUnit}`)
  return value * factor
}
