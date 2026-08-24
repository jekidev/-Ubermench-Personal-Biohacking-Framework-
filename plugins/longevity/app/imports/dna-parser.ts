import type { GeneticImportPreview, GeneticVariant, ImportFormat } from './types'

function detectFormat(fileName: string): ImportFormat {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'vcf') return 'vcf'
  if (extension === 'csv') return 'csv'
  if (extension === 'tsv' || extension === 'tab') return 'tsv'
  if (extension === 'json') return 'json'
  if (extension === 'pdf') return 'pdf'
  return 'unknown'
}

function parseVcf(text: string, sourceDocumentId: string): GeneticVariant[] {
  const variants: GeneticVariant[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const [chromosome, position, id, reference, alternate] = line.split('\t')
    if (!chromosome || !position) continue
    const genotype = line.split('\t')[9]?.split(':')[0] ?? `${reference ?? ''}/${alternate ?? ''}`
    variants.push({
      id: crypto.randomUUID(),
      rsid: id?.startsWith('rs') ? id : undefined,
      chromosome,
      position: Number(position) || undefined,
      genotype,
      sourceDocumentId,
      confidence: id?.startsWith('rs') ? 0.98 : 0.9,
    })
  }
  return variants
}

function parseTable(text: string, sourceDocumentId: string): GeneticVariant[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())
  const rsIndex = headers.findIndex((h) => /rs.?id|snp|variant/.test(h))
  const geneIndex = headers.findIndex((h) => h === 'gene' || h === 'gene symbol')
  const genotypeIndex = headers.findIndex((h) => /genotype|allele|call/.test(h))
  const chrIndex = headers.findIndex((h) => /chrom|chromosome/.test(h))
  const posIndex = headers.findIndex((h) => /position|pos|coordinate/.test(h))
  if (rsIndex < 0 && genotypeIndex < 0) return []

  return lines.slice(1).flatMap((line) => {
    const cells = line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''))
    const genotype = genotypeIndex >= 0 ? cells[genotypeIndex] : ''
    if (!genotype) return []
    const rsid = rsIndex >= 0 ? cells[rsIndex] : undefined
    return [{
      id: crypto.randomUUID(),
      rsid: rsid?.startsWith('rs') ? rsid : undefined,
      gene: geneIndex >= 0 ? cells[geneIndex] : undefined,
      chromosome: chrIndex >= 0 ? cells[chrIndex] : undefined,
      position: posIndex >= 0 ? Number(cells[posIndex]) || undefined : undefined,
      genotype,
      sourceDocumentId,
      confidence: rsid?.startsWith('rs') ? 0.98 : 0.88,
    }]
  })
}

function parseJson(input: unknown, sourceDocumentId: string): GeneticVariant[] {
  if (!Array.isArray(input)) throw new Error('Expected a JSON array of variants.')
  return input.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const genotype = String(record.genotype ?? record.call ?? record.alleles ?? '')
    if (!genotype) return []
    return [{
      id: crypto.randomUUID(),
      rsid: record.rsid ? String(record.rsid) : record.snp ? String(record.snp) : undefined,
      gene: record.gene ? String(record.gene) : undefined,
      chromosome: record.chromosome ? String(record.chromosome) : record.chrom ? String(record.chrom) : undefined,
      position: Number(record.position ?? record.pos) || undefined,
      genotype,
      sourceDocumentId,
      confidence: 0.9,
    }]
  })
}

export function parseGeneticData(text: string, fileName: string, sourceDocumentId = crypto.randomUUID()): GeneticImportPreview {
  const format = detectFormat(fileName)
  let variants: GeneticVariant[] = []
  if (format === 'vcf') variants = parseVcf(text, sourceDocumentId)
  else if (format === 'csv' || format === 'tsv') variants = parseTable(text, sourceDocumentId)
  else if (format === 'json') variants = parseJson(JSON.parse(text), sourceDocumentId)
  else throw new Error('This parser handles VCF/CSV/TSV/JSON. PDF reports require the document adapter.')

  return {
    format,
    variantCount: variants.length,
    findingCount: 0,
    evidenceCoverage: 0,
    variants,
    findings: [],
    sourceDocumentId,
  }
}
