import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPluginTools } from './plugin-tools'
import { isConnectorEnabled } from '../../../../plugins/connectors/connector-store'
import { clearPdfInspectCache } from '../../pdf-inspect-cache'

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

vi.mock('../../garmin-plugin-status', () => ({
  loadGarminPluginStatus: vi.fn(async () => ({
    oauthConfigured: true,
    oauthConnected: false,
    observationCount: 2,
    lastObservedAt: '2026-09-11T00:00:00.000Z',
    metrics: ['hrv', 'steps'],
  })),
}))

describe('plugin-tools', () => {
  const tools = createPluginTools()
  const statusTool = tools.find((tool) => tool.name === 'plugins.status')
  const searchTool = tools.find((tool) => tool.name === 'plugins.exercises.search')
  const pdfTool = tools.find((tool) => tool.name === 'plugins.pdf.inspect')

  beforeEach(() => {
    clearPdfInspectCache()
    vi.mocked(isConnectorEnabled).mockReturnValue(true)
  })

  afterEach(() => {
    clearPdfInspectCache()
    vi.mocked(isConnectorEnabled).mockReturnValue(true)
  })

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
    const statusToolGarmin = tools.find((tool) => tool.name === 'plugins.garmin.status')
    const garminStatus = await statusToolGarmin!.execute({}) as { observationCount: number; oauthConfigured: boolean }
    expect(garminStatus.oauthConfigured).toBe(true)
    expect(garminStatus.observationCount).toBe(2)
  })

  it('inspects sample and last cached PDFs without returning bytes', async () => {
    expect(pdfTool).toBeDefined()
    const empty = await pdfTool!.execute({}) as { source: string; inspection: null }
    expect(empty.source).toBe('last')
    expect(empty.inspection).toBeNull()

    const sample = await pdfTool!.execute({ sample: true }) as {
      source: string
      filename: string
      inspection: { kind: string }
    }
    expect(sample.source).toBe('sample')
    expect(sample.filename).toBe('sample.pdf')
    expect(sample.inspection.kind).toBe('empty')
    expect(JSON.stringify(sample).includes('%PDF')).toBe(false)

    const last = await pdfTool!.execute({}) as { source: string; filename: string }
    expect(last.source).toBe('last')
    expect(last.filename).toBe('sample.pdf')

    const textPdf = '%PDF-1.4\nBT (Glucose 5.2 mmol/L) ET'
    const uploaded = await pdfTool!.execute({
      base64: Buffer.from(textPdf).toString('base64'),
      filename: 'glucose.pdf',
    }) as { source: string; filename: string; inspection: { kind: string } }
    expect(uploaded.source).toBe('upload')
    expect(uploaded.filename).toBe('glucose.pdf')
    expect(uploaded.inspection.kind).toBe('text')
  })

  it('refuses PDF inspect when the connector is disabled', async () => {
    vi.mocked(isConnectorEnabled).mockReturnValue(false)
    await expect(pdfTool!.execute({ sample: true })).rejects.toThrow(/disabled/i)
  })
})
