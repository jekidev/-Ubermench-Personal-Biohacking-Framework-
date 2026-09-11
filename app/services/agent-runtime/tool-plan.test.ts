import { describe, expect, it } from 'vitest'
import { extractToolCalls, partitionPendingByApprovalSurface, partitionToolCalls, selectApprovableToolCalls, selectUnobservedFollowUpCalls, upsertToolCalls } from './tool-plan'

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

  it('partitions mixed auto and approval-gated calls', () => {
    const { executable, awaitingApproval } = partitionToolCalls([
      { id: 'a', name: 'plugins.garmin.status', args: {}, requiresApproval: false },
      { id: 'b', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true },
    ])
    expect(executable.map((call) => call.name)).toEqual(['plugins.garmin.status'])
    expect(awaitingApproval.map((call) => call.name)).toEqual(['research.paperqa.ask'])
  })

  it('upserts tool calls by id without dropping pending ones', () => {
    const merged = upsertToolCalls(
      [{ id: 'c1', name: 'research.paperqa.ask', args: {}, requiresApproval: true }],
      [{ id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true, approvalToken: 'user-1' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]?.approvalToken).toBe('user-1')
    expect(merged[0]?.args.question).toBe('CRP')
  })

  it('assigns unique ids when the model reuses the same toolCall id', () => {
    const calls = extractToolCalls(
      '{"toolCalls":[{"id":"dup","name":"plugins.garmin.status","args":{}},{"id":"dup","name":"research.paperqa.ask","args":{"question":"CRP"}}]}',
      [{ name: 'research.paperqa.ask', requiresApproval: true }],
    )
    expect(calls).toHaveLength(2)
    expect(new Set(calls.map((call) => call.id)).size).toBe(2)
    expect(calls.map((call) => call.name)).toEqual(['plugins.garmin.status', 'research.paperqa.ask'])
    expect(calls[1]?.requiresApproval).toBe(true)
  })

  it('keeps the same id for duplicate calls of the same tool so the loop can skip retries', () => {
    const calls = extractToolCalls(
      '{"toolCalls":[{"id":"same","name":"memory.search","args":{"query":"a"}},{"id":"same","name":"memory.search","args":{"query":"b"}}]}',
    )
    expect(calls.map((call) => call.id)).toEqual(['same', 'same'])
  })

  it('does not overwrite a different tool when upserting a colliding id', () => {
    const merged = upsertToolCalls(
      [{ id: 'dup', name: 'plugins.garmin.status', args: {}, requiresApproval: false }],
      [{ id: 'dup', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true }],
    )
    expect(merged).toHaveLength(2)
    expect(merged.map((call) => call.name)).toEqual(['plugins.garmin.status', 'research.paperqa.ask'])
    expect(new Set(merged.map((call) => call.id)).size).toBe(2)
  })

  it('reassigns follow-up default ids so they are not skipped as already observed', () => {
    const followUp = selectUnobservedFollowUpCalls(
      extractToolCalls('{"toolCalls":[{"name":"research.paperqa.ask","args":{"question":"CRP"}}]}', [
        { name: 'research.paperqa.ask', requiresApproval: true },
      ]),
      {
        toolCalls: [{ id: 'tool_1', name: 'plugins.garmin.status', args: {} }],
        observations: [{ kind: 'tool', toolCallId: 'tool_1' }],
      },
    )
    expect(followUp).toHaveLength(1)
    expect(followUp[0]?.name).toBe('research.paperqa.ask')
    expect(followUp[0]?.id).not.toBe('tool_1')
    expect(followUp[0]?.requiresApproval).toBe(true)
  })

  it('splits mixed catalog and native pending so PaperQA can approve without paper-search', () => {
    const mixed = [
      { id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true },
      { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
    ]
    const { catalog, native } = partitionPendingByApprovalSurface(mixed)
    expect(catalog.map((call) => call.name)).toEqual(['research.paperqa.ask'])
    expect(native.map((call) => call.name)).toEqual(['mcp.stdio:paper-search'])
    expect(selectApprovableToolCalls(mixed).map((call) => call.name)).toEqual(['research.paperqa.ask'])
    expect(selectApprovableToolCalls(mixed, { includeNative: true }).map((call) => call.name)).toEqual([
      'research.paperqa.ask',
      'mcp.stdio:paper-search',
    ])
  })

  it('approves only the selected native MCP server when several wait in the same pause', () => {
    const mixed = [
      { id: 'c1', name: 'research.paperqa.ask', args: { question: 'CRP' }, requiresApproval: true },
      { id: 'c2', name: 'mcp.stdio:paper-search', args: { method: 'search_pubmed' }, requiresApproval: true },
      { id: 'c3', name: 'mcp.stdio:local-deep-research', args: { method: 'quick_search' }, requiresApproval: true },
    ]
    expect(selectApprovableToolCalls(mixed, { includeNative: true }).map((call) => call.name)).toEqual([
      'research.paperqa.ask',
      'mcp.stdio:paper-search',
    ])
    expect(selectApprovableToolCalls(mixed, { includeNative: true, nativeCallIds: ['c3'] }).map((call) => call.name)).toEqual([
      'research.paperqa.ask',
      'mcp.stdio:local-deep-research',
    ])
  })
})
