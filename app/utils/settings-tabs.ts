export const SETTINGS_TABS = ['general', 'github', 'memory', 'research', 'plugins'] as const

export type SettingsTab = typeof SETTINGS_TABS[number]

export function parseSettingsTab(value: unknown): SettingsTab {
  if (typeof value === 'string' && (SETTINGS_TABS as readonly string[]).includes(value)) {
    return value as SettingsTab
  }
  return 'general'
}

export function settingsTabQuery(tab: SettingsTab): Record<string, string> {
  return tab === 'general' ? {} : { tab }
}
