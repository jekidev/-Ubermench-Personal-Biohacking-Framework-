import { describe, expect, it } from 'vitest'
import { chunkDocumentPages } from './chunker'

describe('document chunker', () => {
  it('chunks long page text into retrievable segments', () => {
    const chunks = chunkDocumentPages({
      documentId: 'doc-1',
      sha256: 'abc',
      filename: 'labs.pdf',
      pages: [{ page: 1, text: 'CRP 1.2 mg/L\n\nGlucose 5.1 mmol/L\n\n'.repeat(80) }],
    })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0]?.tags).toContain('lab-document')
  })
})
