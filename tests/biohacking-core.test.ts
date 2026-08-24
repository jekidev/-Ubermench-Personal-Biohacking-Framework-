import { describe, expect, it } from 'vitest'
import { routeHFModel } from '../app/services/hf-router'
import { calculateBiomarkerTrend } from '../app/services/biomarker-engine'
import { aggregateEvidence } from '../app/services/evidence-engine'
import { screenInteractions } from '../app/services/interaction-engine'
import { parseVcf } from '../app/services/genomics-parser'

describe('biohacking core', () => {
  it('routes genomics to a local-safe model when restricted models are disallowed', () => {
    const model = routeHFModel('genomics', { runtime: 'hybrid', allowRestricted: false })
    expect(model).toBeDefined()
    expect(model?.privacy).not.toBe('restricted')
  })

  it('calculates longitudinal biomarker change', () => {
    const trend = calculateBiomarkerTrend([
      { id: '1', name: 'CRP', value: 4, unit: 'mg/L', measuredAt: '2026-01-01', source: 'manual' },
      { id: '2', name: 'CRP', value: 2, unit: 'mg/L', measuredAt: '2026-08-01', source: 'manual' },
    ], 'CRP')
    expect(trend.delta).toBe(-2)
    expect(trend.percentChange).toBe(-50)
    expect(trend.direction).toBe('down')
  })

  it('weights stronger evidence above mechanistic evidence', () => {
    const strong = aggregateEvidence([{ id: '1', title: 'RCT', source: 'test', evidenceLevel: 'randomized-trial', confidence: 1 }])
    const weak = aggregateEvidence([{ id: '2', title: 'Mechanism', source: 'test', evidenceLevel: 'mechanistic', confidence: 1 }])
    expect(strong).toBeGreaterThan(weak)
  })

  it('flags known medication-supplement combinations conservatively', () => {
    const flags = screenInteractions(
      [{ id: 'm1', name: 'warfarin', active: true }],
      [{ id: 's1', name: 'fish oil', active: true }],
    )
    expect(flags.length).toBe(1)
    expect(flags[0]?.severity).toBe('caution')
  })

  it('parses phased VCF genotypes and rejects invalid positions', () => {
    const variants = parseVcf([
      '##fileformat=VCFv4.3',
      '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE',
      '1\t123\trs123\tA\tG\t.\tPASS\t.\tGT\t0|1',
      '1\tbad\trs999\tC\tT\t.\tPASS\t.\tGT\t1/1',
    ].join('\n'))

    expect(variants).toHaveLength(1)
    expect(variants[0]?.position).toBe(123)
    expect(variants[0]?.zygosity).toBe('heterozygous')
    expect(variants[0]?.rsId).toBe('rs123')
  })
})
