export type GenomicSource = 'vcf' | 'csv' | 'tsv' | 'json' | 'raw_dna' | 'pdf' | 'manual'

export interface GeneticVariant {
  id: string
  rsid?: string
  chromosome?: string
  position?: number
  ref?: string
  alt?: string
  genotype?: string
  gene?: string
  source: GenomicSource
  sourceFile?: string
  confidence?: number
  interpretationStatus: 'uninterpreted' | 'candidate' | 'reviewed'
  notes?: string
}

export interface GeneticFinding {
  id: string
  variantIds: string[]
  gene?: string
  trait: string
  category: 'longevity' | 'cardiovascular' | 'metabolic' | 'pharmacogenomics' | 'nutrition' | 'other'
  summary: string
  evidenceGrade: 'A' | 'B' | 'C' | 'D' | 'E' | 'unknown'
  sourceReferences: string[]
  clinicalActionability: 'none' | 'informational' | 'discuss_with_clinician'
  reviewedAt?: string
}

export interface GenomicsProfile {
  schemaVersion: string
  importedAt: string
  source: GenomicSource
  originalFileName?: string
  variants: GeneticVariant[]
  findings: GeneticFinding[]
  parserVersion: string
  disclaimer: 'research_and_information_only'
}
