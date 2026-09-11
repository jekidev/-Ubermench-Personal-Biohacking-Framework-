import { describe, expect, it } from 'vitest'
import { exampleArgsForTool, invokeCatalogTool } from './invoke-tool'

describe('invoke catalog tool', () => {
  it('runs a low-risk plugin tool without an approval token', async () => {
    const result = await invokeCatalogTool('plugins.garmin.schema')
    expect(result.value).toMatchObject({ provider: 'garmin' })
    expect(result.serialized).toContain('garmin')
  })

  it('rejects unknown tools', async () => {
    await expect(invokeCatalogTool('plugins.missing')).rejects.toThrow(/Unknown agent tool/)
  })

  it('supplies example args for plugin and research tools', () => {
    expect(exampleArgsForTool('plugins.exercises.search')).toEqual({ query: 'squat', limit: 5 })
    expect(exampleArgsForTool('plugins.pdf.inspect')).toEqual({ sample: true })
    expect(exampleArgsForTool('research.europepmc').goal).toBe('metformin longevity')
    expect(exampleArgsForTool('mcp.stdio:paper-search')).toMatchObject({ method: 'search_pubmed' })
    expect(exampleArgsForTool('plugins.garmin.status')).toEqual({})
  })
})
