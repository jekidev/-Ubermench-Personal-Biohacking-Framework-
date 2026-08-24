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
})
