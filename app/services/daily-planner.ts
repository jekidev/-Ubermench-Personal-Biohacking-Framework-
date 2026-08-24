import type { DailyPlan, DailyPlanRequest } from '~/types/adaptive'
import { evaluatePolicyRules, DEFAULT_ADAPTATION_RULES } from './policy-engine'
import { rankByObjectives } from './objective-engine'
import { rankValueOfInformation } from './value-of-information'

function readiness(observations: DailyPlanRequest['observations']) {
  const hrv = observations.find((x) => x.metric.toLowerCase() === 'hrv')?.value
  const rhr = observations.find((x) => x.metric.toLowerCase() === 'resting-heart-rate')?.value
  let score = 0.7
  if (typeof hrv === 'number') score += Math.max(-0.25, Math.min(0.25, (hrv - 50) / 200))
  if (typeof rhr === 'number') score -= Math.max(-0.15, Math.min(0.15, (rhr - 60) / 200))
  return Math.max(0, Math.min(1, score))
}

export function buildDailyPlan(request: DailyPlanRequest): DailyPlan {
  const readinessScore = readiness(request.observations)
  const recoveryState: DailyPlan['recoveryState'] = readinessScore < 0.6 ? 'low' : readinessScore < 0.75 ? 'moderate' : 'good'
  const ranked = rankByObjectives(request.profile.goals.map((goal, index) => ({
    id: `goal-${index}`,
    name: goal,
    expectedBenefits: [goal],
    risks: [],
    interactions: [],
    evidence: [],
    personalFit: 1,
    priority: 0,
  })), request.profile, request.objectives)
  const policy = evaluatePolicyRules(request.observations, DEFAULT_ADAPTATION_RULES)
  const suppressedSteps = policy.action === 'reduce' || policy.action === 'pause' || policy.action === 'collect-data' ? request.protocol : []
  const actions = suppressedSteps.length
    ? [{ title: 'Reduce or defer new intervention load', reason: policy.rationale.join(' '), safety: 'yellow' as const }]
    : request.protocol.slice(0, 3).map((step) => ({ title: step.intervention, reason: step.rationale, safety: step.safety }))
  const valueInfo = rankValueOfInformation(request.profile)
  if (valueInfo[0] && policy.action === 'collect-data') actions.unshift({ title: `Collect ${valueInfo[0].metric}`, reason: valueInfo[0].rationale, safety: 'green' })

  return {
    date: new Date().toISOString().slice(0, 10),
    readiness: readinessScore,
    recoveryState,
    priorities: ranked.slice(0, 5).map((item) => ({ id: item.id, title: item.name, score: item.priority })),
    actions,
    suppressedSteps,
  }
}
