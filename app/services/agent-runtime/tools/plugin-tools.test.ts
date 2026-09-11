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
})
