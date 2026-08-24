import type { HFModelEngine } from '~/types/hf-model'
import type { LLMRequest } from '~/types/llm'
import { routeHFModel } from '~/services/hf-router'
import { runHFInference } from '~/services/inference-engine'
import { buildEvidenceQuery } from '~/services/evidence-engine'
import { searchEuropePMC, buildResearchQuery } from '~/services/research-engine'
import { screenInterventionSafety } from '~/services/safety-engine'
import { usePersonalBiology } from './usePersonalBiology'
import { useLLM } from './useLLM'

export function useBiohackingAI() {
  const biology = usePersonalBiology()
  const llm = useLLM()

  function selectModel(engine: HFModelEngine) { return routeHFModel(engine, { runtime: 'hybrid' }) }

  async function infer(engine: HFModelEngine, inputs: string | Record<string, unknown>, token?: string) {
    const model = selectModel(engine)
    if (!model) throw new Error(`No suitable model available for ${engine}`)
    return runHFInference({ model, inputs, token })
  }

  function evidenceQuery(goal: string) {
    return buildEvidenceQuery(biology.profile.value, goal)
  }

  async function research(goal: string) {
    const profile = biology.profile.value
    const query = buildResearchQuery(
      goal,
      profile.biomarkers.slice(-8).map((x) => `${x.name} ${x.value} ${x.unit}`),
      profile.variants.slice(0, 8).map((x) => x.rsId ?? x.gene ?? x.genotype),
    )
    return searchEuropePMC(query)
  }

  function safetyCheck(intervention: string) {
    return screenInterventionSafety(intervention, biology.profile.value.medications, biology.profile.value.supplements)
  }

  async function ask(request: LLMRequest) {
    return llm.run(request)
  }

  return { selectModel, infer, evidenceQuery, research, safetyCheck, ask, llm, biology }
}
