import {
  buildGoogleAuthorizeUrl,
  clearOAuthState,
  defaultGoogleRedirectUri,
  GOOGLE_CONNECTOR_IDS,
  GOOGLE_SECRET_KEYS,
  loadOAuthState,
  scopesForConnectors,
  type GoogleConnectorId,
} from '../../plugins/connectors/oauth/google-oauth'
import {
  completeGoogleOAuth,
  disconnectGoogle,
  googleWorkspaceStatus,
  loadGoogleCredentials,
} from '../../plugins/connectors/oauth/google-token-store'
import { setConnectorEnabled } from '../../plugins/connectors/connector-store'
import { getSecret, setSecret } from '../services/secret-vault'

export function useGoogleOAuth() {
  const busy = ref(false)
  const error = ref('')
  const connected = ref(false)
  const services = ref<Record<GoogleConnectorId, boolean>>({
    'google-drive': false,
    gmail: false,
    'google-calendar': false,
  })

  async function refreshStatus() {
    const status = await googleWorkspaceStatus()
    connected.value = status.connected
    services.value = status.services
  }

  async function saveClientId(clientId: string) {
    await setSecret(GOOGLE_SECRET_KEYS.clientId, clientId.trim())
    await refreshStatus()
  }

  async function saveClientSecret(clientSecret: string) {
    await setSecret(GOOGLE_SECRET_KEYS.clientSecret, clientSecret.trim())
  }

  async function saveDriveFolderId(folderId: string) {
    await setSecret(GOOGLE_SECRET_KEYS.driveFolderId, folderId.trim())
  }

  async function startOAuth(connectorIds: GoogleConnectorId[]) {
    busy.value = true
    error.value = ''
    try {
      const creds = await loadGoogleCredentials()
      if (!creds.clientId) throw new Error('Paste your Google Client ID (or client JSON) before connecting.')
      const requested = connectorIds.length ? connectorIds : [...GOOGLE_CONNECTOR_IDS]
      const already = creds.connectedServices
      const scopes = scopesForConnectors([...new Set([...already, ...requested])])
      const url = await buildGoogleAuthorizeUrl({
        clientId: creds.clientId,
        redirectUri: defaultGoogleRedirectUri(),
        scopes,
        connectorIds: requested,
      })
      if (typeof window !== 'undefined') window.location.href = url
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'OAuth start failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  async function handleCallback(code: string) {
    busy.value = true
    error.value = ''
    try {
      const state = loadOAuthState()
      if (!state) throw new Error('OAuth state expired. Start connect again from Connectors.')
      await completeGoogleOAuth({
        code,
        redirectUri: state.redirectUri,
        codeVerifier: state.codeVerifier,
        connectorIds: state.connectorIds,
      })
      for (const id of state.connectorIds) setConnectorEnabled(id, true)
      clearOAuthState()
      await refreshStatus()
      return state.connectorIds
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'OAuth callback failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  async function disconnect(service?: GoogleConnectorId) {
    await disconnectGoogle(service)
    await refreshStatus()
  }

  async function loadClientId(): Promise<string> {
    return (await getSecret(GOOGLE_SECRET_KEYS.clientId)) ?? ''
  }

  async function importClientJson(raw: string) {
    const { parseGoogleClientSecretJson } = await import('../../plugins/connectors/oauth/google-client-json')
    const parsed = parseGoogleClientSecretJson(raw)
    await saveClientId(parsed.clientId)
    if (parsed.clientSecret) await saveClientSecret(parsed.clientSecret)
    return parsed
  }

  return {
    busy,
    error,
    connected,
    services,
    refreshStatus,
    saveClientId,
    saveClientSecret,
    saveDriveFolderId,
    startOAuth,
    handleCallback,
    disconnect,
    loadClientId,
    importClientJson,
  }
}
