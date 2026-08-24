import type { HFModelEngine } from '~/types/hf-model'
import type { LLMRequest } from '~/types/llm'
import type { InterventionCandidate } from '~/types/biology'
import type { ObjectiveWeight } from '~/types/core'
import { routeHFModel } from '~/services/hf-router'
import { runHFInference } from '~/services/inference-engine'
import { buildEvidenceQuery } from '~/services/evidence-engine'
import { buildResearchQuery } from '~/services/research-engine'
import { runResearchWorkflow } from '~/services/research-workflow'
import { screenInterventionSafety } from '~/services/safety-engine'
import { compileProtocol } from '~/services/protocol-compiler'
import { runClosedLoop } from '~/services/closed-loop-engine'
import { detectAnomalies } from '~/services/anomaly-engine'
import { assessDataQuality, identifyDataGaps } from '~/services/data-quality-engine'
import { buildBiologyTimeline } from '~/services/timeline-engine'
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

  async function compileGoal(goal: string, candidates: InterventionCandidate[] = [], objectives?: ObjectiveWeight[]) {
    await biology.initialize()
    return compileProtocol(biology.profile.value, { goal, candidates, objectives })
  }

  async function runDecisionLoop(request: Parameters<typeof runClosedLoop>[1]) {
    await biology.initialize()
    return runClosedLoop(biology.profile.value, request)
  }

  async function anomalies(metrics: Parameters<typeof detectAnomalies>[0], baselines: Parameters<typeof detectAnomalies>[1]) {
    return detectAnomalies(metrics, baselines)
  }

  async function dataQuality() {
    await biology.initialize()
    return assessDataQuality(biology.profile.value)
  }

  async function dataGaps() {
    await biology.initialize()
    return identifyDataGaps(biology.profile.value)
  }

  async function timeline() {
    await biology.initialize()
    return buildBiologyTimeline(biology.profile.value)
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

  return { selectModel, infer, evidenceQuery, research, buildResearchQuery: buildResearchQueryForGoal, safetyCheck, compileGoal, runDecisionLoop, anomalies, dataQuality, dataGaps, timeline, ask, llm, biology }
}
