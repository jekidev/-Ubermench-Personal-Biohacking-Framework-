import { describe, expect, it } from 'vitest'
import { APP_NAV_GROUPS, flattenAppNav, isNavCurrent, LONGEVITY_NAV } from './app-navigation'

describe('app-navigation', () => {
  it('includes longevity modules and plugins', () => {
    const hrefs = flattenAppNav().map((item) => item.to)
    expect(hrefs).toContain('/longevity/fitness')
    expect(hrefs).toContain('/longevity/bloods')
    expect(hrefs).toContain('/fearprime')
    expect(hrefs).toContain('/settings?tab=plugins')
    expect(LONGEVITY_NAV.some((item) => item.to === '/longevity/cardiovascular')).toBe(true)
    expect(APP_NAV_GROUPS.map((group) => group.label)).toContain('Longevity')
  })

  it('matches settings tabs without highlighting the general Settings link', () => {
    expect(isNavCurrent('/settings?tab=plugins', '/settings', 'plugins')).toBe(true)
    expect(isNavCurrent('/settings', '/settings', 'plugins')).toBe(false)
    expect(isNavCurrent('/settings', '/settings', undefined)).toBe(true)
    expect(isNavCurrent('/longevity/fitness', '/longevity/fitness', undefined)).toBe(true)
    expect(isNavCurrent('/longevity', '/longevity/fitness', undefined)).toBe(false)
  })
})
