import { getSecret, setSecret } from '../../../app/services/secret-vault'
import {
  GOOGLE_SECRET_KEYS,
  exchangeGoogleAuthCode,
  isGoogleTokenExpired,
  googleTokenExpiryIso,
  refreshGoogleAccessToken,
  type GoogleTokenResponse,
} from '../oauth/google-oauth'

function envGoogleCredentials(): Pick<GoogleCredentials, 'clientId' | 'clientSecret'> {
  if (!import.meta.client) return { clientId: '' }
  try {
    const config = useRuntimeConfig()
    return {
      clientId: String(config.public.googleClientId || ''),
      clientSecret: config.public.googleClientSecret ? String(config.public.googleClientSecret) : undefined,
    }
  } catch {
    return { clientId: '' }
  }
}

export type GoogleCredentials = {
  clientId: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  driveFolderId?: string
}

export async function loadGoogleCredentials(): Promise<GoogleCredentials> {
  const env = envGoogleCredentials()
  const [clientId, clientSecret, accessToken, refreshToken, expiresAt, driveFolderId] = await Promise.all([
    getSecret(GOOGLE_SECRET_KEYS.clientId),
    getSecret(GOOGLE_SECRET_KEYS.clientSecret),
    getSecret(GOOGLE_SECRET_KEYS.accessToken),
    getSecret(GOOGLE_SECRET_KEYS.refreshToken),
    getSecret(GOOGLE_SECRET_KEYS.expiresAt),
    getSecret(GOOGLE_SECRET_KEYS.driveFolderId),
  ])
  return {
    clientId: clientId ?? env.clientId ?? '',
    clientSecret: clientSecret ?? env.clientSecret,
    accessToken,
    refreshToken,
    expiresAt,
    driveFolderId,
  }
}

export async function storeGoogleTokens(tokens: GoogleTokenResponse): Promise<void> {
  await setSecret(GOOGLE_SECRET_KEYS.accessToken, tokens.access_token)
  if (tokens.refresh_token) await setSecret(GOOGLE_SECRET_KEYS.refreshToken, tokens.refresh_token)
  await setSecret(GOOGLE_SECRET_KEYS.expiresAt, googleTokenExpiryIso(tokens.expires_in))
}

export async function getValidGoogleAccessToken(): Promise<string> {
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
}): Promise<GoogleTokenResponse> {
  const creds = await loadGoogleCredentials()
  if (!creds.clientId) throw new Error('Google Client ID is not configured.')
  const tokens = await exchangeGoogleAuthCode({
    code: input.code,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: input.redirectUri,
    codeVerifier: input.codeVerifier,
  })
  await storeGoogleTokens(tokens)
  return tokens
}

export async function isGoogleConnected(): Promise<boolean> {
  const creds = await loadGoogleCredentials()
  return Boolean(creds.accessToken || creds.refreshToken)
}
