import type { AdaptationDecision, PolicyRule } from '~/types/adaptive'

function matches(observation: number, rule: PolicyRule['when']) {
  switch (rule.operator) {
    case 'lt': return observation < rule.value
    case 'lte': return observation <= rule.value
    case 'gt': return observation > rule.value
    case 'gte': return observation >= rule.value
    case 'eq': return observation === rule.value
  }
}

export function evaluatePolicyRules(
  observations: Array<{ metric: string; value: number }>,
  rules: PolicyRule[],
): AdaptationDecision {
  const matchedRules = rules.filter((rule) => {
    const observation = observations.find((item) => item.metric.toLowerCase() === rule.when.metric.toLowerCase())
    return observation ? matches(observation.value, rule.when) : false
  })
  const priority: Record<AdaptationDecision['action'], number> = {
    'review-safety': 5,
    pause: 4,
    'collect-data': 3,
    reduce: 2,
    continue: 1,
  }
  const action = matchedRules.sort((a, b) => priority[b.action] - priority[a.action])[0]?.action ?? 'continue'
  return {
    action,
    matchedRules,
    rationale: matchedRules.map((rule) => rule.reason),
  }
}

export const DEFAULT_ADAPTATION_RULES: PolicyRule[] = [
  { id: 'low-hrv', when: { metric: 'HRV', operator: 'lt', value: 30 }, action: 'reduce', reason: 'HRV is below the configured recovery threshold.' },
  { id: 'high-rhr', when: { metric: 'resting-heart-rate', operator: 'gt', value: 75 }, action: 'reduce', reason: 'Resting heart rate is elevated relative to the conservative planning threshold.' },
  { id: 'high-crp', when: { metric: 'CRP', operator: 'gt', value: 5 }, action: 'collect-data', reason: 'Inflammation signal warrants reassessment before escalating an intervention.' },
]
