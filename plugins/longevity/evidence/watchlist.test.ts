import { describe, expect, it } from 'vitest'
import { getWatchlistItem, listWatchlistByTier, LONGEVITY_WATCHLIST } from './watchlist'

describe('longevity watchlist', () => {
  it('seeds awesome-longevity resources without treating them as graded evidence', () => {
    expect(LONGEVITY_WATCHLIST.length).toBeGreaterThan(5)
    expect(listWatchlistByTier('clock').every((item) => item.source === 'atilatech/awesome-longevity')).toBe(true)
    expect(getWatchlistItem('fight-aging')?.url).toContain('fightaging')
  })
})
