import { describe, expect, it, vi } from 'vitest'
import { parseSelectedFile, parseSelectedFileAsync } from './parser'

vi.mock('./pdf-extraction-pipeline', () => ({
  runPdfExtractionPipeline: vi.fn(async () => ({
    method: 'native-text',
    blocks: [{ page: 1, text: 'CRP 0.4' }],
    candidates: [
      { biomarker: 'CRP', value: 0.4, unit: 'mg/L', confidence: 0.9, page: 1, locator: 'p1', warnings: [] },
      { biomarker: 'CRP', value: 0.5, unit: 'mg/L', confidence: 0.9, page: 2, locator: 'p2', warnings: [] },
      { biomarker: 'Glucose', value: 5.2, unit: 'mmol/L', confidence: 0.9, page: 1, locator: 'p1g', warnings: [] },
    ],
    warnings: [],
    requiresReview: false,
  })),
}))

describe('longevity import parser', () => {
  it('keeps unique observation ids for JSON rows with the same marker', () => {
    const file = {
      name: 'labs.json',
      path: '',
      mimeType: 'application/json',
      sizeBytes: 2,
      contents: new TextEncoder().encode(JSON.stringify([
        { biomarker: 'CRP', value: 0.4, unit: 'mg/L' },
        { biomarker: 'CRP', value: 0.8, unit: 'mg/L' },
      ])),
    }
    const { candidates } = parseSelectedFile(file, 'doc-json')
    const ids = candidates.map((item) => item.type === 'observation' ? item.value.id : '')
    expect(new Set(ids).size).toBe(2)
  })

  it('keeps unique observation ids when a PDF yields duplicate biomarkers', async () => {
    const file = {
      name: 'labs.pdf',
      path: '',
      mimeType: 'application/pdf',
      sizeBytes: 8,
      contents: new TextEncoder().encode('%PDF-1.4'),
    }
    const { candidates } = await parseSelectedFileAsync(file, 'doc-pdf')
    const ids = candidates.map((item) => item.type === 'observation' ? item.value.id : '')
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })
})
