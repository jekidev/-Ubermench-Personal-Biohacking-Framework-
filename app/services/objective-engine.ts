import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { ObjectiveId, ObjectiveWeight, OptimizationResult } from '~/types/core'

const OBJECTIVE_TERMS: Record<ObjectiveId, string[]> = {
  longevity: ['longevity', 'lifespan', 'healthspan', 'aging'],
  cardiovascular: ['cardiovascular', 'heart', 'blood pressure', 'lipid', 'apoB'],
  metabolic: ['metabolic', 'glucose', 'insulin', 'hba1c', 'lipid'],
  brain: ['brain', 'cognition', 'memory', 'neuro'],
  'mental-resilience': ['stress', 'resilience', 'anxiety', 'ptsd', 'mood'],
  sleep: ['sleep', 'circadian', 'insomnia', 'hrv'],
  performance: ['performance', 'strength', 'vo2', 'muscle', 'training'],
  recovery: ['recovery', 'fatigue', 'hrv', 'rest'],
  'quality-of-life': ['quality of life', 'wellbeing', 'function'],
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

function candidateObjectiveScore(candidate: InterventionCandidate, objective: ObjectiveId, profile: PersonalBiologyProfile): number {
  const terms = OBJECTIVE_TERMS[objective]
  const haystack = [candidate.name, candidate.mechanism ?? '', ...candidate.expectedBenefits].join(' ').toLowerCase()
  const relevance = terms.some((term) => haystack.includes(term)) ? 1 : 0.25
  const evidence = candidate.evidence.length ? candidate.evidence.reduce((sum, item) => sum + item.confidence, 0) / candidate.evidence.length : 0
  const personalFit = clamp(candidate.personalFit)
  const existingBurden = profile.medications.filter((item) => item.active).length + profile.supplements.filter((item) => item.active).length
  const burdenPenalty = Math.min(0.15, existingBurden * 0.01)
  return clamp(relevance * 0.35 + evidence * 0.35 + personalFit * 0.3 - burdenPenalty)
}

export function scoreCandidateObjectives(candidate: InterventionCandidate, profile: PersonalBiologyProfile, objectives: ObjectiveWeight[]): OptimizationResult {
  const safeObjectives = objectives.length ? objectives : [{ id: 'longevity' as const, weight: 1 }]
  const objectiveScores = {} as Record<ObjectiveId, number>
  let weighted = 0
  let weightTotal = 0

  for (const objective of safeObjectives) {
    const score = candidateObjectiveScore(candidate, objective.id, profile)
    objectiveScores[objective.id] = score
    weighted += score * Math.max(0, objective.weight)
    weightTotal += Math.max(0, objective.weight)
  }

  return { objectiveScores, weightedScore: weightTotal ? clamp(weighted / weightTotal) : 0 }
}

export function rankByObjectives(candidates: InterventionCandidate[], profile: PersonalBiologyProfile, objectives: ObjectiveWeight[]) {
  return candidates.map((candidate) => {
    const result = scoreCandidateObjectives(candidate, profile, objectives)
    return { ...candidate, priority: result.weightedScore, optimization: result }
  }).sort((a, b) => b.priority - a.priority)
}
