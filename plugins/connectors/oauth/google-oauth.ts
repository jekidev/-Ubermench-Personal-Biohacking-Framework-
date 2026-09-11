const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SECRET_KEYS = {
  clientId: 'GOOGLE_CLIENT_ID',
  clientSecret: 'GOOGLE_CLIENT_SECRET',
  accessToken: 'GOOGLE_ACCESS_TOKEN',
  refreshToken: 'GOOGLE_REFRESH_TOKEN',
  expiresAt: 'GOOGLE_TOKEN_EXPIRES_AT',
  driveFolderId: 'GOOGLE_DRIVE_FOLDER_ID',
  grantedScopes: 'GOOGLE_GRANTED_SCOPES',
  connectedServices: 'GOOGLE_CONNECTED_SERVICES',
} as const

export type GoogleConnectorId = 'google-drive' | 'gmail' | 'google-calendar'

export const GOOGLE_CONNECTOR_IDS: GoogleConnectorId[] = ['google-drive', 'gmail', 'google-calendar']

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
]

export const GOOGLE_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
]

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'openid',
  'email',
]

export const GOOGLE_SCOPE_SETS: Record<GoogleConnectorId, readonly string[]> = {
  'google-drive': GOOGLE_DRIVE_SCOPES,
  gmail: GOOGLE_GMAIL_SCOPES,
  'google-calendar': GOOGLE_CALENDAR_SCOPES,
}

export const GOOGLE_COMBINED_SCOPES = [...new Set([
  ...GOOGLE_DRIVE_SCOPES,
  ...GOOGLE_GMAIL_SCOPES,
  ...GOOGLE_CALENDAR_SCOPES,
])]

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

export type GoogleOAuthConnectorId = GoogleConnectorId | 'youtube'

export const GOOGLE_YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'openid',
  'email',
] as const

export type GoogleOAuthState = {
  connectorIds: GoogleOAuthConnectorId[]
  codeVerifier: string
  redirectUri: string
  createdAt: string
}

const OAUTH_STATE_KEY = 'ubermensch:google-oauth-state:v1'

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32))
  const verifier = base64UrlEncode(verifierBytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64UrlEncode(new Uint8Array(digest))
  return { verifier, challenge }
}

export function defaultGoogleRedirectUri(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000/connectors/oauth/callback'
  return `${window.location.origin}/connectors/oauth/callback`
}

function defaultSessionStorage(): Storage | undefined {
  return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
}

const OAUTH_STATE_BACKUP_KEY = `${OAUTH_STATE_KEY}:backup`

function backupOAuthState(state: GoogleOAuthState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OAUTH_STATE_BACKUP_KEY, JSON.stringify(state))
}

function readOAuthStateBackup(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(OAUTH_STATE_BACKUP_KEY)
}

export function saveOAuthState(state: GoogleOAuthState, storage: Pick<Storage, 'setItem'> | undefined = defaultSessionStorage()): void {
  storage?.setItem(OAUTH_STATE_KEY, JSON.stringify(state))
  backupOAuthState(state)
}

export function loadOAuthState(storage: Pick<Storage, 'getItem'> | undefined = defaultSessionStorage()): GoogleOAuthState | null {
  try {
    const raw = storage?.getItem(OAUTH_STATE_KEY) ?? readOAuthStateBackup()
    if (!raw) return null
    return JSON.parse(raw) as GoogleOAuthState
  } catch {
    return null
  }
}

export function clearOAuthState(storage: Pick<Storage, 'removeItem'> | undefined = defaultSessionStorage()): void {
  storage?.removeItem(OAUTH_STATE_KEY)
  if (typeof localStorage !== 'undefined') localStorage.removeItem(OAUTH_STATE_BACKUP_KEY)
}

export function scopesForConnectors(connectorIds: GoogleConnectorId[]): string[] {
  const scopes = new Set<string>()
  for (const id of connectorIds) {
    for (const scope of GOOGLE_SCOPE_SETS[id]) scopes.add(scope)
  }
  return [...scopes]
}

export function parseGrantedScopes(scope?: string): string[] {
  return (scope ?? '').split(/\s+/).map((item) => item.trim()).filter(Boolean)
}

export function scopesCoverConnector(granted: readonly string[], connectorId: GoogleConnectorId): boolean {
  const required = GOOGLE_SCOPE_SETS[connectorId].filter((scope) => scope !== 'openid' && scope !== 'email')
  return required.every((scope) => granted.includes(scope))
}

export function scopesCoverOAuthConnector(granted: readonly string[], connectorId: GoogleOAuthConnectorId): boolean {
  if (connectorId === 'youtube') {
    return GOOGLE_YOUTUBE_SCOPES
      .filter((scope) => scope !== 'openid' && scope !== 'email')
      .every((scope) => granted.includes(scope))
  }
  return scopesCoverConnector(granted, connectorId)
}

export function isGoogleConnectorId(value: string): value is GoogleConnectorId {
  return GOOGLE_CONNECTOR_IDS.includes(value as GoogleConnectorId)
}

export function isGoogleOAuthConnectorId(value: string): value is GoogleOAuthConnectorId {
  return value === 'youtube' || isGoogleConnectorId(value)
}

export async function buildGoogleAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  scopes: readonly string[]
  connectorIds: GoogleOAuthConnectorId[]
  storage?: Pick<Storage, 'setItem'>
}): Promise<string> {
  const { verifier, challenge } = await createPkcePair()
  saveOAuthState({
    connectorIds: input.connectorIds,
    codeVerifier: verifier,
    redirectUri: input.redirectUri,
    createdAt: new Date().toISOString(),
  }, input.storage)

  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: input.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleAuthCode(input: {
  code: string
  clientId: string
  clientSecret?: string
  redirectUri: string
  codeVerifier: string
  fetchImpl?: typeof fetch
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  })
  if (input.clientSecret?.trim()) body.set('client_secret', input.clientSecret.trim())

  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({})) as { error_description?: string; error?: string }
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? 'Google token exchange failed')
  }
  return payload as GoogleTokenResponse
}

export async function refreshGoogleAccessToken(input: {
  clientId: string
  clientSecret?: string
  refreshToken: string
  fetchImpl?: typeof fetch
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    refresh_token: input.refreshToken,
    grant_type: 'refresh_token',
  })
  if (input.clientSecret?.trim()) body.set('client_secret', input.clientSecret.trim())

  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({})) as { error_description?: string; error?: string }
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? 'Google token refresh failed')
  }
  return payload as GoogleTokenResponse
}

export function googleTokenExpiryIso(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString()
}

export function isGoogleTokenExpired(expiresAt?: string, skewMs = 60_000): boolean {
  if (!expiresAt) return true
  return Date.parse(expiresAt) - skewMs <= Date.now()
}
