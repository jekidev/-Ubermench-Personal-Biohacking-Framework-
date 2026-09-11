import { describe, expect, it } from 'vitest'
import { parseSettingsTab, settingsTabQuery } from './settings-tabs'

describe('settings-tabs', () => {
  it('parses known tabs and defaults unknown values to general', () => {
    expect(parseSettingsTab('plugins')).toBe('plugins')
    expect(parseSettingsTab('research')).toBe('research')
    expect(parseSettingsTab('nope')).toBe('general')
    expect(parseSettingsTab(['plugins'])).toBe('general')
  })

  it('omits query for the general tab', () => {
    expect(settingsTabQuery('general')).toEqual({})
    expect(settingsTabQuery('plugins')).toEqual({ tab: 'plugins' })
  })
})
