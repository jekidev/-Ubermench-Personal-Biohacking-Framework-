import type { HFModelEngine } from '~/types/hf-model'
import type { LLMRequest } from '~/types/llm'
import type { InterventionCandidate } from '~/types/biology'
import type { ObjectiveWeight } from '~/types/core'
import type { DailyPlanRequest, PolicyRule } from '~/types/adaptive'
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
import { estimateInterventionEffect, type CausalObservation } from '~/services/causal-engine'
import { simulateIntervention } from '~/services/digital-twin-simulator'
import { SemanticMemoryIndex } from '~/services/semantic-memory'
import { normalizeHealthRecords, deduplicateHealthRecords, type UnifiedHealthRecord } from '~/services/health-data-normalizer'
import { evaluatePolicyRules } from '~/services/policy-engine'
import { buildDailyPlan } from '~/services/daily-planner'
import { learnOutcome } from '~/services/outcome-learning'
import { rankValueOfInformation } from '~/services/value-of-information'
import { usePersonalBiology } from './usePersonalBiology'
import { useLLM } from './useLLM'

const memory = new SemanticMemoryIndex()

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

  async function simulate(intervention: InterventionCandidate, horizonDays = 28) {
    await biology.initialize()
    return simulateIntervention(biology.profile.value, { intervention, horizonDays })
  }

  function estimateEffect(observations: CausalObservation[], metric: string, intervention: string) {
    return estimateInterventionEffect(observations, metric, intervention)
  }

  function evaluatePolicy(observations: Array<{ metric: string; value: number }>, rules: PolicyRule[]) {
    return evaluatePolicyRules(observations, rules)
  }

  async function dailyPlan(request: Omit<DailyPlanRequest, 'profile'>) {
    await biology.initialize()
    return buildDailyPlan({ ...request, profile: biology.profile.value })
  }

  function learn(metric: string, baseline: number[], intervention: number[]) {
    return learnOutcome(metric, baseline, intervention)
  }

  async function valueOfInformation() {
    await biology.initialize()
    return rankValueOfInformation(biology.profile.value)
  }

  function remember(item: Parameters<typeof memory.upsert>[0]) { return memory.upsert(item) }
  function recall(query: string, embedding?: number[], limit = 10) { return memory.search(query, embedding, limit) }

  function ingestHealth(records: Parameters<typeof normalizeHealthRecords>[0], source: UnifiedHealthRecord['source']) {
    return deduplicateHealthRecords(normalizeHealthRecords(records, source))
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

  return {
    selectModel, infer, evidenceQuery, research, buildResearchQuery: buildResearchQueryForGoal,
    safetyCheck, compileGoal, runDecisionLoop, anomalies, dataQuality, dataGaps, timeline,
    simulate, estimateEffect, evaluatePolicy, dailyPlan, learn, valueOfInformation,
    remember, recall, ingestHealth, ask, llm, biology,
  }
}
