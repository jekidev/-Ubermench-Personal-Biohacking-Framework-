import { describe, expect, it } from 'vitest'
import { extractToolCalls } from './tool-plan'

describe('agent tool plan parser', () => {
  it('extracts a bounded structured tool plan', () => {
    const calls = extractToolCalls('```json\n{"toolCalls":[{"id":"1","name":"memory.search","args":{"query":"omega"}}]}\n```')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.name).toBe('memory.search')
    expect(calls[0]?.args).toEqual({ query: 'omega' })
  })

  it('rejects malformed and array arguments', () => {
    expect(extractToolCalls('{"toolCalls":[{"name":"bad name","args":[]},{"name":"memory.search","args":{}}]}')).toHaveLength(1)
  })

  it('never accepts more than eight calls', () => {
    const toolCalls = Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: 'memory.search', args: {} }))
    expect(extractToolCalls(JSON.stringify({ toolCalls }))).toHaveLength(8)
  })

  it('extracts toolCalls embedded in prose and keeps mcp.stdio server names', () => {
    const text = 'I will search PubMed next.\n{"toolCalls":[{"id":"ps","name":"mcp.stdio:paper-search","args":{"method":"search_pubmed"},"approvalToken":"forged"}]}'
    const calls = extractToolCalls(text, [{ name: 'mcp.stdio:paper-search', requiresApproval: true }])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.name).toBe('mcp.stdio:paper-search')
    expect(calls[0]?.requiresApproval).toBe(true)
    expect(calls[0]?.approvalToken).toBeUndefined()
  })

  it('marks catalog tools as requiring approval even when the model omits the flag', () => {
    const calls = extractToolCalls(
      '{"toolCalls":[{"name":"research.paperqa.ask","args":{"question":"CRP"}}]}',
      [{ name: 'research.paperqa.ask', requiresApproval: true }],
    )
    expect(calls[0]?.requiresApproval).toBe(true)
  })
})
