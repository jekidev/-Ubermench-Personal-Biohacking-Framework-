import { getSecret, removeSecret, setSecret } from '../../../app/services/secret-vault'
import {
  GOOGLE_CONNECTOR_IDS,
  GOOGLE_SECRET_KEYS,
  exchangeGoogleAuthCode,
  googleTokenExpiryIso,
  isGoogleConnectorId,
  isGoogleTokenExpired,
  parseGrantedScopes,
  refreshGoogleAccessToken,
  scopesCoverConnector,
  type GoogleConnectorId,
  type GoogleTokenResponse,
} from './google-oauth'

export type GoogleCredentials = {
  clientId: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  driveFolderId?: string
  grantedScopes: string[]
  connectedServices: GoogleConnectorId[]
}

function parseConnectedServices(raw?: string): GoogleConnectorId[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is GoogleConnectorId => typeof item === 'string' && isGoogleConnectorId(item))
  } catch {
    return raw.split(',').map((item) => item.trim()).filter(isGoogleConnectorId)
  }
}

export async function loadGoogleCredentials(): Promise<GoogleCredentials> {
  const [clientId, clientSecret, accessToken, refreshToken, expiresAt, driveFolderId, grantedScopes, connectedServices] = await Promise.all([
    getSecret(GOOGLE_SECRET_KEYS.clientId),
    getSecret(GOOGLE_SECRET_KEYS.clientSecret),
    getSecret(GOOGLE_SECRET_KEYS.accessToken),
    getSecret(GOOGLE_SECRET_KEYS.refreshToken),
    getSecret(GOOGLE_SECRET_KEYS.expiresAt),
    getSecret(GOOGLE_SECRET_KEYS.driveFolderId),
    getSecret(GOOGLE_SECRET_KEYS.grantedScopes),
    getSecret(GOOGLE_SECRET_KEYS.connectedServices),
  ])
  return {
    clientId: clientId ?? '',
    clientSecret,
    accessToken,
    refreshToken,
    expiresAt,
    driveFolderId,
    grantedScopes: parseGrantedScopes(grantedScopes),
    connectedServices: parseConnectedServices(connectedServices),
  }
}

export async function storeGoogleTokens(tokens: GoogleTokenResponse, connectorIds?: GoogleConnectorId[]): Promise<void> {
  await setSecret(GOOGLE_SECRET_KEYS.accessToken, tokens.access_token)
  if (tokens.refresh_token) await setSecret(GOOGLE_SECRET_KEYS.refreshToken, tokens.refresh_token)
  await setSecret(GOOGLE_SECRET_KEYS.expiresAt, googleTokenExpiryIso(tokens.expires_in))
  if (tokens.scope) await setSecret(GOOGLE_SECRET_KEYS.grantedScopes, tokens.scope)
  if (connectorIds?.length) {
    const existing = await loadGoogleCredentials()
    const merged = [...new Set([...existing.connectedServices, ...connectorIds])]
    await setSecret(GOOGLE_SECRET_KEYS.connectedServices, JSON.stringify(merged))
  }
}

export async function getValidGoogleAccessToken(fetchImpl?: typeof fetch): Promise<string> {
  const creds = await loadGoogleCredentials()
  if (!creds.clientId) throw new Error('Google Client ID is not configured in the secret vault.')
  if (creds.accessToken && !isGoogleTokenExpired(creds.expiresAt)) return creds.accessToken

  if (!creds.refreshToken) {
    throw new Error('Google is not connected. Complete OAuth authorization on the Connectors page.')
  }

  const refreshed = await refreshGoogleAccessToken({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken: creds.refreshToken,
    fetchImpl,
  })
  await storeGoogleTokens({
    ...refreshed,
    refresh_token: refreshed.refresh_token ?? creds.refreshToken,
  })
  return refreshed.access_token
}

export async function completeGoogleOAuth(input: {
  code: string
  redirectUri: string
  codeVerifier: string
  connectorIds?: GoogleConnectorId[]
  fetchImpl?: typeof fetch
}): Promise<GoogleTokenResponse> {
  const creds = await loadGoogleCredentials()
  if (!creds.clientId) throw new Error('Google Client ID is not configured.')
  const tokens = await exchangeGoogleAuthCode({
    code: input.code,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: input.redirectUri,
    codeVerifier: input.codeVerifier,
    fetchImpl: input.fetchImpl,
  })
  await storeGoogleTokens(tokens, input.connectorIds)
  return tokens
}

export async function isGoogleConnected(): Promise<boolean> {
  const creds = await loadGoogleCredentials()
  return Boolean(creds.accessToken || creds.refreshToken)
}

export async function isGoogleServiceConnected(id: GoogleConnectorId): Promise<boolean> {
  const creds = await loadGoogleCredentials()
  if (!creds.accessToken && !creds.refreshToken) return false
  if (creds.connectedServices.includes(id)) return true
  return scopesCoverConnector(creds.grantedScopes, id)
}

export async function googleWorkspaceStatus(): Promise<{
  connected: boolean
  clientConfigured: boolean
  services: Record<GoogleConnectorId, boolean>
  grantedScopes: string[]
}> {
  const creds = await loadGoogleCredentials()
  const connected = Boolean(creds.accessToken || creds.refreshToken)
  const services = {} as Record<GoogleConnectorId, boolean>
  for (const id of GOOGLE_CONNECTOR_IDS) {
    services[id] = connected && (creds.connectedServices.includes(id) || scopesCoverConnector(creds.grantedScopes, id))
  }
  return {
    connected,
    clientConfigured: Boolean(creds.clientId),
    services,
    grantedScopes: creds.grantedScopes,
  }
}

export async function disconnectGoogle(service?: GoogleConnectorId): Promise<void> {
  if (service) {
    const creds = await loadGoogleCredentials()
    const remaining = creds.connectedServices.filter((id) => id !== service)
    await setSecret(GOOGLE_SECRET_KEYS.connectedServices, JSON.stringify(remaining))
    if (remaining.length) return
  }
  await Promise.all([
    removeSecret(GOOGLE_SECRET_KEYS.accessToken),
    removeSecret(GOOGLE_SECRET_KEYS.refreshToken),
    removeSecret(GOOGLE_SECRET_KEYS.expiresAt),
    removeSecret(GOOGLE_SECRET_KEYS.grantedScopes),
    removeSecret(GOOGLE_SECRET_KEYS.connectedServices),
  ])
}
