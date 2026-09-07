import type { EvidenceItem } from '~/types/biology'
import { HUMAN_OUTCOME_LEVELS, MECHANISTIC_LEVELS, scoreEvidence } from './evidence-engine'

export type EvidenceFreshnessBand = 'current' | 'aging' | 'stale' | 'unknown'

export interface EvidenceFreshness {
  band: EvidenceFreshnessBand
  ageDays?: number
}

export interface RankedEvidenceRecord<T extends EvidenceItem = EvidenceItem> {
  record: T
  score: number
  freshness: EvidenceFreshness
  evidenceKind: 'human-outcome' | 'mechanistic' | 'unclassified'
}

const CURRENT_DAYS = 365 * 2
const AGING_DAYS = 365 * 5

export function evidenceFreshness(date?: string, now: Date = new Date()): EvidenceFreshness {
  if (!date || Number.isNaN(Date.parse(date))) return { band: 'unknown' }
  const ageDays = Math.max(0, Math.round((now.getTime() - Date.parse(date)) / 86_400_000))
  if (ageDays <= CURRENT_DAYS) return { band: 'current', ageDays }
  if (ageDays <= AGING_DAYS) return { band: 'aging', ageDays }
  return { band: 'stale', ageDays }
}

export function classifyEvidenceKind(item: EvidenceItem): RankedEvidenceRecord['evidenceKind'] {
  if (HUMAN_OUTCOME_LEVELS.includes(item.evidenceLevel)) return 'human-outcome'
  if (MECHANISTIC_LEVELS.includes(item.evidenceLevel)) return 'mechanistic'
  return 'unclassified'
}

export function rankEvidenceRecords<T extends EvidenceItem>(
  records: T[],
  now: Date = new Date(),
): RankedEvidenceRecord<T>[] {
  return [...records]
    .map((record) => ({
      record,
      score: scoreEvidence(record),
      freshness: evidenceFreshness(record.publishedAt, now),
      evidenceKind: classifyEvidenceKind(record),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return (left.freshness.ageDays ?? Number.POSITIVE_INFINITY) - (right.freshness.ageDays ?? Number.POSITIVE_INFINITY)
    })
}
