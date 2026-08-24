import type { HFModelDefinition, HFModelEngine, HFModelRoute } from '~/types/hf-model'

const hf = (id: string) => `https://huggingface.co/${id}`

export const HF_MODEL_REGISTRY: readonly HFModelDefinition[] = [
  {
    id: 'HuggingFaceBio/Carbon-500M', name: 'Carbon 500M', tier: 'S', engine: 'genomics', role: 'Edge DNA foundation model', tasks: ['DNA modeling', 'variant scoring', 'gene embeddings'], runtime: 'local', privacy: 'sensitive-local', minRamGb: 4, recommendedVramGb: 4, license: 'Apache-2.0', endpointCompatible: true, source: 'model', url: hf('HuggingFaceBio/Carbon-500M'), fallbackModelId: 'zhihan1996/DNABERT-2-117M'
  },
  {
    id: 'HuggingFaceBio/Carbon-3B', name: 'Carbon 3B', tier: 'S', engine: 'genomics', role: 'Primary genomic foundation model', tasks: ['DNA generation', 'variant scoring', 'gene embeddings'], runtime: 'hybrid', privacy: 'sensitive-local', minRamGb: 16, recommendedVramGb: 12, license: 'Apache-2.0', endpointCompatible: true, source: 'model', url: hf('HuggingFaceBio/Carbon-3B'), fallbackModelId: 'HuggingFaceBio/Carbon-500M'
  },
  {
    id: 'HuggingFaceBio/Carbon-8B', name: 'Carbon 8B', tier: 'A', engine: 'genomics', role: 'Heavy genomic inference', tasks: ['long-context DNA', 'generation', 'variant analysis'], runtime: 'remote', privacy: 'restricted', minRamGb: 32, recommendedVramGb: 24, license: 'Apache-2.0', endpointCompatible: true, source: 'model', url: hf('HuggingFaceBio/Carbon-8B'), fallbackModelId: 'HuggingFaceBio/Carbon-3B'
  },
  {
    id: 'zhihan1996/DNABERT-2-117M', name: 'DNABERT-2 117M', tier: 'S', engine: 'genomics', role: 'Local DNA embeddings and variant features', tasks: ['DNA embeddings', 'variant classification', 'sequence classification'], runtime: 'local', privacy: 'sensitive-local', minRamGb: 2, recommendedVramGb: 2, license: 'Model card license', endpointCompatible: true, source: 'model', url: hf('zhihan1996/DNABERT-2-117M'), fallbackModelId: 'HuggingFaceBio/Carbon-500M'
  },
  {
    id: 'arcinstitute/evo2_7b', name: 'Evo 2 7B', tier: 'S', engine: 'genomics', role: 'Advanced genomic sequence model', tasks: ['genome modeling', 'sequence generation', 'variant analysis'], runtime: 'remote', privacy: 'restricted', minRamGb: 32, recommendedVramGb: 24, license: 'Apache-2.0', source: 'model', url: hf('arcinstitute/evo2_7b'), fallbackModelId: 'HuggingFaceBio/Carbon-3B'
  },
  {
    id: 'LongSafari/hyenadna-large-1m-seqlen-hf', name: 'HyenaDNA Large 1M', tier: 'S', engine: 'genomics', role: 'Long-context nucleotide modeling', tasks: ['long-context DNA', 'sequence classification', 'genomic embeddings'], runtime: 'remote', privacy: 'restricted', minRamGb: 24, recommendedVramGb: 16, license: 'BSD-3-Clause', source: 'model', url: hf('LongSafari/hyenadna-large-1m-seqlen-hf'), fallbackModelId: 'zhihan1996/DNABERT-2-117M'
  },
  {
    id: 'facebook/esm2_t33_650M_UR50D', name: 'ESM-2 650M', tier: 'S', engine: 'protein', role: 'Protein representation engine', tasks: ['protein embeddings', 'sequence modeling', 'protein function features'], runtime: 'local', privacy: 'public-safe', minRamGb: 6, recommendedVramGb: 8, license: 'MIT', endpointCompatible: true, source: 'model', url: hf('facebook/esm2_t33_650M_UR50D'), fallbackModelId: 'facebook/esm2_t30_150M_UR50D'
  },
  {
    id: 'biohub/ESMC-600M', name: 'ESM-C 600M', tier: 'S', engine: 'protein', role: 'Modern protein foundation model', tasks: ['protein embeddings', 'protein sequence inference'], runtime: 'hybrid', privacy: 'public-safe', minRamGb: 6, recommendedVramGb: 8, license: 'MIT / other', endpointCompatible: true, source: 'model', url: hf('biohub/ESMC-600M'), fallbackModelId: 'facebook/esm2_t33_650M_UR50D'
  },
  {
    id: 'biohub/esm3-sm-open-v1', name: 'ESM-3 Small Open', tier: 'A', engine: 'protein', role: 'Protein generation and representation', tasks: ['protein design', 'generation', 'representation'], runtime: 'remote', privacy: 'public-safe', minRamGb: 12, recommendedVramGb: 12, license: 'Check model card', source: 'model', url: hf('biohub/esm3-sm-open-v1'), fallbackModelId: 'biohub/ESMC-600M'
  },
  {
    id: 'ctheodoris/Geneformer', name: 'Geneformer', tier: 'S', engine: 'cellular', role: 'Cell-state and gene-expression modeling', tasks: ['single-cell', 'gene expression', 'cell state'], runtime: 'local', privacy: 'sensitive-local', minRamGb: 16, recommendedVramGb: 16, license: 'Apache-2.0', endpointCompatible: false, source: 'model', url: hf('ctheodoris/Geneformer'), fallbackModelId: 'microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext', notes: 'HF inference provider currently reports an error; prefer local inference.'
  },
  {
    id: 'microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext', name: 'BiomedBERT', tier: 'S', engine: 'biomedical', role: 'Biomedical literature and entity understanding', tasks: ['biomedical NLP', 'entity extraction', 'retrieval features'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 2, license: 'MIT', endpointCompatible: true, source: 'model', url: hf('microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext'), fallbackModelId: 'dmis-lab/biobert-base-cased-v1.2'
  },
  {
    id: 'emilyalsentzer/Bio_ClinicalBERT', name: 'Bio_ClinicalBERT', tier: 'A', engine: 'biomedical', role: 'Clinical text representation', tasks: ['clinical NLP', 'lab report extraction', 'medical NER'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 2, license: 'MIT', endpointCompatible: true, source: 'model', url: hf('emilyalsentzer/Bio_ClinicalBERT'), fallbackModelId: 'microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext'
  },
  {
    id: 'google/medgemma-4b-it', name: 'MedGemma 4B IT', tier: 'S', engine: 'biomedical', role: 'Multimodal medical reasoning', tasks: ['medical VLM', 'clinical reasoning', 'radiology', 'dermatology'], runtime: 'remote', privacy: 'restricted', minRamGb: 16, recommendedVramGb: 12, license: 'Other / gated', gated: true, source: 'model', url: hf('google/medgemma-4b-it'), fallbackModelId: 'microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext'
  },
  {
    id: 'DeepChem/ChemBERTa-77M-MLM', name: 'ChemBERTa 77M', tier: 'S', engine: 'molecular', role: 'Local molecular representation', tasks: ['SMILES embeddings', 'molecular similarity', 'property features'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 2, license: 'Check model card', endpointCompatible: false, source: 'model', url: hf('DeepChem/ChemBERTa-77M-MLM'), notes: 'HF inference provider currently reports an error; prefer local inference.'
  },
  {
    id: 'ibm-research/MoLFormer-XL-both-10pct', name: 'MoLFormer XL', tier: 'S', engine: 'molecular', role: 'Molecular representation and retrieval', tasks: ['molecular embeddings', 'similarity', 'feature extraction'], runtime: 'hybrid', privacy: 'public-safe', minRamGb: 4, recommendedVramGb: 4, license: 'Apache-2.0', source: 'model', url: hf('ibm-research/MoLFormer-XL-both-10pct'), fallbackModelId: 'DeepChem/ChemBERTa-77M-MLM'
  },
  {
    id: 'nvidia/NV-KERMT-70M-v2', name: 'NV-KERMT 70M', tier: 'S', engine: 'molecular', role: 'ADMET / drug-discovery foundation model', tasks: ['ADMET', 'molecular property prediction', 'drug discovery'], runtime: 'local', privacy: 'public-safe', minRamGb: 4, recommendedVramGb: 4, license: 'Other', source: 'model', url: hf('nvidia/NV-KERMT-70M-v2'), fallbackModelId: 'ibm-research/MoLFormer-XL-both-10pct'
  },
  {
    id: 'chandar-lab/NovoMolGen_32M_SMILES_BPE', name: 'NovoMolGen 32M', tier: 'A', engine: 'molecular', role: 'Molecule generation', tasks: ['SMILES generation', 'molecule design'], runtime: 'local', privacy: 'public-safe', minRamGb: 4, recommendedVramGb: 4, license: 'MIT', source: 'model', url: hf('chandar-lab/NovoMolGen_32M_SMILES_BPE'), fallbackModelId: 'DeepChem/ChemBERTa-77M-MLM'
  },
  {
    id: 'google/derm-foundation', name: 'Derm Foundation', tier: 'A', engine: 'phenotype', role: 'Dermatology image embeddings', tasks: ['skin image embeddings', 'dermatology classification features'], runtime: 'remote', privacy: 'restricted', minRamGb: 8, recommendedVramGb: 8, license: 'Other / gated', gated: true, source: 'model', url: hf('google/derm-foundation')
  },
  {
    id: 'HuggingFaceBio/clinvar-vep', name: 'ClinVar VEP', tier: 'S', engine: 'benchmark', role: 'Variant pathogenicity benchmark', tasks: ['coding variants', 'non-coding variants', 'pathogenicity'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 0, license: 'Apache-2.0', source: 'dataset', url: hf('datasets/HuggingFaceBio/clinvar-vep')
  },
  {
    id: 'HuggingFaceBio/perturbation-bench', name: 'Perturbation Bench', tier: 'S', engine: 'benchmark', role: 'DNA sequence perturbation benchmark', tasks: ['sequence perturbation', 'DNA model evaluation'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 0, license: 'Apache-2.0', source: 'dataset', url: hf('datasets/HuggingFaceBio/perturbation-bench')
  },
  {
    id: 'HuggingFaceBio/genomic-niah', name: 'Genomic-NIAH', tier: 'S', engine: 'benchmark', role: 'Long-context genomic retrieval benchmark', tasks: ['long-context retrieval', 'genomic model evaluation'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 0, license: 'Apache-2.0', source: 'dataset', url: hf('datasets/HuggingFaceBio/genomic-niah')
  },
  {
    id: 'HuggingFaceBio/traitgym', name: 'TraitGym', tier: 'S', engine: 'benchmark', role: 'Regulatory-variant benchmark', tasks: ['non-coding variants', 'trait prediction', 'regulatory effects'], runtime: 'local', privacy: 'public-safe', minRamGb: 2, recommendedVramGb: 0, license: 'MIT', source: 'dataset', url: hf('datasets/HuggingFaceBio/traitgym')
  },
]

export const HF_MODEL_ROUTES: readonly HFModelRoute[] = [
  { engine: 'genomics', preferred: ['HuggingFaceBio/Carbon-500M', 'HuggingFaceBio/Carbon-3B', 'arcinstitute/evo2_7b'], fallback: ['zhihan1996/DNABERT-2-117M', 'LongSafari/hyenadna-large-1m-seqlen-hf'] },
  { engine: 'protein', preferred: ['biohub/ESMC-600M', 'facebook/esm2_t33_650M_UR50D'], fallback: ['biohub/esm3-sm-open-v1'] },
  { engine: 'cellular', preferred: ['ctheodoris/Geneformer'], fallback: [] },
  { engine: 'biomedical', preferred: ['microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext', 'google/medgemma-4b-it'], fallback: ['emilyalsentzer/Bio_ClinicalBERT'] },
  { engine: 'molecular', preferred: ['nvidia/NV-KERMT-70M-v2', 'ibm-research/MoLFormer-XL-both-10pct'], fallback: ['DeepChem/ChemBERTa-77M-MLM'] },
  { engine: 'phenotype', preferred: ['google/derm-foundation'], fallback: ['google/medgemma-4b-it'] },
  { engine: 'benchmark', preferred: ['HuggingFaceBio/clinvar-vep', 'HuggingFaceBio/perturbation-bench', 'HuggingFaceBio/genomic-niah'], fallback: ['HuggingFaceBio/traitgym'] },
]

export function getHFModelsByEngine(engine: HFModelEngine) {
  return HF_MODEL_REGISTRY.filter((model) => model.engine === engine)
}

export function getHFModel(id: string) {
  return HF_MODEL_REGISTRY.find((model) => model.id === id)
}

export function getRecommendedHFModels(engine: HFModelEngine, runtime: HFModelRuntime = 'hybrid') {
  return HF_MODEL_REGISTRY.filter((model) => model.engine === engine && (model.runtime === runtime || model.runtime === 'hybrid'))
}
