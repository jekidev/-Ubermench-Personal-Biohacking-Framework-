import {
  buildGoogleAuthorizeUrl,
  clearOAuthState,
  defaultGoogleRedirectUri,
  GOOGLE_COMBINED_SCOPES,
  GOOGLE_DRIVE_SCOPES,
  GOOGLE_GMAIL_SCOPES,
  GOOGLE_SECRET_KEYS,
  loadOAuthState,
} from '../../plugins/connectors/oauth/google-oauth'
import { completeGoogleOAuth, isGoogleConnected, loadGoogleCredentials } from '../../plugins/connectors/oauth/google-token-store'
import { getSecret, setSecret } from '../services/secret-vault'

export function useGoogleOAuth() {
  const busy = ref(false)
  const error = ref('')
  const connected = ref(false)

  async function refreshStatus() {
    connected.value = await isGoogleConnected()
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

  async function startOAuth(connectorIds: Array<'google-drive' | 'gmail'>) {
    busy.value = true
    error.value = ''
    try {
      const creds = await loadGoogleCredentials()
      if (!creds.clientId) throw new Error('Add your Google Client ID before connecting.')
      const scopes = connectorIds.includes('google-drive') && connectorIds.includes('gmail')
        ? GOOGLE_COMBINED_SCOPES
        : connectorIds.includes('gmail')
          ? GOOGLE_GMAIL_SCOPES
          : GOOGLE_DRIVE_SCOPES
      const url = await buildGoogleAuthorizeUrl({
        clientId: creds.clientId,
        redirectUri: defaultGoogleRedirectUri(),
        scopes,
        connectorIds,
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
      })
      clearOAuthState()
      connected.value = true
      return state.connectorIds
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'OAuth callback failed'
      throw cause
    } finally {
      busy.value = false
    }
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
    refreshStatus,
    saveClientId,
    saveClientSecret,
    saveDriveFolderId,
    startOAuth,
    handleCallback,
    loadClientId,
    importClientJson,
  }
}
