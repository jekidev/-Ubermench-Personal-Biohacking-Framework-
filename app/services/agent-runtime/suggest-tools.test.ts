import { describe, expect, it } from 'vitest'
import { extractToolCalls } from './tool-plan'
import { formatSuggestedTools, resolveToolCallsFromModel, suggestToolCallsFromPrompt } from './suggest-tools'

const catalog = [
  { name: 'plugins.garmin.status', requiresApproval: false },
  { name: 'plugins.pdf.inspect', requiresApproval: false },
  { name: 'plugins.exercises.search', requiresApproval: false },
  { name: 'plugins.watchlist.list', requiresApproval: false },
  { name: 'research.europepmc', requiresApproval: false },
  { name: 'research.status', requiresApproval: false },
  { name: 'research.paperqa.plan', requiresApproval: false },
  { name: 'research.paperqa.ask', requiresApproval: true },
  { name: 'mcp.stdio:paper-search', requiresApproval: true },
]

describe('suggestToolCallsFromPrompt', () => {
  it('plans Garmin and PDF inspect for wearable/lab prompts', () => {
    const calls = suggestToolCallsFromPrompt('Show garmin HRV after the lab pdf inspect', catalog)
    expect(calls.map((call) => call.name)).toEqual(expect.arrayContaining([
      'plugins.garmin.status',
      'plugins.pdf.inspect',
    ]))
    expect(calls.every((call) => !call.requiresApproval)).toBe(true)
  })

  it('plans europepmc for literature prompts and never auto-queues Sci-Hub or paper-search', () => {
    const calls = suggestToolCallsFromPrompt('Search pubmed and arxiv literature on metformin', catalog)
    expect(calls.map((call) => call.name)).toContain('research.europepmc')
    expect(calls.some((call) => call.name.includes('scihub') || call.name === 'mcp.stdio:paper-search')).toBe(false)
  })

  it('plans exercise catalog search from a squat query', () => {
    const calls = suggestToolCallsFromPrompt('Find squat in the exercise catalog', catalog)
    const search = calls.find((call) => call.name === 'plugins.exercises.search')
    expect(search?.args.query).toBe('squat')
  })

  it('does not invent tools for a generic greeting', () => {
    expect(suggestToolCallsFromPrompt('hello there', catalog)).toEqual([])
  })
})

describe('resolveToolCallsFromModel', () => {
  it('prefers model toolCalls over the planner', () => {
    const resolved = resolveToolCallsFromModel(
      '{"toolCalls":[{"name":"plugins.status","args":{}}]}',
      'Show garmin status',
      catalog,
      extractToolCalls,
    )
    expect(resolved.source).toBe('model')
    expect(resolved.calls[0]?.name).toBe('plugins.status')
  })

  it('falls back to the planner when the model omits toolCalls', () => {
    const resolved = resolveToolCallsFromModel(
      'Garmin looks fine from memory.',
      'What is my garmin status?',
      catalog,
      extractToolCalls,
    )
    expect(resolved.source).toBe('planner')
    expect(resolved.calls[0]?.name).toBe('plugins.garmin.status')
  })

  it('formats suggested tools for the system prompt', () => {
    const text = formatSuggestedTools([{ id: '1', name: 'plugins.garmin.status', args: {} }])
    expect(text).toContain('plugins.garmin.status')
    expect(text).toContain('never invent approval tokens')
  })
})
