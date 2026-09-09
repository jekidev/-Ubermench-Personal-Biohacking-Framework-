import {
  buildGoogleAuthorizeUrl,
  defaultGoogleRedirectUri,
} from './google-oauth'

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'openid',
  'email',
]

export async function buildYouTubeAuthorizeUrl(clientId: string): Promise<string> {
  return buildGoogleAuthorizeUrl({
    clientId,
    redirectUri: defaultGoogleRedirectUri(),
    scopes: YOUTUBE_SCOPES,
    connectorIds: ['youtube'],
  })
}

export async function isYouTubeOAuthConnected(): Promise<boolean> {
  const { isGoogleConnected } = await import('./google-token-store')
  return isGoogleConnected()
}
