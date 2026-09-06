import { describe, expect, it } from 'vitest'
import { parseLlmLabExtractionResponse } from '../import/llm-lab-extractor'

describe('llm lab extractor', () => {
  it('parses structured biomarker JSON from LLM output', () => {
    const candidates = parseLlmLabExtractionResponse(JSON.stringify([
      { biomarker: 'CRP', value: 1.2, unit: 'mg/L', collectedAt: '2026-08-25' },
      { biomarker: 'Glucose', value: 5.1, unit: 'mmol/L' },
    ]))

    expect(candidates).toHaveLength(2)
    expect(candidates[0]?.biomarker).toBe('CRP')
    expect(candidates[0]?.warnings[0]).toMatch(/LLM-assisted/)
  })
})
