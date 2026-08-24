import { describe, expect, it } from 'vitest'
import { parseToolRequest } from './tool-validation'

describe('tool request validation', () => {
  it('rejects malformed actions', () => {
    expect(() => parseToolRequest({ action: 'hack', target: 'x', reason: 'x' })).toThrow(/invalid action/)
  })

  it('rejects missing target and reason', () => {
    expect(() => parseToolRequest({ action: 'send' })).toThrow(/invalid target/)
    expect(() => parseToolRequest({ action: 'send', target: 'provider' })).toThrow(/missing reason/)
  })
})
