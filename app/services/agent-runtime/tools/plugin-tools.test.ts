import { describe, expect, it, vi } from 'vitest'
import { createPluginTools } from './plugin-tools'

vi.mock('../../../../plugins/connectors/connector-runtime', () => ({
  getConnectorStatus: vi.fn(async (id: string) => ({
    id,
    status: 'connected',
    enabled: true,
  })),
}))

vi.mock('../../../../plugins/connectors/connector-store', () => ({
  isConnectorEnabled: vi.fn(() => true),
}))

describe('plugin-tools', () => {
  const tools = createPluginTools()
  const statusTool = tools.find((tool) => tool.name === 'plugins.status')
  const searchTool = tools.find((tool) => tool.name === 'plugins.exercises.search')

  it('registers plugin status tool', async () => {
    expect(statusTool).toBeDefined()
    const result = await statusTool!.execute({}) as {
      domainPlugins: Array<{ id: string }>
      stats: { exerciseCatalogCount: number }
    }
    expect(result.domainPlugins.map((plugin) => plugin.id)).toContain('longevity')
    expect(result.stats.exerciseCatalogCount).toBeGreaterThan(0)
  })

  it('searches exercise catalog', async () => {
    expect(searchTool).toBeDefined()
    const results = await searchTool!.execute({ query: 'squat' }) as Array<{ name: string }>
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name.toLowerCase()).toContain('squat')
  })

  it('lists watchlist items and garmin schema', async () => {
    const watchlistTool = tools.find((tool) => tool.name === 'plugins.watchlist.list')
    const garminTool = tools.find((tool) => tool.name === 'plugins.garmin.schema')
    const all = await watchlistTool!.execute({}) as Array<{ id: string; tier: string }>
    const clocks = await watchlistTool!.execute({ tier: 'clock' }) as Array<{ tier: string }>
    expect(all.length).toBeGreaterThan(0)
    expect(clocks.every((item) => item.tier === 'clock')).toBe(true)
    const schema = await garminTool!.execute({}) as { provider: string; rejectedProviders: string[] }
    expect(schema.provider).toBe('garmin')
    expect(schema.rejectedProviders).toContain('oura')
  })
})
