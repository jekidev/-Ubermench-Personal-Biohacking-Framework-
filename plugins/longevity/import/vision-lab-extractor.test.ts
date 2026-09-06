import { describe, expect, it } from 'vitest'
import { bytesToBase64, parseVisionExtractionResponse } from './vision-lab-extractor'

describe('vision lab extractor', () => {
  it('encodes bytes to base64', () => {
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=')
  })

  it('parses vision JSON page output', () => {
    const blocks = parseVisionExtractionResponse('{"pages":[{"page":1,"text":"Hemoglobin 14.2 g/dL"}]}')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.text).toContain('Hemoglobin')
    expect(blocks[0]?.confidence).toBe(0.55)
  })
})
