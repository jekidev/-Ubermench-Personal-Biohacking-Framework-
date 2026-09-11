import { describe, expect, it, vi } from 'vitest'
import { createResearchTools } from './research-tools'

vi.mock('../../../../plugins/connectors/connector-store', () => ({
  isConnectorEnabled: vi.fn(() => true),
}))

vi.mock('../../research-workflow', () => ({
  runResearchWorkflow: vi.fn(async () => ({
    query: 'metformin',
    hits: [{ id: '1', title: 'Trial', journal: 'J', doi: '10.1/x', url: 'https://example.com' }],
    retrievedAt: '2026-01-01T00:00:00Z',
    evidenceCandidates: [],
    normalizedRecords: [],
  })),
}))

describe('research tools', () => {
  it('registers provider and PaperQA tools', () => {
    const tools = createResearchTools()
    const names = tools.map((tool) => tool.name)
    expect(names).toEqual(expect.arrayContaining([
      'research.providers',
      'research.status',
      'research.europepmc',
      'research.paperqa.plan',
      'research.paperqa.ask',
    ]))
    expect(tools.find((tool) => tool.name === 'research.paperqa.ask')?.requiresApproval).toBe(true)
  })

  it('runs europepmc workflow with a goal', async () => {
    const tools = createResearchTools()
    const workflow = tools.find((tool) => tool.name === 'research.europepmc')!
    await expect(workflow.execute({ goal: 'metformin longevity' })).resolves.toMatchObject({ hitCount: 1 })
  })
})
