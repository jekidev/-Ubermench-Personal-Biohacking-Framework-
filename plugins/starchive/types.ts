export interface StarchiveRepo {
  fullName: string
  description: string
  htmlUrl: string
  language: string | null
  stars: number
  forks: number
  createdAt: string
  updatedAt: string
  listed: boolean
}

export interface StarchiveCatalog {
  username: string
  exportedAt: string
  repos: StarchiveRepo[]
  lists?: unknown[]
}

export interface StarchiveSearchOptions {
  query?: string
  language?: string
  limit?: number
  offset?: number
}

export interface StarchiveSearchResult {
  total: number
  items: StarchiveRepo[]
  username: string
  exportedAt: string
  source: 'bundled' | 'refreshed'
}

export interface StarchiveStatus {
  username: string
  exportedAt: string
  repoCount: number
  source: 'bundled' | 'refreshed'
  tokenConfigured: boolean
  githubConnectorEnabled: boolean
  githubMcpInstalled: boolean
  githubMcpEnabled: boolean
}
