import { describe, expect, it } from 'vitest'
import { highestSafetySeverity, screenInterventionSafety } from './safety-engine'

describe('safety engine', () => {
  it('flags potential CNS stacking', () => {
    const flags = screenInterventionSafety('sleep aid', [{ id: '1', name: 'pregabalin', active: true }])
    expect(highestSafetySeverity(flags)).toBe('orange')
  })

  it('returns a non-approval signal when no rule triggers', () => {
    const flags = screenInterventionSafety('creatine', [])
    expect(flags[0]?.code).toBe('NO_KNOWN_RULE_TRIGGERED')
    expect(flags[0]?.detail).toContain('not proof of safety')
  })
})
