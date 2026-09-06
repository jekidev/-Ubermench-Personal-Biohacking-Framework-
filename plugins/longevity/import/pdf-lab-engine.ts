export type PdfTextBlock = {
  text: string
  page: number
  confidence?: number
}

export type PdfLabCandidate = {
  biomarker: string
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  referenceText?: string
  collectedAt?: string
  laboratory?: string
  page: number
  locator: string
  confidence: number
  warnings: string[]
}

import { parseSundhedDkBlocks } from './sundhed-dk-parser'

const CANONICAL: Array<{ key: string; aliases: string[] }> = [
  { key: 'hemoglobin', aliases: ['hemoglobin', 'haemoglobin', 'hgb', 'hæmoglobin'] },
  { key: 'leukocytes', aliases: ['leukocytes', 'white blood cells', 'wbc', 'leukocytter'] },
  { key: 'lymphocytes', aliases: ['lymphocytes', 'lymfocytter'] },
  { key: 'platelets', aliases: ['platelets', 'thrombocytes', 'trombocytter'] },
  { key: 'albumin', aliases: ['albumin'] },
  { key: 'creatinine', aliases: ['creatinine', 'kreatinin'] },
  { key: 'egfr', aliases: ['egfr', 'gfr'] },
  { key: 'crp', aliases: ['crp', 'c-reactive protein', 'c reactive protein', 'c-reaktivt protein'] },
  { key: 'apoB', aliases: ['apob', 'apo b', 'apolipoprotein b'] },
  { key: 'ldl_c', aliases: ['ldl-c', 'ldl c', 'ldl', 'kolesterol ldl'] },
  { key: 'hdl_c', aliases: ['hdl-c', 'hdl c', 'hdl', 'kolesterol hdl'] },
  { key: 'triglycerides', aliases: ['triglycerides', 'triglycerid'] },
  { key: 'total_cholesterol', aliases: ['total cholesterol', 'cholesterol total', 'kolesterol'] },
  { key: 'hba1c', aliases: ['hba1c', 'hb a1c', 'glycated hemoglobin', 'hæmoglobin a1c'] },
  { key: 'glucose', aliases: ['glucose', 'blood glucose', 'fasting glucose', 'glukose'] },
  { key: 'tsh', aliases: ['tsh', 'thyrotropin'] },
  { key: 'alt', aliases: ['alt', 'alat', 'alanintransaminase'] },
  { key: 'alp', aliases: ['alp', 'basisk fosfatase', 'alkaline phosphatase'] },
  { key: 'mcv', aliases: ['mcv', 'erytrocytvolumen'] },
  { key: 'rdw', aliases: ['rdw', 'erytrocytvol'] },
]

function normalizeName(raw: string): string | null {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  return CANONICAL.find((entry) => entry.aliases.some((alias) => lower === alias || lower.startsWith(`${alias} `)))?.key ?? null
}

function numberFromToken(token: string): number | null {
  const normalized = token.replace(/\./g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return normalized ? Number(normalized[0]) : null
}

function parseReference(text: string): { low?: number; high?: number } {
  const range = text.match(/(-?\d+(?:[,.]\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:[,.]\d+)?)/i)
  if (!range?.[1] || !range[2]) return {}
  const low = numberFromToken(range[1])
  const high = numberFromToken(range[2])
  return {
    low: low ?? undefined,
    high: high ?? undefined,
  }
}

export function parsePdfLabBlocks(blocks: PdfTextBlock[]): PdfLabCandidate[] {
  const sundhed = parseSundhedDkBlocks(blocks)
  if (sundhed.candidates.length > 0) return sundhed.candidates

  const candidates: PdfLabCandidate[] = []
  for (const block of blocks) {
    const lines = block.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    for (const line of lines) {
      const name = normalizeName(line)
      if (!name) continue
      const tail = line.slice(line.toLowerCase().indexOf(name.toLowerCase()) + name.length).trim()
      const valueMatch = tail.match(/(-?\d+(?:[,.]\d+)?)/)
      if (!valueMatch?.[1]) continue
      const value = numberFromToken(valueMatch[1])
      if (value === null) continue
      const unit = tail.replace(valueMatch[1], '').trim().split(/\s{2,}|\(|\[/)[0] || 'unknown'
      const reference = parseReference(tail)
      const confidenceBase = block.confidence ?? 0.7
      const warnings: string[] = []
      if (unit === 'unknown') warnings.push('Unit could not be confidently extracted')
      if (reference.low === undefined || reference.high === undefined) warnings.push('Laboratory reference interval not confidently extracted')
      candidates.push({
        biomarker: name,
        value,
        unit,
        referenceLow: reference.low,
        referenceHigh: reference.high,
        referenceText: tail,
        page: block.page,
        locator: `page:${block.page}`,
        confidence: Math.min(confidenceBase, warnings.length ? 0.6 : 0.95),
        warnings,
      })
    }
  }
  return candidates
}

export function buildPdfReviewSummary(candidates: PdfLabCandidate[]) {
  return {
    count: candidates.length,
    requiresReview: candidates.some((item) => item.confidence < 0.9 || item.warnings.length > 0),
    pages: [...new Set(candidates.map((item) => item.page))].sort((a, b) => a - b),
  }
}
