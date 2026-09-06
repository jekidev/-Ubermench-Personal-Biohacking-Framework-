export type GoogleClientJson = {
  web?: {
    client_id?: string
    client_secret?: string
    project_id?: string
  }
  installed?: {
    client_id?: string
    client_secret?: string
    project_id?: string
  }
}

export function parseGoogleClientSecretJson(raw: string): { clientId: string; clientSecret?: string; projectId?: string } {
  const parsed = JSON.parse(raw) as GoogleClientJson
  const entry = parsed.web ?? parsed.installed
  if (!entry?.client_id?.trim()) {
    throw new Error('Invalid Google client JSON. Expected web.client_id or installed.client_id.')
  }
  return {
    clientId: entry.client_id.trim(),
    clientSecret: entry.client_secret?.trim() || undefined,
    projectId: entry.project_id?.trim() || undefined,
  }
}
