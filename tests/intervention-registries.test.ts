import { describe, expect, it } from 'vitest'
import { interventionsByTier } from '../plugins/longevity/interventions/registry'
import { fearprimeInterventionById } from '../plugins/fearprime/interventions/registry'

describe('intervention registries', () => {
  it('loads longevity interventions by tier', () => {
    expect(interventionsByTier(1).length).toBeGreaterThan(0)
    expect(interventionsByTier(3).some((item) => item.id === 'rapamycin-research')).toBe(true)
  })

  it('loads fearprime interventions by id', () => {
    expect(fearprimeInterventionById('pe')?.name).toContain('Prolonged exposure')
  })
})
