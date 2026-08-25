import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import type { CanonicalObservation, InterventionEvent } from '~/types/personal-state'
import { runBiohackingLoop, type BiohackingLoopResult } from './biohacking-loop'
import { appendCanonicalObservations, appendHumanState, appendInterventionEvents, type PersonalStateStore } from './personal-state-store'

export interface PersonalStateRuntimeInput {
  subjectId: string
  profile: PersonalBiologyProfile
  observations?: CanonicalObservation[]
  interventionEvents?: InterventionEvent[]
  candidates: InterventionCandidate[]
  activeInterventions?: string[]
  activeExperiments?: string[]
  alerts?: string[]
}

export interface PersonalStateRuntimeResult {
  store: PersonalStateStore
  loop: BiohackingLoopResult
}

export function ingestAndRunPersonalState(store: PersonalStateStore, input: PersonalStateRuntimeInput, now = new Date().toISOString()): PersonalStateRuntimeResult {
  let nextStore = store
  if (input.observations?.length) nextStore = appendCanonicalObservations(nextStore, input.observations, now)
  if (input.interventionEvents?.length) nextStore = appendInterventionEvents(nextStore, input.interventionEvents, now)

  const subjectObservations = nextStore.observations.filter((item) => item.subjectId === input.subjectId)
  const loop = runBiohackingLoop({
    subjectId: input.subjectId,
    profile: input.profile,
    observations: subjectObservations,
    candidates: input.candidates,
    activeInterventions: input.activeInterventions,
    activeExperiments: input.activeExperiments,
    alerts: input.alerts,
  })
  nextStore = appendHumanState(nextStore, loop.state, now)
  return { store: nextStore, loop }
}
