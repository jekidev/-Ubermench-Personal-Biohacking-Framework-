export type HFModelTier = 'S' | 'A' | 'B'
export type HFModelRuntime = 'local' | 'remote' | 'hybrid'
export type HFModelPrivacy = 'public-safe' | 'sensitive-local' | 'restricted'
export type HFModelEngine =
  | 'genomics'
  | 'protein'
  | 'cellular'
  | 'biomedical'
  | 'molecular'
  | 'phenotype'
  | 'benchmark'

export interface HFModelDefinition {
  id: string
  name: string
  tier: HFModelTier
  engine: HFModelEngine
  role: string
  tasks: string[]
  runtime: HFModelRuntime
  privacy: HFModelPrivacy
  minRamGb: number
  recommendedVramGb: number
  license: string
  endpointCompatible?: boolean
  gated?: boolean
  source: 'model' | 'dataset' | 'space'
  url: string
  fallbackModelId?: string
  notes?: string
}

export interface HFModelRoute {
  engine: HFModelEngine
  preferred: string[]
  fallback: string[]
}
