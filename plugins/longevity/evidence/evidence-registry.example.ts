import type { EvidenceRecord } from './risk-engine'

/** Example registry shape. Real claims must be populated from reviewed sources. */
export const exampleEvidenceRegistry: EvidenceRecord[] = [
  {
    id: 'example-apob-001',
    biomarker: 'ApoB',
    grade: 'A',
    interpretation: 'causal-evidence',
    riskDirection: 'higher',
    title: 'ApoB / atherogenic particle burden',
    summary: 'Example registry entry only: link the current measurement to the reviewed evidence record before producing a contextual statement.',
    source: 'REPLACE_WITH_REVIEWED_SOURCE',
    sourceVersion: '0',
  },
]
