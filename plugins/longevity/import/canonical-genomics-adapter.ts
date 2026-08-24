import { createRecord, type Provenance, type VariantObservation } from '../domain/canonical-records'

export type VariantCandidate = {
  id: string
  genomeBuild?: string
  chrom: string
  position: number
  rsid?: string
  ref: string
  alt: string
  genotype: string
  provenance: Provenance
}

function normalizeChromosome(chrom: string): string {
  const value = chrom.trim().replace(/^chr/i, '')
  if (!/^(?:[1-9]|1[0-9]|2[0-2]|X|Y|M|MT)$/.test(value)) {
    throw new Error(`Unsupported chromosome: ${chrom}`)
  }
  return value === 'M' ? 'MT' : value
}

function normalizeAllele(value: string, field: string): string {
  const allele = value.trim().toUpperCase()
  if (!/^[ACGT]+$/.test(allele)) throw new Error(`Invalid ${field} allele: ${value}`)
  return allele
}

export function variantCandidateToRecord(candidate: VariantCandidate) {
  const payload: VariantObservation = {
    genomeBuild: candidate.genomeBuild?.trim(),
    chrom: normalizeChromosome(candidate.chrom),
    position: candidate.position,
    rsid: candidate.rsid?.trim() || undefined,
    ref: normalizeAllele(candidate.ref, 'reference'),
    alt: normalizeAllele(candidate.alt, 'alternate'),
    genotype: candidate.genotype.trim().toUpperCase(),
    status: 'candidate',
  }

  return createRecord({
    id: candidate.id,
    kind: 'variant',
    payload,
    provenance: [candidate.provenance],
  })
}
