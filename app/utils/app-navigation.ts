export type AppNavItem = {
  label: string
  to: string
}

export type AppNavGroup = {
  label: string
  items: AppNavItem[]
}

export const LONGEVITY_NAV: AppNavItem[] = [
  { label: 'Longevity', to: '/longevity' },
  { label: 'Bloods', to: '/longevity/bloods' },
  { label: 'Genetics', to: '/longevity/genetics' },
  { label: 'Fitness', to: '/longevity/fitness' },
  { label: 'Evidence', to: '/longevity/evidence' },
  { label: 'Timeline', to: '/longevity/timeline' },
  { label: 'Mito', to: '/longevity/mito' },
  { label: 'Cardiovascular', to: '/longevity/cardiovascular' },
  { label: 'Metabolic', to: '/longevity/metabolic' },
  { label: 'Recovery', to: '/longevity/recovery' },
  { label: 'Organs', to: '/longevity/organs' },
  { label: 'Prevention', to: '/longevity/prevention' },
  { label: 'Interventions', to: '/longevity/interventions' },
]

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', to: '/' },
      { label: 'Chat', to: '/chat' },
      { label: 'Agent', to: '/agent' },
      { label: 'AI Models', to: '/ai-models' },
    ],
  },
  {
    label: 'Health',
    items: [
      { label: 'Biology', to: '/biology' },
      { label: 'Health Sync', to: '/health-sync' },
      { label: 'Experiments', to: '/experiments' },
      { label: 'Safety', to: '/safety' },
      { label: 'Data health', to: '/data-health' },
      { label: 'Fearprime', to: '/fearprime' },
    ],
  },
  {
    label: 'Longevity',
    items: LONGEVITY_NAV,
  },
  {
    label: 'System',
    items: [
      { label: 'Connectors', to: '/connectors' },
      { label: 'Settings', to: '/settings' },
      { label: 'Plugins', to: '/settings?tab=plugins' },
      { label: 'Research', to: '/settings?tab=research' },
    ],
  },
]

export function flattenAppNav(groups: AppNavGroup[] = APP_NAV_GROUPS): AppNavItem[] {
  return groups.flatMap((group) => group.items)
}

export function isNavCurrent(to: string, path: string, tab: unknown): boolean {
  const [itemPath, queryString] = to.split('?')
  if (itemPath !== path) return false
  if (!queryString) return !tab || itemPath !== '/settings'
  const params = new URLSearchParams(queryString)
  return params.get('tab') === String(tab ?? '')
}
