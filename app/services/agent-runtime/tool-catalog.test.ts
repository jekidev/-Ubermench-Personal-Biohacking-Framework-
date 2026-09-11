import { describe, expect, it } from 'vitest'
import {
  formatAgentToolCatalog,
  isPluginAgentToolName,
  listAgentToolCatalog,
  toAgentToolCatalogEntry,
} from './tool-catalog'

describe('agent tool catalog', () => {
  it('lists registered plugin tools including Garmin status and PDF inspect', () => {
    const names = listAgentToolCatalog().map((tool) => tool.name)
    expect(names).toContain('plugins.status')
    expect(names).toContain('plugins.garmin.status')
    expect(names).toContain('plugins.pdf.inspect')
    expect(names).toContain('plugins.exercises.search')
    expect(names).toContain('plugins.watchlist.list')
    expect(names.every((name) => name.length > 0)).toBe(true)
  })

  it('formats a compact catalog for the agent system prompt', () => {
    const catalog = formatAgentToolCatalog([
      toAgentToolCatalogEntry({
        name: 'plugins.pdf.inspect',
        description: 'Inspect a lab PDF',
        risk: 'low',
        requiresApproval: false,
      }),
      toAgentToolCatalogEntry({
        name: 'plugins.garmin.status',
        description: 'Garmin OAuth and samples',
        risk: 'low',
        requiresApproval: false,
      }),
    ])
    expect(catalog).toContain('plugins.pdf.inspect [low/auto]')
    expect(catalog).toContain('plugins.garmin.status [low/auto]')
    expect(isPluginAgentToolName('plugins.pdf.inspect')).toBe(true)
    expect(isPluginAgentToolName('research.europepmc')).toBe(false)
  })

  it('rejects blank tool names', () => {
    expect(() => toAgentToolCatalogEntry({
      name: '  ',
      description: 'x',
      risk: 'low',
      requiresApproval: false,
    })).toThrow(/required/)
  })
})
