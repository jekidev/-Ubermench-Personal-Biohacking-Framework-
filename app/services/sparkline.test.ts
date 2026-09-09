import { describe, expect, it } from 'vitest'
import { sparklinePath } from './sparkline'

describe('sparkline', () => {
  it('builds a deterministic path from finite values', () => {
    const result = sparklinePath([1, 2, 3], 100, 20, 0)
    expect(result.path.startsWith('M ')).toBe(true)
    expect(result.min).toBe(1)
    expect(result.max).toBe(3)
    expect(result.path).toContain('0,20')
    expect(result.path).toContain('100,0')
  })

  it('keeps a flat series on the midline', () => {
    const result = sparklinePath([4, 4, 4], 10, 10, 0)
    expect(result.path).toBe('M 0,5 L 5,5 L 10,5')
  })

  it('rejects empty or non-finite input', () => {
    expect(() => sparklinePath([])).toThrow(/finite number/)
    expect(() => sparklinePath([Number.NaN])).toThrow(/finite number/)
  })
})
