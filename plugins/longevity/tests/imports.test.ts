import { describe, expect, it } from 'vitest'
import { parseBloodCsv } from '../app/imports/blood-parser'
import { parseGeneticData } from '../app/imports/dna-parser'

describe('Longevity import parsers', () => {
  it('parses blood CSV and canonicalizes common markers', () => {
    const preview = parseBloodCsv(
      'Marker,Value,Unit,Date,Lab\nApoB,0.72,g/L,2026-08-20,Example Lab\nHbA1c,5.2,%,2026-08-20,Example Lab',
      'blood.csv',
      'doc-1',
    )

    expect(preview.markers).toHaveLength(2)
    expect(preview.markers[0].canonicalMarker).toBe('ApoB')
    expect(preview.markers[1].canonicalMarker).toBe('HbA1c')
    expect(preview.labName).toBe('Example Lab')
  })

  it('parses VCF variants without interpreting clinical significance', () => {
    const preview = parseGeneticData(
      '##fileformat=VCFv4.3\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\n1\t12345\trs123\tA\tG\t.\tPASS\t.\tGT\t0/1',
      'genome.vcf',
      'doc-2',
    )

    expect(preview.variantCount).toBe(1)
    expect(preview.variants[0].rsid).toBe('rs123')
    expect(preview.findingCount).toBe(0)
  })
})
