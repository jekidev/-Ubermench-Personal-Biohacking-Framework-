import type { HFModelEngine } from '~/types/hf-model'
import { routeHFModel } from '~/services/hf-router'
import { runHFInference } from '~/services/inference-engine'
import { buildEvidenceQuery } from '~/services/evidence-engine'
import { usePersonalBiology } from './usePersonalBiology'

export function useBiohackingAI() {
  const biology = usePersonalBiology()

  function selectModel(engine: HFModelEngine) { return routeHFModel(engine, { runtime: 'hybrid' }) }

  async function infer(engine: HFModelEngine, inputs: string | Record<string, unknown>, token?: string) {
    const model = selectModel(engine)
    if (!model) throw new Error(`No suitable model available for ${engine}`)
    return runHFInference({ model, inputs, token })
  }

  function evidenceQuery(goal: string) {
    return buildEvidenceQuery(biology.profile.value, goal)
  }

  return { selectModel, infer, evidenceQuery, biology }
}
