import { describe, expect, it } from 'vitest'
import { buildResearchQuery } from './research-engine'

describe('research engine', () => {
  it('builds a compact personalised query', () => {
    expect(buildResearchQuery('cardiovascular health', ['LDL 3.2 mmol/L'], ['rs4680'])).toContain('cardiovascular health')
    expect(buildResearchQuery('cardiovascular health', ['LDL 3.2 mmol/L'], ['rs4680'])).toContain('rs4680')
  })
})
