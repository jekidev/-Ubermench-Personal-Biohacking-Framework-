import { describe, expect, it } from 'vitest'
import { classifyImport, previewImport } from './import-service'

const file = (name: string, mimeType: string) => ({
  name,
  path: `/tmp/${name}`,
  mimeType,
  sizeBytes: 3,
  contents: new Uint8Array([1, 2, 3]),
})

describe('longevity native import service', () => {
  it('classifies VCF as raw DNA', () => {
    expect(classifyImport(file('genome.vcf', 'text/plain'))).toBe('dna_raw')
  })

  it('classifies lab PDFs as blood reports', () => {
    expect(classifyImport(file('bloodwork.pdf', 'application/pdf'))).toBe('blood_report')
  })

  it('warns that PDF extraction needs a parser adapter', async () => {
    const preview = await previewImport(file('bloodwork.pdf', 'application/pdf'))
    expect(preview.warnings.join(' ')).toContain('PDF extraction requires')
    expect(preview.document.localOnly).toBe(true)
  })
})
