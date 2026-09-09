import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import { confirmHighRiskFlags, requiresHighRiskConfirmation, screenProfileSafety, screenRegimenSafety } from './profile-safety'

describe('profile safety', () => {
  it('flags serotonergic polypharmacy separately from any efficacy ranking', () => {
    const flags = screenRegimenSafety([
      { id: '1', name: 'Mirtazapin', active: true, dose: '15mg' },
      { id: '2', name: 'Nortriptylin', active: true, dose: '25mg' },
    ])
    expect(flags.some((flag) => flag.code === 'SEROTONERGIC_POLYPHARMACY' && flag.severity === 'red')).toBe(true)
    expect(requiresHighRiskConfirmation(flags)).toBe(true)
  })

  it('flags duplicate ingredients and summed cumulative dose', () => {
    const flags = screenRegimenSafety([], [
      { id: '1', name: 'Vitamin D3', active: true, dose: '2000 IU' },
      { id: '2', name: 'Cholecalciferol', active: true, dose: '1000 IU' },
    ])
    expect(flags.some((flag) => flag.code === 'DUPLICATE_INGREDIENT')).toBe(true)
    expect(flags.some((flag) => flag.code === 'CUMULATIVE_DOSE' && flag.detail.includes('3000'))).toBe(true)
  })

  it('requires explicit confirmation only for high-risk flags', () => {
    const flags = screenProfileSafety({
      ...emptyBiologyProfile(),
      medications: [{ id: '1', name: 'Mirtazapine', active: true }, { id: '2', name: 'Nortriptyline', active: true }],
    })
    expect(confirmHighRiskFlags(flags, false).allowed).toBe(false)
    expect(confirmHighRiskFlags(flags, true).allowed).toBe(true)
    expect(confirmHighRiskFlags(flags, true).reason).toMatch(/does not approve/i)
  })

  it('returns a non-approval green signal for an empty regimen', () => {
    const flags = screenProfileSafety(emptyBiologyProfile())
    expect(flags[0]?.code).toBe('NO_KNOWN_RULE_TRIGGERED')
    expect(requiresHighRiskConfirmation(flags)).toBe(false)
    expect(confirmHighRiskFlags(flags, false).allowed).toBe(true)
  })

  it('surfaces structured monitoring rules separately from efficacy ranking', () => {
    const flags = screenProfileSafety({
      ...emptyBiologyProfile(),
      medications: [{ id: '1', name: 'Apixaban 5mg', active: true }],
    })
    expect(flags.some((flag) => flag.kind === 'monitoring' && flag.requiresReview)).toBe(true)
    expect(requiresHighRiskConfirmation(flags)).toBe(true)
  })
})
