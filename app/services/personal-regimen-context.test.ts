import { describe, expect, it } from 'vitest'
import { emptyBiologyProfile } from './biology-store'
import { formatPersonalRegimenContext, summarizeDietProtocol } from './personal-regimen-context'

describe('personal regimen context', () => {
  it('returns empty context when no stack or diet is entered', () => {
    expect(formatPersonalRegimenContext(emptyBiologyProfile())).toBe('')
    expect(summarizeDietProtocol(undefined)).toBe('')
  })

  it('formats active stack, paused items and diet for the agent', () => {
    const context = formatPersonalRegimenContext({
      ...emptyBiologyProfile(),
      supplements: [
        { id: 's1', name: 'Magnesium', dose: '200 mg', frequency: 'nightly', timing: 'bedtime', active: true },
        { id: 's2', name: 'Creatine', dose: '5 g', active: false },
      ],
      medications: [{ id: 'm1', name: 'Levothyroxine', dose: '50 mcg', active: true }],
      diet: {
        pattern: 'High-protein Mediterranean',
        eatingWindow: '16:8',
        proteinTargetGrams: 140,
        restrictions: ['seed oils'],
        notes: 'Protein first.',
      },
    })

    expect(context).toContain('Active stack: Magnesium (200 mg, nightly, bedtime)')
    expect(context).toContain('Paused supplements: Creatine (5 g) [paused]')
    expect(context).toContain('Active medications: Levothyroxine (50 mcg)')
    expect(context).toContain('High-protein Mediterranean')
    expect(context).toContain('16:8')
    expect(context).toContain('avoid seed oils')
    expect(context).toContain('Protein first.')
  })
})
