import type { HFModelEngine } from '~/types/hf-model'
import type { LLMRequest } from '~/types/llm'
import { routeHFModel } from '~/services/hf-router'
import { runHFInference } from '~/services/inference-engine'
import { buildEvidenceQuery } from '~/services/evidence-engine'
import { buildResearchQuery } from '~/services/research-engine'
import { runResearchWorkflow } from '~/services/research-workflow'
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
    await biology.initialize()
    const profile = biology.profile.value
    return runResearchWorkflow({
      goal,
      biomarkers: profile.biomarkers.slice(-8).map((x) => `${x.name} ${x.value} ${x.unit}`),
      variants: profile.variants.slice(0, 8).map((x) => x.rsId ?? x.gene ?? x.genotype),
    })
  }

  function buildResearchQueryForGoal(goal: string) {
    const profile = biology.profile.value
    return buildResearchQuery(
      goal,
      profile.biomarkers.slice(-8).map((x) => `${x.name} ${x.value} ${x.unit}`),
      profile.variants.slice(0, 8).map((x) => x.rsId ?? x.gene ?? x.genotype),
    )
  }

  function safetyCheck(intervention: string) {
    return screenInterventionSafety(intervention, biology.profile.value.medications, biology.profile.value.supplements)
  }

  async function ask(request: LLMRequest) {
    await biology.initialize()
    const context = [
      ...biology.profile.value.goals.map((goal) => `Goal: ${goal}`),
      ...biology.profile.value.biomarkers.slice(-8).map((x) => `Biomarker: ${x.name} ${x.value} ${x.unit}`),
      ...biology.profile.value.variants.slice(0, 8).map((x) => `Variant: ${x.rsId ?? x.gene ?? 'unknown'} ${x.genotype}`),
    ].join('\n')
    const system = [request.system, 'Use the supplied personal biology context when relevant. Do not treat missing data as normal data.', context].filter(Boolean).join('\n\n')
    return llm.run({ ...request, system })
  }

  return { selectModel, infer, evidenceQuery, research, buildResearchQuery: buildResearchQueryForGoal, safetyCheck, ask, llm, biology }
}
