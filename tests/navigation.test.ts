import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('navigation and plugins hub structure', () => {
  it('app/app.vue and app.vue define matching primary navigation items', () => {
    const appContent = readFileSync(resolve(__dirname, '../app/app.vue'), 'utf-8')
    const rootAppContent = readFileSync(resolve(__dirname, '../app.vue'), 'utf-8')

    // Extract navigation items from app/app.vue
    const navMatch = appContent.match(/const navigation = (\[[\s\S]*?\]\s*)/)
    const rootNavMatch = rootAppContent.match(/const navigation = (\[[\s\S]*?\]\s*)/)

    expect(navMatch).not.toBeNull()
    expect(rootNavMatch).not.toBeNull()

    // Core primary navigation links (without redundant plugin sub-tabs)
    const requiredLinks = [
      { label: 'Overview', to: '/' },
      { label: 'Plugins', to: '/plugins' },
      { label: 'Biology', to: '/biology' },
      { label: 'Experiments', to: '/experiments' },
      { label: 'Health Sync', to: '/health-sync' },
      { label: 'Chat', to: '/chat' },
      { label: 'Agent', to: '/agent' },
      { label: 'Safety', to: '/safety' },
      { label: 'Data health', to: '/data-health' },
      { label: 'Settings', to: '/settings' },
    ]

    for (const item of requiredLinks) {
      expect(appContent).toContain(`to: '${item.to}'`)
      expect(appContent).toContain(`label: '${item.label}'`)
      expect(rootAppContent).toContain(`to: '${item.to}'`)
      expect(rootAppContent).toContain(`label: '${item.label}'`)
    }

    // Verify redundant plugin links are removed from top navigation to avoid duplicate tabs
    const excludedPluginLinks = [
      '/fearprime',
      '/longevity',
      '/ai-models',
      '/connectors',
      '/longevity/evidence',
      '/longevity/timeline',
    ]

    for (const route of excludedPluginLinks) {
      expect(appContent).not.toContain(`to: '${route}'`)
      expect(rootAppContent).not.toContain(`to: '${route}'`)
    }
  })

  it('declares valid routes in plugins hub page', () => {
    const pluginsPage = readFileSync(resolve(__dirname, '../pages/plugins/index.vue'), 'utf-8')

    const pluginRoutes = [
      '/fearprime',
      '/fearprime/memory',
      '/fearprime/state',
      '/fearprime/followups',
      '/longevity',
      '/longevity/bloods',
      '/longevity/genetics',
      '/longevity/fitness',
      '/longevity/evidence',
      '/longevity/timeline',
      '/connectors',
      '/ai-models',
      '/settings',
    ]

    for (const route of pluginRoutes) {
      expect(pluginsPage).toContain(`to="${route}"`)
    }
  })
})
