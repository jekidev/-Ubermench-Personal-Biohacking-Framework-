import type { HFModelDefinition, HFModelEngine, HFModelRuntime } from '~/types/hf-model'
import { HF_MODEL_REGISTRY, HF_MODEL_ROUTES, getHFModel } from '~/data/hf-model-registry'

export interface HFRouteOptions { runtime?: HFModelRuntime; maxRamGb?: number; maxVramGb?: number; allowRestricted?: boolean }

export function routeHFModel(engine: HFModelEngine, options: HFRouteOptions = {}): HFModelDefinition | undefined {
  const route = HF_MODEL_ROUTES.find((item) => item.engine === engine)
  if (!route) return undefined
  const candidates = [...route.preferred, ...route.fallback]
  return candidates.map(getHFModel).find((model): model is HFModelDefinition => {
    if (!model) return false
    if (options.runtime && model.runtime !== options.runtime && model.runtime !== 'hybrid') return false
    if (options.maxRamGb !== undefined && model.minRamGb > options.maxRamGb) return false
    if (options.maxVramGb !== undefined && model.recommendedVramGb > options.maxVramGb) return false
    if (!options.allowRestricted && model.privacy === 'restricted') return false
    return true
  })
}

export function getAvailableHFModels(engine: HFModelEngine, options: HFRouteOptions = {}) {
  return HF_MODEL_REGISTRY.filter((model) => model.engine === engine && (!options.runtime || model.runtime === options.runtime || model.runtime === 'hybrid') && (options.allowRestricted || model.privacy !== 'restricted'))
}
