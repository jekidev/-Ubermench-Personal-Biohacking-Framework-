export interface SelectedLocalFile {
  name: string
  path: string
  mimeType: string
  sizeBytes: number
  contents: Uint8Array
}

export interface NativeFileAdapter {
  pickFile(options: { acceptedMimeTypes: string[]; multiple?: boolean }): Promise<SelectedLocalFile[]>
  persistSourceFile(file: SelectedLocalFile, fingerprint: string): Promise<{ localPath: string }>
}

/**
 * Browser-safe adapter contract. The real Tauri implementation is injected by the app shell.
 * Keeping this interface in the plugin lets Nuxt components remain platform-agnostic.
 */
export class NoopNativeFileAdapter implements NativeFileAdapter {
  async pickFile(): Promise<SelectedLocalFile[]> {
    return []
  }

  async persistSourceFile(): Promise<{ localPath: string }> {
    throw new Error('Native file persistence adapter is not configured')
  }
}

export async function sha256Hex(contents: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', contents)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function detectImportMime(fileName: string, mimeType = ''): 'pdf' | 'csv' | 'tsv' | 'json' | 'vcf' | 'unknown' {
  const lower = fileName.toLowerCase()
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (mimeType === 'text/csv' || lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.tsv') || mimeType === 'text/tab-separated-values') return 'tsv'
  if (mimeType === 'application/json' || lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.vcf') || lower.endsWith('.vcf.gz')) return 'vcf'
  return 'unknown'
}
