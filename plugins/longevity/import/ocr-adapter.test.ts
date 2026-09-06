import { describe, expect, it } from 'vitest'
import { isNativeExtractionInsufficient, MIN_NATIVE_TEXT_CHARS, ocrPagesToBlocks } from './ocr-adapter'

describe('ocr adapter', () => {
  it('flags insufficient native extraction', () => {
    expect(isNativeExtractionInsufficient([], 0)).toBe(true)
    expect(isNativeExtractionInsufficient([{ page: 1, text: 'x'.repeat(MIN_NATIVE_TEXT_CHARS) }], 3)).toBe(false)
  })

  it('maps OCR pages to PDF blocks', () => {
    const blocks = ocrPagesToBlocks([{ page: 1, text: 'CRP 1.2 mg/L', confidence: 0.7, engine: 'test', warnings: [] }])
    expect(blocks[0]?.confidence).toBe(0.7)
    expect(blocks[0]?.text).toContain('CRP')
  })
})
