import type { VariantRecord } from '~/types/biology'

export function parseVcf(text: string): VariantRecord[] {
  const variants: VariantRecord[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const [chromosome, position, id, referenceAllele, alternateAllele, , , , format, sample] = line.split('\t')
    if (!chromosome || !position || !sample) continue
    const formatFields = format?.split(':') ?? []
    const sampleFields = sample.split(':')
    const gt = sampleFields[formatFields.indexOf('GT')] ?? sampleFields[0] ?? './.'
    const zygosity = gt === '0/1' || gt === '1/0' ? 'heterozygous' : gt === '1/1' ? 'homozygous' : 'unknown'
    variants.push({ id: crypto.randomUUID(), chromosome, position: Number(position), rsId: id?.startsWith('rs') ? id : undefined, referenceAllele, alternateAllele, genotype: gt, zygosity, source: 'genomics-import' })
  }
  return variants
}
