import { describe, expect, it } from 'vitest'
import { BLOOD_FILE_PICK_REQUEST, DNA_FILE_PICK_REQUEST, classifyFilename } from './adapter'

describe('Longevity native adapter contract', () => {
  it('defines safe blood upload extensions', () => {
    expect(BLOOD_FILE_PICK_REQUEST.extensions).toEqual(['pdf', 'csv', 'tsv', 'json'])
  })

  it('defines DNA upload extensions', () => {
    expect(DNA_FILE_PICK_REQUEST.extensions).toContain('vcf')
    expect(DNA_FILE_PICK_REQUEST.extensions).toContain('pdf')
  })

  it('classifies unambiguous filenames without reading file contents', () => {
    expect(classifyFilename('genome.vcf')).toBe('dna_raw')
    expect(classifyFilename('bloods.pdf')).toBe('blood_report')
    expect(classifyFilename('unknown.csv')).toBe('unknown')
  })
})
