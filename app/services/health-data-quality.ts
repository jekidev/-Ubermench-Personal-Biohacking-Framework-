import type { CanonicalObservation } from '~/types/personal-state'

export type ObservationQualityReason =
  | 'invalid-value'
  | 'invalid-timestamp'
  | 'missing-provenance'
  | 'low-source-quality'
  | 'low-confidence'
  | 'well-formed'

export interface ObservationQuality {
  score: number
  usable: boolean
  reasons: ObservationQualityReason[]
}

export interface ObservationConflict {
  key: string
  candidates: string[]
  selectedId: string
}

export interface ObservationResolution {
  observations: CanonicalObservation[]
  conflicts: ObservationConflict[]
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export function scoreObservationQuality(observation: CanonicalObservation): ObservationQuality {
  const reasons: ObservationQualityReason[] = []
  let score = 1

  if (!Number.isFinite(observation.value)) {
    score = 0
    reasons.push('invalid-value')
  }

  if (Number.isNaN(new Date(observation.observedAt).getTime())) {
    score = 0
    reasons.push('invalid-timestamp')
  }

  if (!observation.provenance?.adapter && !observation.provenance?.sourceVersion) {
    score *= 0.9
    reasons.push('missing-provenance')
  }

  if (observation.quality < 0.5) {
    score *= 0.75
    reasons.push('low-source-quality')
  }

  if (observation.confidence < 0.5) {
    score *= 0.8
    reasons.push('low-confidence')
  }

  if (reasons.length === 0) reasons.push('well-formed')

  return { score: clamp(score), usable: score > 0, reasons }
}

function conflictKey(observation: CanonicalObservation): string {
  const timestamp = new Date(observation.observedAt).getTime()
  const bucket = Number.isNaN(timestamp) ? observation.observedAt : Math.round(timestamp / 60_000)
  return `${observation.subjectId}|${observation.metric}|${observation.unit ?? ''}|${bucket}`
}

function rankingScore(observation: CanonicalObservation): number {
  const quality = scoreObservationQuality(observation).score
  return quality * 0.5 + clamp(observation.quality) * 0.25 + clamp(observation.confidence) * 0.25
}

export function resolveObservationConflicts(observations: CanonicalObservation[]): ObservationResolution {
  const groups = new Map<string, CanonicalObservation[]>()
  for (const observation of observations) {
    const key = conflictKey(observation)
    const group = groups.get(key) ?? []
    group.push(observation)
    groups.set(key, group)
  }

  const resolved: CanonicalObservation[] = []
  const conflicts: ObservationConflict[] = []

  for (const [key, group] of groups) {
    const ranked = [...group].sort((a, b) => {
      const scoreDifference = rankingScore(b) - rankingScore(a)
      if (scoreDifference !== 0) return scoreDifference
      return new Date(b.provenance?.importedAt ?? 0).getTime() - new Date(a.provenance?.importedAt ?? 0).getTime()
    })

    const selected = ranked[0]
    if (!selected) continue
    resolved.push(selected)

    if (group.length > 1) {
      conflicts.push({
        key,
        candidates: group.map((observation) => observation.id),
        selectedId: selected.id,
      })
    }
  }

  return {
    observations: resolved.sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()),
    conflicts,
  }
}
