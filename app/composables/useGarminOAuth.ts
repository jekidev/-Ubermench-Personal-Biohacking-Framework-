import { ref } from 'vue'
import {
  buildGarminAuthorizeUrl,
  completeGarminOAuth,
  defaultGarminRedirectUri,
  garminOAuthStatus,
  loadGarminCredentials,
  saveGarminClientId,
  saveGarminClientSecret,
} from '../services/health-adapters/garmin-oauth-flow'

export function useGarminOAuth() {
  const busy = ref(false)
  const error = ref('')
  const configured = ref(false)
  const connected = ref(false)
  const redirectUri = defaultGarminRedirectUri()

  async function refreshStatus() {
    const status = await garminOAuthStatus()
    configured.value = status.configured
    connected.value = status.connected
  }

  async function saveClientId(clientId: string) {
    await saveGarminClientId(clientId)
    await refreshStatus()
  }

  async function saveClientSecret(clientSecret: string) {
    await saveGarminClientSecret(clientSecret)
    await refreshStatus()
  }

  async function startOAuth() {
    busy.value = true
    error.value = ''
    try {
      const creds = await loadGarminCredentials()
      const url = await buildGarminAuthorizeUrl({
        clientId: creds.clientId,
        redirectUri,
      })
      if (typeof window !== 'undefined') window.location.href = url
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Garmin OAuth start failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  async function handleCallback(code: string) {
    busy.value = true
    error.value = ''
    try {
      await completeGarminOAuth(code)
      await refreshStatus()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Garmin OAuth callback failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  return {
    busy,
    error,
    configured,
    connected,
    redirectUri,
    refreshStatus,
    saveClientId,
    saveClientSecret,
    startOAuth,
    handleCallback,
  }
}
