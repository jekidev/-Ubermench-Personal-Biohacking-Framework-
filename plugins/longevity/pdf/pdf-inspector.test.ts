import { describe, expect, it } from 'vitest'
import { inspectPdfBytes } from './pdf-inspector'

describe('pdf inspector', () => {
  it('flags scanned image-only PDFs for OCR', () => {
    const scanned = new TextEncoder().encode('%PDF-1.4\n/Subtype /Image\n/XObject')
    const inspection = inspectPdfBytes(scanned)
    expect(inspection.kind).toBe('scanned')
    expect(inspection.recommendOcr).toBe(true)
  })

  it('keeps text PDFs on the native extractor path', () => {
    const textPdf = new TextEncoder().encode('%PDF-1.4\nBT (Glucose 5.2 mmol/L) ET')
    const inspection = inspectPdfBytes(textPdf)
    expect(inspection.kind).toBe('text')
    expect(inspection.recommendOcr).toBe(false)
  })
})
