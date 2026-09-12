import { afterEach, describe, expect, it } from 'vitest'
import { inspectPdfBytes } from '../../plugins/longevity/pdf/pdf-inspector'
import {
  cachePdfInspection,
  clearPdfInspectCache,
  decodePdfBase64,
  getLastPdfInspection,
  inspectAndCachePdfBytes,
  inspectSamplePdfAndCache,
  PDF_INSPECT_CACHE_KEY,
  subscribePdfInspectCache,
} from './pdf-inspect-cache'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key) },
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

describe('pdf inspect cache', () => {
  afterEach(() => {
    clearPdfInspectCache()
  })

  it('persists inspection metadata without file bytes', () => {
    const storage = memoryStorage()
    const bytes = new TextEncoder().encode('%PDF-1.4\nBT (Glucose 5.2 mmol/L) ET')
    const cached = inspectAndCachePdfBytes(bytes, 'labs.pdf', storage)
    expect(cached.filename).toBe('labs.pdf')
    expect(cached.inspection.kind).toBe('text')
    expect(cached.byteLength).toBe(bytes.byteLength)
    expect(storage.getItem(PDF_INSPECT_CACHE_KEY)?.includes('%PDF')).toBe(false)
    expect(getLastPdfInspection(storage)?.filename).toBe('labs.pdf')
  })

  it('notifies subscribers when the last inspection changes', () => {
    const seen: Array<string | null> = []
    const unsubscribe = subscribePdfInspectCache((entry) => {
      seen.push(entry?.filename ?? null)
    })
    inspectSamplePdfAndCache()
    clearPdfInspectCache()
    unsubscribe()
    expect(seen).toEqual(['sample.pdf', null])
  })

  it('round-trips last inspection through storage', () => {
    const storage = memoryStorage()
    cachePdfInspection({
      filename: 'scan.pdf',
      inspection: inspectPdfBytes(new TextEncoder().encode('%PDF-1.4\n/Subtype /Image\n/XObject')),
      byteLength: 32,
    }, storage)
    clearPdfInspectCache()
    const restored = getLastPdfInspection(storage)
    expect(restored?.filename).toBe('scan.pdf')
    expect(restored?.inspection.kind).toBe('scanned')
  })

  it('inspects the built-in sample PDF', () => {
    const cached = inspectSamplePdfAndCache()
    expect(cached.filename).toBe('sample.pdf')
    expect(cached.inspection.kind).toBe('empty')
  })

  it('decodes data-URL base64 and rejects oversized payloads', () => {
    const pdf = '%PDF-1.4\nBT (ApoB) ET'
    const encoded = Buffer.from(pdf).toString('base64')
    const decoded = decodePdfBase64(`data:application/pdf;base64,${encoded}`)
    expect(new TextDecoder().decode(decoded)).toContain('ApoB')
    expect(() => decodePdfBase64('AAAA', 1)).toThrow(/limit/)
    expect(() => decodePdfBase64('')).toThrow(/base64/)
  })
})
