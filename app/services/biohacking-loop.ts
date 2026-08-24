import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { CanonicalObservation, HumanState } from '~/types/personal-state'
import { buildHumanState } from './human-state-engine'
import { rankInterventions } from './intervention-engine'
import { personalEffect } from './bayesian-personalization'

export interface BiohackingLoopInput {
  subjectId: string
  profile: PersonalBiologyProfile
  observations: CanonicalObservation[]
  candidates: InterventionCandidate[]
  activeInterventions?: string[]
  activeExperiments?: string[]
  alerts?: string[]
}

export interface BiohackingLoopResult {
  state: HumanState
  rankedInterventions: InterventionCandidate[]
  personalSignals: Record<string, ReturnType<typeof personalEffect>>
}

export function runBiohackingLoop(input: BiohackingLoopInput): BiohackingLoopResult {
  const state = buildHumanState(input.subjectId, input.observations, input.activeInterventions, input.activeExperiments, input.alerts)
  const rankedInterventions = rankInterventions(input.profile, input.candidates)
  const personalSignals: BiohackingLoopResult['personalSignals'] = {}
  for (const candidate of rankedInterventions) {
    const relevant = input.observations.filter((x) => x.context?.intervention === candidate.name)
    const baseline = relevant.filter((x) => x.context?.phase === 'baseline').map((x) => x.value)
    const intervention = relevant.filter((x) => x.context?.phase === 'intervention').map((x) => x.value)
    if (baseline.length && intervention.length) personalSignals[candidate.id] = personalEffect(baseline, intervention)
  }
  return { state, rankedInterventions, personalSignals }
}
