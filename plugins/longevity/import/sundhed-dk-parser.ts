import type { PdfLabCandidate, PdfTextBlock } from './pdf-lab-engine'

export type SundhedDkMetadata = {
  patientName?: string
  source: 'sundhed.dk'
  exportedAt?: string
}

const DANISH_ALIASES: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'hemoglobin', patterns: [/hæmoglobin/i, /haemoglobin/i, /hemoglobin/i] },
  { key: 'leukocytes', patterns: [/leukocytter/i, /leukocytes/i] },
  { key: 'lymphocytes', patterns: [/lymfocytter/i, /lymphocytes/i] },
  { key: 'neutrophils', patterns: [/neutrofilocytter/i, /neutrophils/i] },
  { key: 'platelets', patterns: [/trombocytter/i, /platelets/i] },
  { key: 'albumin', patterns: [/albumin/i] },
  { key: 'creatinine', patterns: [/kreatinin/i, /creatinine/i] },
  { key: 'egfr', patterns: [/egfr/i] },
  { key: 'crp', patterns: [/c-reaktivt protein/i, /\bcrp\b/i] },
  { key: 'ldl_c', patterns: [/kolesterol ldl/i, /\bldl\b/i] },
  { key: 'hdl_c', patterns: [/kolesterol hdl/i, /\bhdl\b/i] },
  { key: 'total_cholesterol', patterns: [/^kolesterol;/i, /^kolesterol$/i, /total cholesterol/i] },
  { key: 'triglycerides', patterns: [/triglycerid/i, /triglycerides/i] },
  { key: 'hba1c', patterns: [/hæmoglobin a1c/i, /hba1c/i] },
  { key: 'glucose', patterns: [/glukose/i, /glucose/i] },
  { key: 'tsh', patterns: [/thyrotropin/i, /\btsh\b/i] },
  { key: 'free_t4', patterns: [/thyroxin frit/i, /free t4/i] },
  { key: 'alt', patterns: [/alanintransaminase/i, /\balat\b/i] },
  { key: 'alp', patterns: [/basisk fosfatase/i, /\balp\b/i] },
  { key: 'bilirubin', patterns: [/bilirubiner/i, /bilirubin/i] },
  { key: 'sodium', patterns: [/natrium/i, /sodium/i] },
  { key: 'potassium', patterns: [/kalium/i, /potassium/i] },
  { key: 'folate', patterns: [/folat/i, /folate/i] },
  { key: 'b12', patterns: [/vitamin b12/i, /\bb12\b/i] },
  { key: 'mcv', patterns: [/erytrocytvolumen \(middel\)/i, /\bmcv\b/i] },
  { key: 'rdw', patterns: [/erytrocytvol\. rel\. spredning/i, /\brdw\b/i] },
]

const DATE_HEADER = /^(?:\d{4}\s+)?\d{2}\.\d{2}(?:\s+\d{2}:\d{2})?$/

function parseDanishNumber(token: string): number | null {
  const cleaned = token.replace(/[<>≤≥]/g, '').trim()
  if (!cleaned || /^aflyst|erstattet|taget|udført|gruppesvar/i.test(cleaned)) return null
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function matchBiomarker(line: string): string | null {
  for (const entry of DANISH_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(line))) return entry.key
  }
  return null
}

function parseDateToken(token: string): string | undefined {
  const match = token.match(/(\d{4})\s+(\d{2})\.(\d{2})/)
  if (!match) return undefined
  return `${match[1]}-${match[2]}-${match[3]}`
}

function extractMetadata(text: string): SundhedDkMetadata {
  const exported = text.match(/Laboratoriesvarsoversigt fra www\.sundhed\.dk,\s*(\d{2}\.\s*\w+\s*\d{4})/i)
  const nameLine = text.split(/\r?\n/).find((line) => /[A-ZÆØÅ][a-zæøå]+ [A-ZÆØÅ][a-zæøå]+/.test(line) && !line.includes('Analysetype'))
  return {
    source: 'sundhed.dk',
    exportedAt: exported?.[1],
    patientName: nameLine?.trim(),
  }
}

function isSundhedDkDocument(text: string): boolean {
  return /www\.sundhed\.dk/i.test(text) || /Laboratoriesvarsoversigt/i.test(text)
}

export function parseSundhedDkText(text: string, page = 1): PdfLabCandidate[] {
  if (!isSundhedDkDocument(text)) return []
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const dateColumns: Array<{ index: number; collectedAt?: string }> = []
  const candidates: PdfLabCandidate[] = []

  for (const line of lines) {
    if (DATE_HEADER.test(line.replace(/\s+/g, ' '))) {
      dateColumns.push({ index: dateColumns.length, collectedAt: parseDateToken(line) })
    }
  }

  for (const line of lines) {
    const biomarker = matchBiomarker(line)
    if (!biomarker) continue

    const unitMatch = line.match(/(?:mmol\/l|mg\/l|μmol\/l|umol\/l|× 10\^9\/l|u\/l|pmol\/l|nmol\/l|fl|g\/l)/i)
    const tail = unitMatch ? line.slice(unitMatch.index! + unitMatch[0].length) : line
    const rawMatches = [...tail.matchAll(/(?:<\s*)?(\d+(?:[,.]\d+)?)/g)].map((match) => ({
      value: parseDanishNumber(match[1]),
      belowDetection: match[0].includes('<'),
    })).filter((entry): entry is { value: number; belowDetection: boolean } => entry.value !== null)

    const numericValues = rawMatches.length > 1 && rawMatches[0]?.belowDetection
      ? rawMatches.slice(1)
      : rawMatches

    const unitLabel = unitMatch?.[0]?.trim() || 'unknown'

    if (!numericValues.length) continue

    numericValues.forEach((entry, index) => {
      const collectedAt = dateColumns[index]?.collectedAt
      const warnings: string[] = []
      if (unitLabel === 'unknown') warnings.push('Unit could not be confidently extracted')
      if (!collectedAt) warnings.push('Collection date not mapped from sundhed.dk header')
      candidates.push({
        biomarker,
        value: entry.value,
        unit: unitLabel,
        collectedAt,
        laboratory: 'sundhed.dk',
        page,
        locator: `sundhed.dk:${biomarker}:${index}`,
        confidence: warnings.length ? 0.75 : 0.92,
        warnings,
      })
    })
  }

  return candidates
}

export function parseSundhedDkBlocks(blocks: PdfTextBlock[]): { candidates: PdfLabCandidate[]; metadata: SundhedDkMetadata } {
  const fullText = blocks.map((block) => block.text).join('\n')
  const metadata = extractMetadata(fullText)
  const candidates = blocks.flatMap((block) => parseSundhedDkText(block.text, block.page))
  return { candidates, metadata }
}
