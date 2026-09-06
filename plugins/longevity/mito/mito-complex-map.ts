export type MitoComplexId = 'I' | 'II' | 'III' | 'IV' | 'V'

export type MitoComplexNode = {
  id: string
  complex: MitoComplexId
  label: string
  genes?: string[]
  cofactors?: string[]
  interventions?: string[]
}

export type MitoPathwayOverlay = {
  highlightedComplexes: MitoComplexId[]
  highlightedGenes: string[]
  notes: string[]
}

export const MITO_COMPLEX_MAP: MitoComplexNode[] = [
  { id: 'complex-i', complex: 'I', label: 'NADH dehydrogenase', genes: ['NDUFV1', 'NDUFS1'], cofactors: ['FMN', 'Fe-S clusters'], interventions: ['NAD+ precursors', 'CoQ10'] },
  { id: 'complex-ii', complex: 'II', label: 'Succinate dehydrogenase', genes: ['SDHA', 'SDHB'], cofactors: ['FAD', 'Fe-S clusters'], interventions: ['Succinate support'] },
  { id: 'complex-iii', complex: 'III', label: 'Cytochrome bc1', genes: ['UQCRC1', 'UQCRFS1'], cofactors: ['CoQ10', 'heme'], interventions: ['CoQ10'] },
  { id: 'complex-iv', complex: 'IV', label: 'Cytochrome c oxidase', genes: ['COX4I1', 'COX5A'], cofactors: ['Cu', 'heme'], interventions: ['Copper monitoring'] },
  { id: 'complex-v', complex: 'V', label: 'ATP synthase', genes: ['ATP5F1A', 'ATP5MC1'], cofactors: ['Mg2+'], interventions: ['Magnesium'] },
]

export function buildMitoOverlay(input: { genes?: string[]; interventions?: string[] }): MitoPathwayOverlay {
  const geneSet = new Set((input.genes ?? []).map((gene) => gene.toUpperCase()))
  const interventionSet = new Set((input.interventions ?? []).map((item) => item.toLowerCase()))
  const highlightedComplexes = MITO_COMPLEX_MAP
    .filter((node) => node.genes?.some((gene) => geneSet.has(gene)) || node.interventions?.some((item) => interventionSet.has(item.toLowerCase())))
    .map((node) => node.complex)
  const highlightedGenes = MITO_COMPLEX_MAP.flatMap((node) => node.genes ?? []).filter((gene) => geneSet.has(gene))
  const notes = highlightedComplexes.length
    ? [`Overlay highlights complexes ${highlightedComplexes.join(', ')} from personal genotype/intervention context.`]
    : ['No mitochondrial complex overlap detected from current inputs.']
  return { highlightedComplexes, highlightedGenes, notes }
}
