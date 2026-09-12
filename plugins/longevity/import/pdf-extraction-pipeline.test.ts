import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearPdfInspectCache, getLastPdfInspection } from '../../../app/services/pdf-inspect-cache'
import { runPdfExtractionPipeline } from './pdf-extraction-pipeline'

vi.mock('./pdf-adapter', () => ({
  BrowserPdfTextExtractor: class {
    async extract() { return [] }
  },
  extractLabCandidates: async () => ({ candidates: [], pages: [], requiresReview: true }),
}))

describe('pdf extraction pipeline inspect cache', () => {
  afterEach(() => {
    clearPdfInspectCache()
  })

  it('caches the imported filename for Settings → Plugins', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.4\nBT (CRP 0.4 mg/L) ET')
    const result = await runPdfExtractionPipeline(bytes, {
      inspectPdf: true,
      filename: 'nordic-labs.pdf',
    })
    expect(result.warnings.some((warning) => warning.includes('PDF inspector'))).toBe(false)
    const cached = getLastPdfInspection()
    expect(cached?.filename).toBe('nordic-labs.pdf')
    expect(cached?.inspection.kind).toBe('text')
    expect(JSON.stringify(cached).includes('%PDF')).toBe(false)
  })
})
