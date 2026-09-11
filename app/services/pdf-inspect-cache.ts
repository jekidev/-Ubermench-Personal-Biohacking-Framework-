import { inspectPdfBytes, type PdfInspection } from '../../plugins/longevity/pdf/pdf-inspector'

export const PDF_INSPECT_CACHE_KEY = 'ubermensch:pdf-inspect-last:v1'
export const MAX_PDF_INSPECT_BYTES = 5 * 1024 * 1024
export const SAMPLE_PDF_BYTES = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')

export type CachedPdfInspection = {
  filename: string
  inspection: PdfInspection
  inspectedAt: string
  byteLength: number
}

let memoryCache: CachedPdfInspection | null = null

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

function isPdfInspection(value: unknown): value is PdfInspection {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    (record.kind === 'text' || record.kind === 'scanned' || record.kind === 'mixed' || record.kind === 'empty')
    && typeof record.textStreamCount === 'number'
    && typeof record.imageXObjectCount === 'number'
    && typeof record.recommendOcr === 'boolean'
  )
}

export function clearPdfInspectCache(
  storage: Pick<Storage, 'removeItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): void {
  memoryCache = null
  storage?.removeItem(PDF_INSPECT_CACHE_KEY)
}

export function getLastPdfInspection(
  storage: Pick<Storage, 'getItem'> | undefined = defaultStorage(),
): CachedPdfInspection | null {
  if (storage) {
    try {
      const raw = storage.getItem(PDF_INSPECT_CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CachedPdfInspection>
        if (
          typeof parsed.filename === 'string'
          && typeof parsed.inspectedAt === 'string'
          && typeof parsed.byteLength === 'number'
          && isPdfInspection(parsed.inspection)
        ) {
          memoryCache = {
            filename: parsed.filename,
            inspection: parsed.inspection,
            inspectedAt: parsed.inspectedAt,
            byteLength: parsed.byteLength,
          }
        }
      }
    } catch {
      // Ignore corrupt cache and fall back to memory.
    }
  }
  return memoryCache
}

export function cachePdfInspection(
  entry: Omit<CachedPdfInspection, 'inspectedAt'> & { inspectedAt?: string },
  storage: Pick<Storage, 'setItem'> | undefined = defaultStorage(),
): CachedPdfInspection {
  const cached: CachedPdfInspection = {
    filename: entry.filename.trim() || 'upload.pdf',
    inspection: entry.inspection,
    inspectedAt: entry.inspectedAt ?? new Date().toISOString(),
    byteLength: entry.byteLength,
  }
  memoryCache = cached
  storage?.setItem(PDF_INSPECT_CACHE_KEY, JSON.stringify(cached))
  return cached
}

export function inspectAndCachePdfBytes(
  bytes: Uint8Array,
  filename: string,
  storage: Pick<Storage, 'setItem'> | undefined = defaultStorage(),
): CachedPdfInspection {
  return cachePdfInspection({
    filename,
    inspection: inspectPdfBytes(bytes),
    byteLength: bytes.byteLength,
  }, storage)
}

export function inspectSamplePdfAndCache(
  storage: Pick<Storage, 'setItem'> | undefined = defaultStorage(),
): CachedPdfInspection {
  return inspectAndCachePdfBytes(SAMPLE_PDF_BYTES, 'sample.pdf', storage)
}

export function decodePdfBase64(input: string, maxBytes = MAX_PDF_INSPECT_BYTES): Uint8Array {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('plugins.pdf.inspect requires base64 PDF bytes.')
  const comma = trimmed.indexOf(',')
  const payload = trimmed.startsWith('data:') && comma !== -1 ? trimmed.slice(comma + 1) : trimmed
  const normalized = payload.replace(/\s/g, '')
  if (!normalized) throw new Error('plugins.pdf.inspect requires base64 PDF bytes.')
  if (normalized.length > maxBytes * 2) {
    throw new Error(`PDF exceeds the ${maxBytes} byte inspect limit.`)
  }

  const bytes = typeof Buffer === 'undefined'
    ? decodeWithAtob(normalized)
    : Uint8Array.from(Buffer.from(normalized, 'base64'))

  if (bytes.byteLength === 0) {
    throw new Error('plugins.pdf.inspect received empty PDF bytes.')
  }
  if (bytes.byteLength > maxBytes) {
    throw new Error(`PDF exceeds the ${maxBytes} byte inspect limit.`)
  }
  return bytes
}

function decodeWithAtob(normalized: string): Uint8Array {
  if (typeof atob !== 'function') {
    throw new Error('Base64 PDF decoding is unavailable in this runtime.')
  }
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
