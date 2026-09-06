import { describe, expect, it } from 'vitest'
import { evaluateStoppingRules } from './experiment-stopping-rules'

describe('experiment stopping rules', () => {
  it('pauses for severe adverse events without mutating protocol', () => {
    const evaluations = evaluateStoppingRules({ severeAdverseEvents: 1 })
    expect(evaluations.some((item) => item.triggered && item.recommendation === 'pause-for-review')).toBe(true)
  })

  it('flags high missing-data rates', () => {
    const evaluations = evaluateStoppingRules({ severeAdverseEvents: 0, missingDataRate: 0.5 })
    expect(evaluations.some((item) => item.ruleId === 'missing-data-threshold' && item.triggered)).toBe(true)
  })
})
