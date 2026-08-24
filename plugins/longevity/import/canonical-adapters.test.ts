import { describe, expect, it } from 'vitest'
import { labCandidateToRecord, normalizeNumericUnit } from './canonical-lab-adapter'
import { variantCandidateToRecord } from './canonical-genomics-adapter'

describe('canonical lab adapter', () => {
  it('creates review-first observations with provenance', () => {
    const record = labCandidateToRecord({
      id: 'lab-1',
      key: 'glucose',
      value: 90,
      unit: 'mg/dL',
      observedAt: '2026-08-24T07:00:00Z',
      confidence: 0.98,
      provenance: { sourceId: 'pdf-1', sourceType: 'pdf', importedAt: '2026-08-24T07:01:00Z' },
    })
    expect(record.payload.status).toBe('candidate')
    expect(record.provenance[0].sourceId).toBe('pdf-1')
  })

  it('converts glucose units only for the declared analyte', () => {
    expect(normalizeNumericUnit(100, 'glucose', 'mg/dL', 'mmol/L')).toBeCloseTo(5.55, 2)
    expect(() => normalizeNumericUnit(100, 'ApoB', 'mg/dL', 'mmol/L')).toThrow('Unsupported unit conversion')
  })
})

describe('canonical genomics adapter', () => {
  it('normalizes chromosome and allele casing', () => {
    const record = variantCandidateToRecord({
      id: 'var-1',
      genomeBuild: 'GRCh38',
      chrom: 'chr7',
      position: 117199644,
      rsid: 'rs1800795',
      ref: 'g',
      alt: 'c',
      genotype: 'gc',
      provenance: { sourceId: 'dna-1', sourceType: 'vcf', importedAt: '2026-08-24T07:02:00Z' },
    })
    expect(record.payload.chrom).toBe('7')
    expect(record.payload.ref).toBe('G')
    expect(record.payload.alt).toBe('C')
    expect(record.payload.status).toBe('candidate')
  })

  it('rejects unsupported chromosomes', () => {
    expect(() => variantCandidateToRecord({
      id: 'var-2', chrom: 'chr99', position: 1, ref: 'A', alt: 'G', genotype: 'AG',
      provenance: { sourceId: 'dna-2', sourceType: 'vcf', importedAt: '2026-08-24T07:02:00Z' },
    })).toThrow('Unsupported chromosome')
  })
})
