import { describe, expect, it } from 'vitest'
import type { InterventionCandidate } from '~/types/biology'
import { buildEvidenceDecisionTrace } from './evidence-decision-trace'

const baseCandidate = (overrides: Partial<InterventionCandidate> = {}): InterventionCandidate => ({
  id: 'omega-3',
  name: 'Omega-3',
  expectedBenefits: ['cardiometabolic support'],
  risks: [],
  interactions: [],
  personalFit: 0.85,
  priority: 0.8,
  evidence: [{
    id: 'meta-1',
    title: 'Meta analysis',
    source: 'example',
    evidenceLevel: 'meta-analysis',
    confidence: 0.9,
  }],
  ...overrides,
})

describe('evidence decision trace', () => {
  it('produces a deterministic consideration trace', () => {
    const trace = buildEvidenceDecisionTrace(baseCandidate())
    expect(trace.disposition).toBe('consider')
    expect(trace.strongestEvidenceId).toBe('meta-1')
    expect(trace.evidenceScore).toBeCloseTo(0.855)
    expect(trace.rationale).toContain('Strongest evidence: meta-1 (meta-analysis).')
  })

  it('forces review when risks or interactions exist', () => {
    const trace = buildEvidenceDecisionTrace(baseCandidate({ risks: ['bleeding'] }))
    expect(trace.disposition).toBe('review')
    expect(trace.riskCount).toBe(1)
  })

  it('defers weak or poorly fitting candidates', () => {
    const trace = buildEvidenceDecisionTrace(baseCandidate({ evidence: [], personalFit: 0.2, priority: 0.2 }))
    expect(trace.disposition).toBe('defer')
    expect(trace.evidenceScore).toBe(0)
    expect(trace.strongestEvidenceId).toBeUndefined()
  })
})
