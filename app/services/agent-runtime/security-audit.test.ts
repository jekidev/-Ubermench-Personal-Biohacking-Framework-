import { describe, expect, it } from 'vitest'
import { auditTaskSecurity } from './security-audit'

describe('agent runtime security audit', () => {
  it('flags high-risk tool execution', () => {
    const findings = auditTaskSecurity({ id: 't1', kind: 'automation', prompt: 'do it', allowTools: true, riskLevel: 'high' })
    expect(findings.some((finding) => finding.id === 'high-risk-tools' && finding.severity === 'high')).toBe(true)
  })

  it('flags oversized prompts', () => {
    const findings = auditTaskSecurity({ id: 't2', kind: 'chat', prompt: 'x'.repeat(20_001) })
    expect(findings.some((finding) => finding.id === 'prompt-size')).toBe(true)
  })

  it('returns no findings for an ordinary task', () => {
    expect(auditTaskSecurity({ id: 't3', kind: 'research', prompt: 'research omega 3' })).toEqual([])
  })
})
