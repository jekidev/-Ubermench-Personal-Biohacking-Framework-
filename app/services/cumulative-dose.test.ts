import { describe, expect, it } from 'vitest'
import { detectCumulativeDoses, parseDose } from './cumulative-dose'

describe('cumulative dose', () => {
  it('parses labelled doses with unit aliases', () => {
    expect(parseDose('2000 IU')).toEqual({ value: 2000, unit: 'iu' })
    expect(parseDose('25mcg')).toEqual({ value: 25, unit: 'mcg' })
  })

  it('sums matching units for duplicate ingredients', () => {
    const findings = detectCumulativeDoses([
      { name: 'Vitamin D3', dose: '2000 IU', active: true },
      { name: 'Cholecalciferol', dose: '1000 IU', active: true },
    ])
    expect(findings[0]?.ingredient).toBe('vitamin-d')
    expect(findings[0]?.total).toEqual({ value: 3000, unit: 'iu' })
  })

  it('ignores inactive entries and unmatched singles', () => {
    const findings = detectCumulativeDoses([
      { name: 'Magnesium glycinate', dose: '200 mg', active: false },
      { name: 'Magnesium citrate', dose: '200 mg', active: true },
    ])
    expect(findings).toEqual([])
  })
})
