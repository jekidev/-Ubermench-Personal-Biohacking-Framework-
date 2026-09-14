import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBiologyProfile } from './biology-store'

afterEach(() => vi.unstubAllGlobals())
describe('stored biology data', () => {
  it('only treats an absent value as a new profile', async () => {
    const getItem = vi.fn().mockReturnValue(null)
    vi.stubGlobal('window', { localStorage: { getItem } })
    expect((await loadBiologyProfile()).biomarkers).toEqual([])
    for (const raw of ['{broken', 'null', '{"version":99}', '{"version":1,"biomarkers":{}}']) {
      getItem.mockReturnValue(raw)
      await expect(loadBiologyProfile()).rejects.toThrow(/preserved/i)
    }
  })
})
