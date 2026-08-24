import type { BloodImportPreview, BloodMarkerImport, ImportFormat } from './types'

const ALIASES: Record<string, string> = {
  'apo b': 'ApoB',
  apob: 'ApoB',
  'ldl cholesterol': 'LDL-C',
  ldl: 'LDL-C',
  'hdl cholesterol': 'HDL-C',
  hdl: 'HDL-C',
  triglycerides: 'Triglycerides',
  hba1c: 'HbA1c',
  'hb a1c': 'HbA1c',
  glucose: 'Fasting glucose',
  'fasting glucose': 'Fasting glucose',
  creatinine: 'Creatinine',
  egfr: 'eGFR',
  crp: 'CRP',
  'c reactive protein': 'CRP',
  alt: 'ALT',
  ast: 'AST',
  ggt: 'GGT',
  'vitamin b12': 'Vitamin B12',
  b12: 'Vitamin B12',
}

function canonicalMarker(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  return ALIASES[normalized] ?? value.trim()
}

function detectFormat(fileName: string): ImportFormat {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'csv') return 'csv'
  if (extension === 'tsv' || extension === 'tab') return 'tsv'
  if (extension === 'json') return 'json'
  if (extension === 'pdf') return 'pdf'
  return 'unknown'
}

function splitDelimited(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '')))
}

function parseNumber(raw: string): number | undefined {
  const normalized = raw.replace(/[^0-9.,+\-]/g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

export function parseBloodCsv(text: string, fileName = 'blood.csv', sourceDocumentId = crypto.randomUUID()): BloodImportPreview {
  const rows = splitDelimited(text)
  if (rows.length < 2) {
    throw new Error('Blood CSV/TSV requires a header row and at least one data row.')
  }

  const headers = rows[0].map((header) => header.toLowerCase())
  const markerIndex = headers.findIndex((header) => /marker|test|analyte|name/.test(header))
  const valueIndex = headers.findIndex((header) => /value|result|level/.test(header))
  const unitIndex = headers.findIndex((header) => /unit/.test(header))
  const dateIndex = headers.findIndex((header) => /date|collected|collection/.test(header))
  const labIndex = headers.findIndex((header) => /lab|laboratory/.test(header))

  if (markerIndex < 0 || valueIndex < 0) {
    throw new Error('Could not identify marker and value columns. Expected names such as Marker and Value.')
  }

  const markers: BloodMarkerImport[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    const rawValue = row[valueIndex] ?? ''
    const value = parseNumber(rawValue)
    if (value === undefined) continue

    const marker = row[markerIndex] ?? ''
    const collectionDate = row[dateIndex] || new Date().toISOString()
    const unit = row[unitIndex] || ''
    markers.push({
      id: crypto.randomUUID(),
      marker,
      canonicalMarker: canonicalMarker(marker),
      value,
      unit,
      collectionDate,
      labName: labIndex >= 0 ? row[labIndex] : undefined,
      sourceDocumentId,
      sourceRow: i + 1,
      confidence: unit ? 0.95 : 0.82,
      warnings: unit ? [] : ['Unit missing; confirm before saving.'],
    })
  }

  const duplicateKeys = new Set<string>()
  let duplicateCount = 0
  for (const marker of markers) {
    const key = `${marker.canonicalMarker}|${marker.value}|${marker.unit}|${marker.collectionDate}`
    if (duplicateKeys.has(key)) duplicateCount += 1
    duplicateKeys.add(key)
  }

  return {
    format: detectFormat(fileName),
    collectionDate: markers[0]?.collectionDate,
    labName: markers.find((marker) => marker.labName)?.labName,
    markers,
    duplicateCount,
    warningCount: markers.reduce((count, marker) => count + marker.warnings.length, 0),
    sourceDocumentId,
  }
}

export function parseBloodJson(input: unknown, sourceDocumentId = crypto.randomUUID()): BloodImportPreview {
  if (!Array.isArray(input)) throw new Error('Expected a JSON array of blood results.')
  const markers: BloodMarkerImport[] = input.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const marker = String(record.marker ?? record.test ?? record.analyte ?? '')
    const value = Number(record.value ?? record.result)
    if (!marker || !Number.isFinite(value)) return []
    const unit = String(record.unit ?? '')
    const collectionDate = String(record.collectionDate ?? record.date ?? new Date().toISOString())
    return [{
      id: crypto.randomUUID(),
      marker,
      canonicalMarker: canonicalMarker(marker),
      value,
      unit,
      collectionDate,
      labName: record.labName ? String(record.labName) : undefined,
      sourceDocumentId,
      sourceRow: index + 1,
      confidence: unit ? 0.95 : 0.82,
      warnings: unit ? [] : ['Unit missing; confirm before saving.'],
    }]
  })

  return {
    format: 'json',
    collectionDate: markers[0]?.collectionDate,
    labName: markers.find((marker) => marker.labName)?.labName,
    markers,
    duplicateCount: 0,
    warningCount: markers.reduce((count, marker) => count + marker.warnings.length, 0),
    sourceDocumentId,
  }
}
