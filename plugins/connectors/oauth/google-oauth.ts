const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SECRET_KEYS = {
  clientId: 'GOOGLE_CLIENT_ID',
  clientSecret: 'GOOGLE_CLIENT_SECRET',
  accessToken: 'GOOGLE_ACCESS_TOKEN',
  refreshToken: 'GOOGLE_REFRESH_TOKEN',
  expiresAt: 'GOOGLE_TOKEN_EXPIRES_AT',
  driveFolderId: 'GOOGLE_DRIVE_FOLDER_ID',
} as const

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
]

export const GOOGLE_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
]

export const GOOGLE_COMBINED_SCOPES = [...new Set([...GOOGLE_DRIVE_SCOPES, ...GOOGLE_GMAIL_SCOPES])]

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

export type GoogleOAuthState = {
  connectorIds: Array<'google-drive' | 'gmail' | 'youtube'>
  codeVerifier: string
  redirectUri: string
  createdAt: string
}

const OAUTH_STATE_KEY = 'ubermensch:google-oauth-state:v1'

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = typeof btoa !== 'undefined'
    ? btoa(String.fromCharCode(...bytes))
    : Buffer.from(bytes).toString('base64')
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

export function saveOAuthState(state: GoogleOAuthState): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(state))
}

export function loadOAuthState(): GoogleOAuthState | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(OAUTH_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GoogleOAuthState
  } catch {
    return null
  }
}

export function clearOAuthState(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(OAUTH_STATE_KEY)
}

export async function buildGoogleAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  scopes: string[]
  connectorIds: Array<'google-drive' | 'gmail' | 'youtube'>
}): Promise<string> {
  const { verifier, challenge } = await createPkcePair()
  saveOAuthState({
    connectorIds: input.connectorIds,
    codeVerifier: verifier,
    redirectUri: input.redirectUri,
    createdAt: new Date().toISOString(),
  })

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
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  })
  if (input.clientSecret?.trim()) body.set('client_secret', input.clientSecret.trim())

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error_description ?? payload?.error ?? 'Google token exchange failed')
  }
  return payload as GoogleTokenResponse
}

export async function refreshGoogleAccessToken(input: {
  clientId: string
  clientSecret?: string
  refreshToken: string
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    refresh_token: input.refreshToken,
    grant_type: 'refresh_token',
  })
  if (input.clientSecret?.trim()) body.set('client_secret', input.clientSecret.trim())

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error_description ?? payload?.error ?? 'Google token refresh failed')
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
