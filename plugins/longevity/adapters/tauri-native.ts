export type NativeFileKind = 'bloods' | 'genetics'

export interface NativeFileSelection {
  token: string
  name: string
  mimeType: string
  sizeBytes: number
  kind: NativeFileKind
}

export interface NativeSourceFingerprint {
  sha256: string
  sizeBytes: number
}

export interface TauriNativeAdapter {
  pickFile(kind: NativeFileKind): Promise<NativeFileSelection | null>
  fingerprintBytes(bytes: number[]): Promise<NativeSourceFingerprint>
}

export function createTauriNativeAdapter(): TauriNativeAdapter {
  return {
    async pickFile(kind) {
      if (!import.meta.client) return null
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        directory: false,
        fileAccessMode: 'copy',
        filters: [{
          name: kind === 'bloods' ? 'Lab reports' : 'DNA / genetics',
          extensions: kind === 'bloods' ? ['pdf', 'csv', 'tsv', 'json'] : ['vcf', 'csv', 'tsv', 'json', 'pdf', 'txt'],
        }],
      })
      if (!selected || Array.isArray(selected)) return null
      const name = selected.split(/[\\/]/).pop() ?? 'source'
      return { token: selected, name, mimeType: 'application/octet-stream', sizeBytes: 0, kind }
    },
    async fingerprintBytes(bytes) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<NativeSourceFingerprint>('fingerprint_bytes', { data: bytes })
    },
  }
}
