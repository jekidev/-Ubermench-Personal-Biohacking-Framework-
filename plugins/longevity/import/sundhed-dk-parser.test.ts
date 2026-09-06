import { describe, expect, it } from 'vitest'
import { parseSundhedDkText } from './sundhed-dk-parser'

const SAMPLE = `
Laboratoriesvarsoversigt fra www.sundhed.dk, 09. april 2025 kl. 20:49.
261292-2015
Jeppe Bruun Charles Kildegaard
Analysetype
Enhed 2025
31.01
20:11
2025
19.01
08:12
Hæmoglobin;B mmol/L 9,0 8,3 8,8
C-reaktivt protein [CRP];P mg/L < 3 31 23
Kreatinin;P μmol/L 108 110 101
Kolesterol LDL;P mmol/L 2,3
Trombocytter;B × 10^9/L 364 151 186
`

describe('sundhed.dk parser', () => {
  it('extracts Danish biomarker rows with multiple collection dates', () => {
    const candidates = parseSundhedDkText(SAMPLE)
    const markers = candidates.map((item) => item.biomarker)
    expect(markers).toContain('hemoglobin')
    expect(markers).toContain('crp')
    expect(markers).toContain('creatinine')
    expect(markers).toContain('ldl_c')
    expect(markers).toContain('platelets')
    expect(candidates.find((item) => item.biomarker === 'crp')?.value).toBe(31)
  })

  it('returns empty output for non-sundhed documents', () => {
    expect(parseSundhedDkText('CRP 3,2 mg/L')).toEqual([])
  })
})
