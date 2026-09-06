import { getValidGoogleAccessToken, loadGoogleCredentials } from '../oauth/google-token-store'

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

export async function listDrivePdfFiles(options?: {
  folderId?: string
  pageToken?: string
  pageSize?: number
}): Promise<DriveListResult> {
  const token = await getValidGoogleAccessToken()
  const creds = await loadGoogleCredentials()
  const folderId = options?.folderId ?? creds.driveFolderId
  const queryParts = ["mimeType='application/pdf'", 'trashed=false']
  if (folderId?.trim()) queryParts.push(`'${folderId.trim()}' in parents`)

  const params = new URLSearchParams({
    q: queryParts.join(' and '),
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
    pageSize: String(options?.pageSize ?? 25),
    orderBy: 'modifiedTime desc',
  })
  if (options?.pageToken) params.set('pageToken', options.pageToken)

  const response = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message ?? 'Google Drive list failed')
  return {
    files: Array.isArray(body.files) ? body.files as DriveFile[] : [],
    nextPageToken: typeof body.nextPageToken === 'string' ? body.nextPageToken : undefined,
  }
}

export async function downloadDriveFile(fileId: string): Promise<Uint8Array> {
  const token = await getValidGoogleAccessToken()
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Google Drive download failed (${response.status})`)
  }
  return new Uint8Array(await response.arrayBuffer())
}
