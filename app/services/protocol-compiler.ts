import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { CompiledProtocol, GoalSpec, ObjectiveWeight } from '~/types/core'
import { deriveBiologicalState } from './digital-twin'
import { buildResearchQuery } from './research-engine'
import { rankByObjectives } from './objective-engine'
import { screenInterventionSafety } from './safety-engine'

export interface ProtocolCompileRequest {
  goal: string
  objectives?: ObjectiveWeight[]
  candidates?: InterventionCandidate[]
  monitoring?: string[]
}

function normalizeObjectives(objectives: ObjectiveWeight[] | undefined): ObjectiveWeight[] {
  if (objectives?.length) return objectives.map((item) => ({ ...item, weight: Math.max(0, item.weight) })).filter((item) => item.weight > 0)
  return [{ id: 'longevity', weight: 0.4 }, { id: 'cardiovascular', weight: 0.2 }, { id: 'brain', weight: 0.1 }, { id: 'recovery', weight: 0.2 }, { id: 'quality-of-life', weight: 0.1 }]
}

export function compileProtocol(profile: PersonalBiologyProfile, request: ProtocolCompileRequest): CompiledProtocol {
  const createdAt = new Date().toISOString()
  const objectives = normalizeObjectives(request.objectives)
  const goal: GoalSpec = { id: crypto.randomUUID(), title: request.goal.trim() || 'Personal health optimization', objectives, createdAt }
  const researchQuery = buildResearchQuery(
    goal.title,
    profile.biomarkers.slice(-8).map((item) => `${item.name} ${item.value} ${item.unit}`),
    profile.variants.slice(0, 8).map((item) => item.rsId ?? item.gene ?? item.genotype),
  )
  const candidates = rankByObjectives(request.candidates ?? [], profile, objectives)
  const steps = candidates.slice(0, 5).map((candidate) => {
    const safetyFlags = screenInterventionSafety(candidate.name, profile.medications, profile.supplements)
    const severity = safetyFlags.reduce<'green' | 'yellow' | 'orange' | 'red'>((current, flag) => {
      const rank = { green: 0, yellow: 1, orange: 2, red: 3 } as const
      return rank[flag.severity] > rank[current] ? flag.severity : current
    }, 'green')
    return {
      id: candidate.id,
      intervention: candidate.name,
      rationale: candidate.mechanism ? `${candidate.mechanism}. Ranked against current objectives and personal fit.` : 'Ranked against current objectives and personal fit.',
      priority: candidate.priority,
      safety: severity,
      monitoring: request.monitoring?.length ? request.monitoring : ['Track adherence and relevant symptoms/biomarkers.', 'Reassess after a predefined observation window.'],
      evidence: candidate.evidence,
    }
  })

  const evidenceCount = candidates.reduce((sum, item) => sum + item.evidence.length, 0)
  const uncertainty: CompiledProtocol['uncertainty'] = evidenceCount === 0 || steps.length === 0 ? 'high' : evidenceCount < steps.length * 2 ? 'moderate' : 'low'

  return {
    goal,
    biologicalState: deriveBiologicalState(profile),
    researchQuery,
    steps,
    alternatives: candidates.slice(5),
    uncertainty,
    generatedAt: createdAt,
  }
}
