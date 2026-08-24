import type { DailyPlan, DailyPlanRequest } from '~/types/adaptive'
import { evaluatePolicyRules, DEFAULT_ADAPTATION_RULES } from './policy-engine'
import { rankByObjectives } from './objective-engine'
import { rankValueOfInformation } from './value-of-information'

function readiness(observations: DailyPlanRequest['observations']) {
  const hrv = observations.find((x) => x.metric.toLowerCase() === 'hrv')?.value
  const rhr = observations.find((x) => x.metric.toLowerCase() === 'resting-heart-rate')?.value
  let score = 0.7
  if (typeof hrv === 'number') score += Math.max(-0.35, Math.min(0.25, (hrv - 50) / 100))
  if (typeof rhr === 'number') score -= Math.max(-0.15, Math.min(0.2, (rhr - 60) / 100))
  return Math.max(0, Math.min(1, score))
}

export function buildDailyPlan(request: DailyPlanRequest): DailyPlan {
  const readinessScore = readiness(request.observations)
  const recoveryState: DailyPlan['recoveryState'] = readinessScore < 0.5 ? 'low' : readinessScore < 0.7 ? 'moderate' : 'good'
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
  const lowRecovery = recoveryState === 'low'
  const conservativeAction = lowRecovery || policy.action === 'reduce' || policy.action === 'pause' || policy.action === 'collect-data'
  const suppressedSteps = conservativeAction ? request.protocol : []
  const actions = conservativeAction
    ? [{ title: 'Reduce or defer new intervention load', reason: [...policy.rationale, ...(lowRecovery ? ['Recovery readiness is low relative to baseline thresholds.'] : [])].join(' '), safety: 'yellow' as const }]
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
