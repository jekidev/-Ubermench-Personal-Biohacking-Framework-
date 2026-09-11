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

    // Key navigation links must exist
    const requiredLinks = [
      { label: 'Overview', to: '/' },
      { label: 'Plugins', to: '/plugins' },
      { label: 'FearPrime', to: '/fearprime' },
      { label: 'Longevity', to: '/longevity' },
      { label: 'Chat', to: '/chat' },
      { label: 'Agent', to: '/agent' },
      { label: 'AI Models', to: '/ai-models' },
      { label: 'Biology', to: '/biology' },
      { label: 'Health Sync', to: '/health-sync' },
      { label: 'Experiments', to: '/experiments' },
      { label: 'Safety', to: '/safety' },
      { label: 'Data health', to: '/data-health' },
      { label: 'Connectors', to: '/connectors' },
      { label: 'Settings', to: '/settings' },
    ]

    for (const item of requiredLinks) {
      expect(appContent).toContain(`to: '${item.to}'`)
      expect(appContent).toContain(`label: '${item.label}'`)
      expect(rootAppContent).toContain(`to: '${item.to}'`)
      expect(rootAppContent).toContain(`label: '${item.label}'`)
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
      '/connectors',
      '/ai-models',
      '/settings',
    ]

    for (const route of pluginRoutes) {
      expect(pluginsPage).toContain(`to="${route}"`)
    }
  })
})
