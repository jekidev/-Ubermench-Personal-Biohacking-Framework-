import { describe, expect, it } from 'vitest'
import { buildLocalResearchContext, buildResearchQuery } from './research-engine'

describe('research engine', () => {
  it('builds a literature-only external query from the goal', () => {
    expect(buildResearchQuery('cardiovascular health')).toBe('(cardiovascular health)')
    expect(buildResearchQuery('  cardiovascular   health  ')).toBe('(cardiovascular health)')
  })

  it('keeps personal context local-only', () => {
    const local = buildLocalResearchContext('cardiovascular health', ['LDL 3.2 mmol/L'], ['rs4680'])
    expect(local).toContain('cardiovascular health')
    expect(local).toContain('rs4680')
    expect(buildResearchQuery('cardiovascular health')).not.toContain('rs4680')
  })
})
