export type ConnectorId =
  | 'discord'
  | 'gmail'
  | 'google-drive'
  | 'google-calendar'
  | 'huggingface'
  | 'github'
  | 'slack'
  | 'notion'
  | 'tavily'
  | 'context7'
  | 'sentry'
  | 'stripe'
  | 'supabase'
  | 'convex'
  | 'vercel'

export type ConnectorCategory = 'communication' | 'storage' | 'research' | 'ai' | 'devtools' | 'health' | 'payments'
export type ConnectorTransport = 'mcp-stdio' | 'api' | 'oauth' | 'hybrid'
export type ConnectorAuthType = 'none' | 'env' | 'api-key' | 'oauth'
export type ConnectorImplementationStatus = 'live' | 'scaffold' | 'planned'

export interface ConnectorAuthConfig {
  type: ConnectorAuthType
  envKeys?: string[]
  oauthScopes?: string[]
  vaultKeyPrefix?: string
}

export interface ConnectorDefinition {
  id: ConnectorId
  name: string
  category: ConnectorCategory
  description: string
  transport: ConnectorTransport
  mcpServerId?: string
  auth: ConnectorAuthConfig
  capabilities: string[]
  enabledByDefault: boolean
  cursorParity: boolean
  status: ConnectorImplementationStatus
  docsUrl?: string
}

export type ConnectorConnectionStatus = 'connected' | 'configured' | 'missing-credentials' | 'disabled' | 'unavailable'

export interface ConnectorStatusSnapshot {
  id: ConnectorId
  name: string
  enabled: boolean
  status: ConnectorConnectionStatus
  transport: ConnectorTransport
  missing: string[]
  capabilities: string[]
  cursorParity: boolean
  implementationStatus: ConnectorImplementationStatus
  lastSyncAt?: string
  oauthScopes?: string[]
}
