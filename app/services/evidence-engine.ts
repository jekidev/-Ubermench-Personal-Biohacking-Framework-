import type { EvidenceItem, EvidenceLevel, PersonalBiologyProfile } from '~/types/biology'

const BASE_WEIGHT: Record<EvidenceLevel, number> = { 'meta-analysis': 0.95, 'randomized-trial': 0.9, 'human-study': 0.75, observational: 0.6, mechanistic: 0.35, animal: 0.2, 'in-silico': 0.1, 'expert-opinion': 0.25 }

export const HUMAN_OUTCOME_LEVELS: EvidenceLevel[] = ['meta-analysis', 'randomized-trial', 'human-study', 'observational']
export const MECHANISTIC_LEVELS: EvidenceLevel[] = ['mechanistic', 'animal', 'in-silico', 'expert-opinion']

export function scoreEvidence(item: EvidenceItem): number {
  const quality = BASE_WEIGHT[item.evidenceLevel] ?? 0
  return Math.max(0, Math.min(1, quality * Math.max(0, Math.min(1, item.confidence))))
}

export function aggregateEvidence(items: EvidenceItem[]): number {
  if (!items.length) return 0
  const weighted = items.reduce((sum, item) => sum + scoreEvidence(item), 0)
  return Math.min(1, weighted / Math.max(1, Math.sqrt(items.length)))
}

export function aggregateHumanOutcomeEvidence(items: EvidenceItem[]): number {
  const human = items.filter((item) => HUMAN_OUTCOME_LEVELS.includes(item.evidenceLevel))
  return aggregateEvidence(human)
}

export function aggregateMechanisticPlausibility(items: EvidenceItem[]): number {
  const mechanistic = items.filter((item) => MECHANISTIC_LEVELS.includes(item.evidenceLevel))
  return Math.min(0.15, aggregateEvidence(mechanistic) * 0.15)
}

export function combinedEvidenceScore(items: EvidenceItem[]): number {
  const human = aggregateHumanOutcomeEvidence(items)
  const mechanistic = aggregateMechanisticPlausibility(items)
  return Math.min(1, human + mechanistic)
}

export function summarizeEvidence(items: EvidenceItem[]) {
  return {
    count: items.length,
    score: combinedEvidenceScore(items),
    humanOutcomeScore: aggregateHumanOutcomeEvidence(items),
    mechanisticPlausibilityScore: aggregateMechanisticPlausibility(items),
    strongest: [...items].sort((a, b) => scoreEvidence(b) - scoreEvidence(a))[0],
  }
}

export function buildEvidenceQuery(profile: PersonalBiologyProfile, goal: string): string {
  const biomarkers = profile.biomarkers.slice(-8).map((item) => `${item.name} ${item.value} ${item.unit}`)
  const variants = profile.variants.slice(0, 8).map((item) => item.rsId ?? item.gene ?? item.genotype)
  return [goal, ...biomarkers, ...variants].filter(Boolean).join(' ')
}
