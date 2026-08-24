import { describe, expect, it } from 'vitest'
import { validateToolResult } from './tool-result-validation'

describe('tool result validation', () => {
  it('accepts JSON-safe small results', () => {
    const result = validateToolResult({ ok: true, values: [1, 2, 3] })
    expect(result.bytes).toBeGreaterThan(0)
    expect(result.serialized).toContain('"ok":true')
  })

  it('rejects functions and symbols', () => {
    expect(() => validateToolResult({ fn: () => true })).toThrow('non-JSON')
  })

  it('rejects excessively deep results', () => {
    let value: Record<string, unknown> = {}
    const root = value
    for (let index = 0; index < 10; index += 1) {
      value.next = {}
      value = value.next as Record<string, unknown>
    }
    expect(() => validateToolResult(root)).toThrow('nesting depth')
  })
})
