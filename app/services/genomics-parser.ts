import type { VariantRecord } from '~/types/biology'

function classifyZygosity(genotype: string): VariantRecord['zygosity'] {
  const normalized = genotype.replace('|', '/')
  if (/^([01])\/([01])$/.test(normalized)) {
    const [a, b] = normalized.split('/')
    if (a === '0' && b === '0') return 'unknown'
    if (a === b && a !== '0') return 'homozygous'
    if (a !== b) return 'heterozygous'
  }
  return 'unknown'
}

export function parseVcf(text: string): VariantRecord[] {
  const variants: VariantRecord[] = []

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue

    const columns = line.split('\t')
    if (columns.length < 8) continue

    const [chromosome, rawPosition, id, referenceAllele, alternateAllele, , , , format, sample] = columns
    const position = Number(rawPosition)
    if (!chromosome || !Number.isInteger(position) || position <= 0 || !referenceAllele || !alternateAllele) continue

    const formatFields = format?.split(':') ?? []
    const sampleFields = sample?.split(':') ?? []
    const gtIndex = formatFields.indexOf('GT')
    const gt = (gtIndex >= 0 ? sampleFields[gtIndex] : sampleFields[0]) ?? './.'

    variants.push({
      id: crypto.randomUUID(),
      chromosome,
      position,
      rsId: id && /^rs\d+$/i.test(id) ? id : undefined,
      referenceAllele,
      alternateAllele,
      genotype: gt,
      zygosity: classifyZygosity(gt),
      source: 'genomics-import',
    })
  }

  return variants
}
