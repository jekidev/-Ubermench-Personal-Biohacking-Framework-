import { describe, expect, it } from 'vitest'
import { HF_MODEL_REGISTRY, HF_MODEL_ROUTES, getHFModel } from './hf-model-registry'

describe('HF model registry', () => {
  it('has unique model ids', () => {
    const ids = HF_MODEL_REGISTRY.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has valid fallbacks and route references', () => {
    for (const model of HF_MODEL_REGISTRY) {
      if (model.fallbackModelId) expect(getHFModel(model.fallbackModelId)).toBeDefined()
    }
    for (const route of HF_MODEL_ROUTES) {
      expect(route.preferred.length + route.fallback.length).toBeGreaterThan(0)
      for (const id of [...route.preferred, ...route.fallback]) {
        const model = getHFModel(id)
        expect(model).toBeDefined()
        expect(model?.engine).toBe(route.engine)
      }
    }
  })
})
