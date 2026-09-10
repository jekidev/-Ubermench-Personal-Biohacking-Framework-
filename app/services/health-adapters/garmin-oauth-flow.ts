import { createPkcePair } from '../../../plugins/connectors/oauth/google-oauth'
import { getSecret, setSecret } from '../secret-vault'
import {
  GARMIN_REFRESH_KEY,
  GARMIN_TOKEN_KEY,
} from './garmin-oauth-adapter'

export const GARMIN_AUTH_URL = 'https://connect.garmin.com/oauth2Confirm'
export const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token'

export const GARMIN_SECRET_KEYS = {
  clientId: 'GARMIN_CLIENT_ID',
  clientSecret: 'GARMIN_CLIENT_SECRET',
} as const

export type GarminOAuthState = {
  codeVerifier: string
  redirectUri: string
  createdAt: string
}

export type GarminTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

const OAUTH_STATE_KEY = 'ubermensch:garmin-oauth-state:v1'
const OAUTH_STATE_BACKUP_KEY = `${OAUTH_STATE_KEY}:backup`

function defaultSessionStorage(): Storage | undefined {
  return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
}

function backupOAuthState(state: GarminOAuthState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OAUTH_STATE_BACKUP_KEY, JSON.stringify(state))
}

function readOAuthStateBackup(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(OAUTH_STATE_BACKUP_KEY)
}

export function defaultGarminRedirectUri(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000/health-sync/oauth/callback'
  return `${window.location.origin}/health-sync/oauth/callback`
}

export function saveGarminOAuthState(
  state: GarminOAuthState,
  storage: Pick<Storage, 'setItem'> | undefined = defaultSessionStorage(),
): void {
  storage?.setItem(OAUTH_STATE_KEY, JSON.stringify(state))
  backupOAuthState(state)
}

export function loadGarminOAuthState(
  storage: Pick<Storage, 'getItem'> | undefined = defaultSessionStorage(),
): GarminOAuthState | null {
  try {
    const raw = storage?.getItem(OAUTH_STATE_KEY) ?? readOAuthStateBackup()
    if (!raw) return null
    return JSON.parse(raw) as GarminOAuthState
  } catch {
    return null
  }
}

export function clearGarminOAuthState(
  storage: Pick<Storage, 'removeItem'> | undefined = defaultSessionStorage(),
): void {
  storage?.removeItem(OAUTH_STATE_KEY)
  if (typeof localStorage !== 'undefined') localStorage.removeItem(OAUTH_STATE_BACKUP_KEY)
}

export async function loadGarminCredentials() {
  const [clientId, clientSecret] = await Promise.all([
    getSecret(GARMIN_SECRET_KEYS.clientId),
    getSecret(GARMIN_SECRET_KEYS.clientSecret),
  ])
  return { clientId, clientSecret }
}

export async function saveGarminClientId(clientId: string): Promise<void> {
  await setSecret(GARMIN_SECRET_KEYS.clientId, clientId.trim())
}

export async function saveGarminClientSecret(clientSecret: string): Promise<void> {
  await setSecret(GARMIN_SECRET_KEYS.clientSecret, clientSecret.trim())
}

export async function buildGarminAuthorizeUrl(input?: {
  clientId?: string
  redirectUri?: string
  storage?: Pick<Storage, 'setItem'>
}): Promise<string> {
  const clientId = input?.clientId ?? (await loadGarminCredentials()).clientId
  if (!clientId?.trim()) throw new Error('Add your Garmin client ID before connecting.')
  const redirectUri = input?.redirectUri ?? defaultGarminRedirectUri()
  const { verifier, challenge } = await createPkcePair()
  const state = crypto.randomUUID()
  saveGarminOAuthState({
    codeVerifier: verifier,
    redirectUri,
    createdAt: new Date().toISOString(),
  }, input?.storage)

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return `${GARMIN_AUTH_URL}?${params.toString()}`
}

export async function exchangeGarminAuthCode(input: {
  code: string
  clientId: string
  clientSecret?: string
  redirectUri: string
  codeVerifier: string
  fetchImpl?: typeof fetch
}): Promise<GarminTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: input.clientId,
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: input.redirectUri,
  })
  if (input.clientSecret?.trim()) body.set('client_secret', input.clientSecret.trim())

  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  const payload = await response.json().catch(() => ({})) as { error_description?: string; error?: string }
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? 'Garmin token exchange failed')
  }
  return payload as GarminTokenResponse
}

export async function completeGarminOAuth(code: string): Promise<GarminTokenResponse> {
  const state = loadGarminOAuthState()
  if (!state) throw new Error('Missing Garmin OAuth state. Restart the connect flow.')
  const creds = await loadGarminCredentials()
  if (!creds.clientId) throw new Error('Garmin client ID is not configured.')

  const tokens = await exchangeGarminAuthCode({
    code,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: state.redirectUri,
    codeVerifier: state.codeVerifier,
  })
  await setSecret(GARMIN_TOKEN_KEY, tokens.access_token)
  if (tokens.refresh_token) await setSecret(GARMIN_REFRESH_KEY, tokens.refresh_token)
  clearGarminOAuthState()
  return tokens
}

export async function garminOAuthStatus(): Promise<{ configured: boolean; connected: boolean }> {
  const creds = await loadGarminCredentials()
  const accessToken = await getSecret(GARMIN_TOKEN_KEY)
  return {
    configured: Boolean(creds.clientId),
    connected: Boolean(accessToken),
  }
}
