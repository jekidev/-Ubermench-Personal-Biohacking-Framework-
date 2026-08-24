import { computed } from 'vue'
import { HF_MODEL_REGISTRY, HF_MODEL_ROUTES, getHFModel, getHFModelsByEngine, getRecommendedHFModels } from '~/data/hf-model-registry'
import type { HFModelEngine, HFModelRuntime } from '~/types/hf-model'

export function useHFModelRegistry() {
  const models = computed(() => [...HF_MODEL_REGISTRY])
  const routes = computed(() => [...HF_MODEL_ROUTES])
  const tierS = computed(() => models.value.filter((model) => model.tier === 'S'))

  function model(id: string) {
    return getHFModel(id)
  }

  function byEngine(engine: HFModelEngine) {
    return getHFModelsByEngine(engine)
  }

  function recommended(engine: HFModelEngine, runtime: HFModelRuntime = 'hybrid') {
    return getRecommendedHFModels(engine, runtime)
  }

  function route(engine: HFModelEngine) {
    return routes.value.find((item) => item.engine === engine)
  }

  return {
    models,
    routes,
    tierS,
    model,
    byEngine,
    recommended,
    route,
  }
}
