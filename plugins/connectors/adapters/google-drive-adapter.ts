import { getValidGoogleAccessToken, loadGoogleCredentials } from '../oauth/google-token-store'
import { googleApiBytes, googleApiJson, type GoogleFetch } from './google-http'

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
}

export type DriveListResult = {
  files: DriveFile[]
  nextPageToken?: string
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GOOGLE_DOC = 'application/vnd.google-apps.document'
const GOOGLE_SHEET = 'application/vnd.google-apps.spreadsheet'

export async function listDriveFiles(options?: {
  query?: string
  folderId?: string
  mimeType?: string
  pageToken?: string
  pageSize?: number
  fetchImpl?: GoogleFetch
}): Promise<DriveListResult> {
  const token = await getValidGoogleAccessToken(options?.fetchImpl)
  const creds = await loadGoogleCredentials()
  const folderId = options?.folderId ?? creds.driveFolderId
  const queryParts = ['trashed=false']
  if (options?.mimeType) queryParts.push(`mimeType='${options.mimeType}'`)
  if (options?.query?.trim()) {
    const escaped = options.query.trim().replace(/'/g, "\\'")
    queryParts.push(`(name contains '${escaped}' or fullText contains '${escaped}')`)
  }
  if (folderId?.trim()) queryParts.push(`'${folderId.trim()}' in parents`)

  const params = new URLSearchParams({
    q: queryParts.join(' and '),
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
    pageSize: String(options?.pageSize ?? 25),
    orderBy: 'modifiedTime desc',
  })
  if (options?.pageToken) params.set('pageToken', options.pageToken)

  const body = await googleApiJson<DriveListResult>(
    `${DRIVE_API}/files?${params.toString()}`,
    token,
    {},
    options?.fetchImpl,
  )
  return {
    files: Array.isArray(body.files) ? body.files : [],
    nextPageToken: typeof body.nextPageToken === 'string' ? body.nextPageToken : undefined,
  }
}

export async function searchDriveFiles(query: string, limit = 20, fetchImpl?: GoogleFetch): Promise<DriveFile[]> {
  if (!query.trim()) throw new Error('Drive search requires a query.')
  const result = await listDriveFiles({ query, pageSize: limit, fetchImpl })
  return result.files
}

export async function listDrivePdfFiles(options?: {
  folderId?: string
  pageToken?: string
  pageSize?: number
  fetchImpl?: GoogleFetch
}): Promise<DriveListResult> {
  return listDriveFiles({ ...options, mimeType: 'application/pdf' })
}

export async function getDriveFileMetadata(fileId: string, fetchImpl?: GoogleFetch): Promise<DriveFile> {
  if (!fileId.trim()) throw new Error('Drive file id is required.')
  const token = await getValidGoogleAccessToken(fetchImpl)
  return googleApiJson<DriveFile>(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime,size`,
    token,
    {},
    fetchImpl,
  )
}

export async function downloadDriveFile(fileId: string, fetchImpl?: GoogleFetch): Promise<Uint8Array> {
  if (!fileId.trim()) throw new Error('Drive file id is required.')
  const token = await getValidGoogleAccessToken(fetchImpl)
  return googleApiBytes(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, token, fetchImpl)
}

export async function downloadDriveText(fileId: string, fetchImpl?: GoogleFetch): Promise<{ name: string; mimeType: string; text: string }> {
  const meta = await getDriveFileMetadata(fileId, fetchImpl)
  const token = await getValidGoogleAccessToken(fetchImpl)
  if (meta.mimeType === GOOGLE_DOC) {
    const bytes = await googleApiBytes(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`, token, fetchImpl)
    return { name: meta.name, mimeType: meta.mimeType, text: new TextDecoder().decode(bytes) }
  }
  if (meta.mimeType === GOOGLE_SHEET) {
    const bytes = await googleApiBytes(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=text/csv`, token, fetchImpl)
    return { name: meta.name, mimeType: meta.mimeType, text: new TextDecoder().decode(bytes) }
  }
  const bytes = await downloadDriveFile(fileId, fetchImpl)
  if (meta.mimeType.startsWith('text/') || meta.mimeType === 'application/json') {
    return { name: meta.name, mimeType: meta.mimeType, text: new TextDecoder().decode(bytes) }
  }
  return { name: meta.name, mimeType: meta.mimeType, text: '' }
}
