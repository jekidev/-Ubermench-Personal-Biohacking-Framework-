import type { BiomarkerRecord } from '~/types/biology'
import type { LocalObservation } from '../persistence/local-store'

export function observationToBiomarker(observation: LocalObservation): BiomarkerRecord {
  return {
    id: observation.id,
    name: observation.biomarker,
    value: observation.value,
    unit: observation.unit,
    measuredAt: observation.collectedAt,
    source: 'lab-import',
    referenceLow: observation.referenceLow,
    referenceHigh: observation.referenceHigh,
    labName: observation.laboratory,
    notes: observation.locator,
  }
}

export function mergeObservationsIntoBiomarkers(
  existing: BiomarkerRecord[],
  observations: LocalObservation[],
): BiomarkerRecord[] {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const observation of observations) {
    byId.set(observation.id, observationToBiomarker(observation))
  }
  return [...byId.values()].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
}
