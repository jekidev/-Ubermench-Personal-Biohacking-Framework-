import { describe, expect, it } from 'vitest'
import type { InterventionCandidate, PersonalBiologyProfile } from '~/types/biology'
import { detectAnomalies } from './anomaly-engine'
import { auditRecommendation } from './audit-engine'
import { compileProtocol } from './protocol-compiler'
import { rankByObjectives } from './objective-engine'
import { runClosedLoop } from './closed-loop-engine'

const profile: PersonalBiologyProfile = {
  version: 1,
  biomarkers: [{ id: 'b1', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-20', source: 'manual' }],
  variants: [],
  medications: [],
  supplements: [],
  symptoms: [],
  sleep: [],
  training: [],
  goals: ['cardiovascular health'],
  updatedAt: '2026-08-20T00:00:00.000Z',
}

const candidate: InterventionCandidate = {
  id: 'i1',
  name: 'cardiovascular training',
  mechanism: 'improves cardiovascular fitness',
  expectedBenefits: ['cardiovascular health', 'performance'],
  risks: [],
  interactions: [],
  evidence: [{ id: 'e1', title: 'Human study', source: 'test', evidenceLevel: 'human-study', confidence: 0.9 }],
  personalFit: 0.9,
  priority: 0,
}

describe('core intelligence', () => {
  it('detects a large longitudinal anomaly', () => {
    const result = detectAnomalies([{ metric: 'CRP', value: 4.5, recordedAt: '2026-08-24' }], [{ metric: 'CRP', baseline: 2 }])
    expect(result).toHaveLength(1)
    expect(result[0]?.direction).toBe('up')
    expect(result[0]?.severity).toBe('critical')
  })

  it('ranks candidates against explicit objectives', () => {
    const ranked = rankByObjectives([candidate], profile, [{ id: 'cardiovascular', weight: 1 }])
    expect(ranked[0]?.priority).toBeGreaterThan(0.5)
  })

  it('compiles a goal into a protocol with a research query', () => {
    const protocol = compileProtocol(profile, { goal: 'optimize cardiovascular health', candidates: [candidate] })
    expect(protocol.researchQuery).toContain('cardiovascular')
    expect(protocol.steps[0]?.intervention).toBe('cardiovascular training')
    expect(protocol.uncertainty).not.toBe('high')
  })

  it('blocks recommendations with red safety findings', () => {
    const findings = auditRecommendation({
      evidence: [candidate.evidence[0]],
      interventions: [candidate],
      safetyFlags: [{ severity: 'red', code: 'TEST', requiresReview: true }],
      dataCompleteness: 1,
    })
    expect(findings.some((finding) => finding.blocking)).toBe(true)
  })

  it('runs the full closed-loop decision path', () => {
    const result = runClosedLoop(profile, {
      goal: 'cardiovascular optimization',
      candidates: [candidate],
      metrics: [{ metric: 'CRP', value: 4.5 }],
      baselines: [{ metric: 'CRP', baseline: 2 }],
    })
    expect(result.protocol.steps.length).toBe(1)
    expect(result.anomalies.length).toBe(1)
    expect(result.audit.length).toBeGreaterThan(0)
    expect(result.nextAction).toBe('collect-data')
  })
})
