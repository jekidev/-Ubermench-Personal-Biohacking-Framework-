export type StoppingRuleType = 'adverse-event' | 'missing-data' | 'predeclared-visit-count' | 'manual-review'

export type StoppingRule = {
  id: string
  type: StoppingRuleType
  threshold?: number
  description: string
  auditOnly: true
}

export type StoppingRuleEvaluation = {
  triggered: boolean
  ruleId: string
  message: string
  recommendation: 'continue' | 'pause-for-review' | 'stop-and-review'
}

export const DEFAULT_STOPPING_RULES: StoppingRule[] = [
  {
    id: 'severe-adverse-event',
    type: 'adverse-event',
    description: 'Pause for review if a severe adverse event is recorded.',
    auditOnly: true,
  },
  {
    id: 'missing-data-threshold',
    type: 'missing-data',
    threshold: 0.35,
    description: 'Pause for review if more than 35% of planned observations are missing.',
    auditOnly: true,
  },
  {
    id: 'manual-review',
    type: 'manual-review',
    description: 'Human review is required before changing the pre-declared protocol.',
    auditOnly: true,
  },
]

export function evaluateStoppingRules(input: {
  severeAdverseEvents: number
  missingDataRate?: number
  completedVisits?: number
  plannedVisits?: number
  rules?: StoppingRule[]
}): StoppingRuleEvaluation[] {
  const rules = input.rules ?? DEFAULT_STOPPING_RULES
  const evaluations: StoppingRuleEvaluation[] = []

  for (const rule of rules) {
    if (rule.type === 'adverse-event' && input.severeAdverseEvents > 0) {
      evaluations.push({
        triggered: true,
        ruleId: rule.id,
        message: 'Severe adverse event recorded.',
        recommendation: 'pause-for-review',
      })
      continue
    }

    if (rule.type === 'missing-data' && typeof input.missingDataRate === 'number' && typeof rule.threshold === 'number' && input.missingDataRate > rule.threshold) {
      evaluations.push({
        triggered: true,
        ruleId: rule.id,
        message: `Missing data rate ${(input.missingDataRate * 100).toFixed(0)}% exceeds threshold.`,
        recommendation: 'pause-for-review',
      })
      continue
    }

    if (rule.type === 'predeclared-visit-count' && typeof input.completedVisits === 'number' && typeof input.plannedVisits === 'number' && input.completedVisits >= input.plannedVisits) {
      evaluations.push({
        triggered: true,
        ruleId: rule.id,
        message: 'Pre-declared visit count reached.',
        recommendation: 'stop-and-review',
      })
      continue
    }

    evaluations.push({
      triggered: false,
      ruleId: rule.id,
      message: 'Rule not triggered.',
      recommendation: 'continue',
    })
  }

  return evaluations
}
