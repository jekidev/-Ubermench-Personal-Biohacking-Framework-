import { describe, expect, it } from 'vitest'
import { checkPharmacologyInteractions } from './pharmacology-engine'
import { screenInterventionSafety } from './safety-engine'

describe('expanded pharmacology safety', () => {
  it('flags mirtazapine with nortriptyline serotonergic polypharmacy', () => {
    const flags = screenInterventionSafety('sleep hygiene', [
      { id: '1', name: 'Mirtazapin', active: true, dose: '15mg' },
      { id: '2', name: 'Nortriptylin', active: true, dose: '25mg' },
    ])
    expect(flags.some((flag) => flag.code === 'SEROTONERGIC_POLYPHARMACY')).toBe(true)
  })

  it('flags pramipexole with methylphenidate combination', () => {
    const flags = screenInterventionSafety('focus training', [
      { id: '1', name: 'Pramipexol', active: true, dose: '0.5mg' },
      { id: '2', name: 'Methylphenidat', active: true, dose: '20mg' },
    ])
    expect(flags.some((flag) => flag.code === 'DOPAMINE_STIMULANT_COMBO')).toBe(true)
  })

  it('detects pharmacology interaction classes', () => {
    const findings = checkPharmacologyInteractions(['Mirtazapin', 'Nortriptylin'])
    expect(findings.length).toBeGreaterThan(0)
  })
})
