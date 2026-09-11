import { describe, expect, it } from 'vitest'
import {
  getDomainPlugin,
  getStarredIntegration,
  listDomainPlugins,
  listStarredIntegrations,
} from './plugin-registry'

describe('plugin-registry', () => {
  it('lists domain plugins with manifests', () => {
    const plugins = listDomainPlugins()
    expect(plugins.map((plugin) => plugin.id)).toEqual(['fearprime', 'longevity'])
    expect(getDomainPlugin('fearprime')?.route).toBe('/fearprime')
    expect(getDomainPlugin('longevity')?.route).toBe('/longevity')
  })

  it('lists approved starred integrations', () => {
    const integrations = listStarredIntegrations()
    expect(integrations.map((item) => item.id)).toContain('exercise-catalog')
    expect(integrations.map((item) => item.id)).toContain('pdf-inspector')
    expect(getStarredIntegration('paper-search')?.settingsTab).toBe('research')
  })
})
