import { describe, expect, it } from 'vitest'
import { buildResearchQuery } from './research-engine'
import { getResearchProvider } from './external-research-providers'

describe('research integration', () => {
  it('builds a deterministic biology research query', () => {
    expect(buildResearchQuery('inflammation', ['CRP 2 mg/L'], ['rs123'])).toBe('inflammation CRP 2 mg/L rs123')
  })

  it('exposes permissive and local research provider capabilities without enabling unconfigured adapters', () => {
    expect(getResearchProvider('europe-pmc')?.enabled).toBe(true)
    expect(getResearchProvider('paper-qa')?.enabled).toBe(false)
    expect(getResearchProvider('local-deep-research')?.requiresLocalRuntime).toBe(true)
  })
})
