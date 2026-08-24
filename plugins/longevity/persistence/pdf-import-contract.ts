export type PdfExtractionMethod = 'native-text' | 'ocr'

export type PdfPage = {
  page: number
  text: string
}

export type PdfLabExtraction = {
  method: PdfExtractionMethod
  pages: PdfPage[]
  warnings: string[]
}

export type BiomarkerCandidate = {
  biomarker: string
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  page: number
  confidence: number
  locator?: string
}

const BIOMARKERS: Record<string, string> = {
  apob: 'ApoB',
  'apo b': 'ApoB',
  'crp': 'CRP',
  'hs-crp': 'hs-CRP',
  hba1c: 'HbA1c',
  'hba1c %': 'HbA1c',
  creatinine: 'Creatinine',
  kreatinin: 'Creatinine',
  'ldl-c': 'LDL-C',
  'ldl kolesterol': 'LDL-C',
}

const number = '(-?\\d+(?:[,.]\\d+)?)'

export function parseLabPdfExtraction(extraction: PdfLabExtraction): BiomarkerCandidate[] {
  const candidates: BiomarkerCandidate[] = []
  for (const page of extraction.pages) {
    for (const line of page.text.split(/\\r?\\n/)) {
      const normalized = line.trim().toLowerCase()
      for (const [needle, canonical] of Object.entries(BIOMARKERS)) {
        if (!normalized.includes(needle)) continue
        const valueMatch = line.match(new RegExp(`${number}\\s*([a-zA-Z%µμ/]+(?:\\/[a-zA-Z]+)?)?`))
        if (!valueMatch) continue
        const value = Number(valueMatch[1].replace(',', '.'))
        if (!Number.isFinite(value)) continue
        const unit = valueMatch[2] ?? ''
        candidates.push({
          biomarker: canonical,
          value,
          unit,
          page: page.page,
          confidence: extraction.method === 'native-text' ? 0.9 : 0.75,
          locator: `page:${page.page}`,
        })
        break
      }
    }
  }
  return candidates
}
