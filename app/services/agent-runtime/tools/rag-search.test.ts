import { describe, expect, it } from 'vitest'
import { createRagSearchTool } from './rag-search'

describe('rag.search tool', () => {
  it('requires a query string', async () => {
    const tool = createRagSearchTool()
    await expect(tool.execute({})).rejects.toThrow(/requires a query/)
  })

  it('returns structured hits for a query', async () => {
    const tool = createRagSearchTool()
    const results = await tool.execute({ query: 'omega', limit: 3 }) as Array<{ kind: string }>
    expect(Array.isArray(results)).toBe(true)
  })
})
