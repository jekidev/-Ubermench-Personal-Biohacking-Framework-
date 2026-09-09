import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import { evaluateStructuredSafetyRules } from './safety-rules'

describe('structured safety rules', () => {
  it('emits monitoring when an antithrombotic is active and bleeding labs are missing', () => {
    const flags = evaluateStructuredSafetyRules({
      ...emptyBiologyProfile(),
      medications: [{ id: '1', name: 'Apixaban', active: true }],
    })
    expect(flags.some((flag) => flag.kind === 'monitoring' && flag.code.includes('ANTICOAGULANT'))).toBe(true)
    expect(flags[0]?.provenance).toMatch(/not a clinical guideline/i)
  })

  it('does not invent a monitoring flag when hemoglobin is already recorded', () => {
    const flags = evaluateStructuredSafetyRules({
      ...emptyBiologyProfile(),
      medications: [{ id: '1', name: 'Warfarin', active: true }],
      biomarkers: [{ id: 'b1', name: 'Hemoglobin', value: 14, unit: 'g/dL', measuredAt: '2026-08-01T00:00:00.000Z', source: 'lab-import' }],
    })
    expect(flags.some((flag) => flag.code.includes('ANTICOAGULANT'))).toBe(false)
  })

  it('flags a retinoid with a pregnancy-related goal as a contraindication', () => {
    const flags = evaluateStructuredSafetyRules({
      ...emptyBiologyProfile(),
      goals: ['Trying to conceive'],
      supplements: [{ id: '1', name: 'Vitamin A 10000 IU', active: true }],
    })
    expect(flags.some((flag) => flag.kind === 'contraindication' && flag.severity === 'red')).toBe(true)
  })

  it('flags a stimulant when the latest systolic reading is above 180', () => {
    const flags = evaluateStructuredSafetyRules({
      ...emptyBiologyProfile(),
      medications: [{ id: '1', name: 'Methylphenidate', active: true }],
      biomarkers: [{ id: 'bp', name: 'Systolic BP', value: 190, unit: 'mmHg', measuredAt: '2026-08-01T00:00:00.000Z', source: 'manual' }],
    })
    expect(flags.some((flag) => flag.code.includes('STIMULANT') && flag.kind === 'contraindication')).toBe(true)
  })
})
