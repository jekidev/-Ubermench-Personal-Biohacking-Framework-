import {
  buildGoogleAuthorizeUrl,
  defaultGoogleRedirectUri,
  GOOGLE_YOUTUBE_SCOPES,
} from './google-oauth'
import { isGoogleServiceConnected } from './google-token-store'

export const YOUTUBE_SCOPES = GOOGLE_YOUTUBE_SCOPES

export async function buildYouTubeAuthorizeUrl(clientId: string): Promise<string> {
  return buildGoogleAuthorizeUrl({
    clientId,
    redirectUri: defaultGoogleRedirectUri(),
    scopes: YOUTUBE_SCOPES,
    connectorIds: ['youtube'],
  })
}

export async function isYouTubeOAuthConnected(): Promise<boolean> {
  return isGoogleServiceConnected('youtube')
}
