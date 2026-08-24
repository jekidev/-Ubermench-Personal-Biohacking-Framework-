import { describe, expect, it } from 'vitest'
import { MissingPdfExtractor } from './native-extractor'

describe('native PDF extractor boundary', () => {
  it('fails closed when no extractor is configured', async () => {
    const result = await new MissingPdfExtractor().extract('token')
    expect(result.pages).toEqual([])
    expect(result.warnings).toContain('No native PDF extractor is configured. Manual review is required.')
  })
})
