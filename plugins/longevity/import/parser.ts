import type { LocalGeneticVariant, LocalObservation } from '../persistence/local-store'
import { detectImportMime, type SelectedLocalFile } from '../tauri/file-adapter'

export type ImportCandidate =
  | { type: 'observation'; value: LocalObservation }
  | { type: 'variant'; value: LocalGeneticVariant }

const MARKER_ALIASES: Record<string, string> = {
  apob: 'ApoB',
  'apo b': 'ApoB',
  ldl: 'LDL-C',
  'ldl-c': 'LDL-C',
  hdl: 'HDL-C',
  triglycerides: 'Triglycerides',
  tg: 'Triglycerides',
  glucose: 'Glucose',
  'fasting glucose': 'Glucose',
  hba1c: 'HbA1c',
  'crp': 'CRP',
  creatinine: 'Creatinine',
  egfr: 'eGFR',
}

function canonicalMarker(input: string): string {
  const key = input.trim().toLowerCase()
  return MARKER_ALIASES[key] ?? input.trim()
}

function decode(file: SelectedLocalFile): string {
  return new TextDecoder().decode(file.contents)
}

function parseValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.replace(',', '.').replace(/[^0-9+\-.eE]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function observationId(source: string, row: number, marker: string): string {
  return `obs-${source.slice(0, 16)}-${row}-${marker.toLowerCase().replace(/\W+/g, '-')}`
}

function variantId(source: string, row: number): string {
  return `var-${source.slice(0, 16)}-${row}`
}

function parseDelimited(text: string, separator: ',' | '\t', sourceId: string, file: SelectedLocalFile): ImportCandidate[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase())
  const index = (names: string[]) => names.map((name) => headers.indexOf(name)).find((value) => value >= 0) ?? -1
  const markerIndex = index(['marker', 'biomarker', 'test', 'name', 'analyte'])
  const valueIndex = index(['value', 'result', 'measurement'])
  const unitIndex = index(['unit', 'units'])
  const dateIndex = index(['date', 'collectiondate', 'collection_date', 'sampledate'])
  const geneIndex = index(['gene'])
  const rsidIndex = index(['rsid', 'variant'])
  const genotypeIndex = index(['genotype', 'allele', 'call'])
  const candidates: ImportCandidate[] = []

  lines.slice(1).forEach((line, rowOffset) => {
    const row = rowOffset + 2
    const cells = line.split(separator).map((cell) => cell.trim())
    if (geneIndex >= 0 || rsidIndex >= 0) {
      const genotype = genotypeIndex >= 0 ? cells[genotypeIndex] : ''
      if (genotype) {
        candidates.push({ type: 'variant', value: {
          id: variantId(sourceId, row), sourceDocumentId: sourceId,
          gene: geneIndex >= 0 ? cells[geneIndex] : undefined,
          rsid: rsidIndex >= 0 ? cells[rsidIndex] : undefined,
          genotype, importedAt: new Date().toISOString(),
        } })
      }
      return
    }
    if (markerIndex < 0 || valueIndex < 0) return
    const value = parseValue(cells[valueIndex])
    if (value === null) return
    const marker = canonicalMarker(cells[markerIndex])
    candidates.push({ type: 'observation', value: {
      id: observationId(sourceId, row, marker), sourceDocumentId: sourceId,
      biomarker: marker, value, unit: unitIndex >= 0 ? cells[unitIndex] || 'unknown' : 'unknown',
      collectedAt: dateIndex >= 0 && cells[dateIndex] ? cells[dateIndex] : new Date().toISOString().slice(0, 10),
      confidence: 1, locator: `${file.name}:row-${row}`,
    } })
  })

  return candidates
}

function parseJson(text: string, sourceId: string, file: SelectedLocalFile): ImportCandidate[] {
  const parsed = JSON.parse(text) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item, index): ImportCandidate[] => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.genotype === 'string' || typeof record.rsid === 'string' || typeof record.gene === 'string') {
      return [{ type: 'variant', value: {
        id: variantId(sourceId, index + 1), sourceDocumentId: sourceId,
        gene: typeof record.gene === 'string' ? record.gene : undefined,
        rsid: typeof record.rsid === 'string' ? record.rsid : undefined,
        genotype: String(record.genotype ?? record.call ?? ''), importedAt: new Date().toISOString(),
      } }]
    }
    const marker = String(record.biomarker ?? record.marker ?? record.test ?? record.name ?? '').trim()
    const value = parseValue(record.value ?? record.result ?? record.measurement)
    if (!marker || value === null) return []
    return [{ type: 'observation', value: {
      id: observationId(sourceId, index + 1, marker), sourceDocumentId: sourceId,
      biomarker: canonicalMarker(marker), value, unit: String(record.unit ?? 'unknown'),
      collectedAt: String(record.date ?? record.collectionDate ?? new Date().toISOString().slice(0, 10)),
      confidence: 1, locator: `${file.name}:item-${index + 1}`,
    } }]
  })
}

function parseVcf(text: string, sourceId: string): ImportCandidate[] {
  return text.split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line, index): ImportCandidate | null => {
      const cells = line.split('\t')
      const info = cells[7] ?? ''
      const rsid = cells[2] && cells[2] !== '.' ? cells[2] : undefined
      const genotype = cells[9]?.split(':')[0] ?? ''
      return genotype ? { type: 'variant', value: {
        id: variantId(sourceId, index + 1), sourceDocumentId: sourceId, rsid,
        chromosome: cells[0], position: Number(cells[1]), genotype, importedAt: new Date().toISOString(),
      } } : info ? null : null
    })
    .filter((item): item is ImportCandidate => item !== null)
}

export function parseSelectedFile(file: SelectedLocalFile, sourceDocumentId: string): ImportCandidate[] {
  const format = detectImportMime(file.name, file.mimeType)
  const text = decode(file)
  try {
    if (format === 'csv') return parseDelimited(text, ',', sourceDocumentId, file)
    if (format === 'tsv') return parseDelimited(text, '\t', sourceDocumentId, file)
    if (format === 'json') return parseJson(text, sourceDocumentId, file)
    if (format === 'vcf') return parseVcf(text, sourceDocumentId)
  } catch {
    return []
  }
  return []
}
