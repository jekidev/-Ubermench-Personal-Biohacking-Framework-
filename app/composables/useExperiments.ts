import type { ExperimentSpec } from '~/services/experiment-lifecycle'
import type { ExperimentDesign } from '~/services/experiment-protocols'
import { createProtocolSpec, EXPERIMENT_PROTOCOL_TEMPLATES } from '~/services/experiment-protocols'
import { summarizeNOf1, type NOf1Experiment } from '~/services/experiment-engine'
import { evaluateStoppingRules } from '~/services/experiment-stopping-rules'

const STORAGE_KEY = 'ubermench.experiments.v1'

export type StoredExperiment = ExperimentSpec & {
  design: ExperimentDesign
  runtime: NOf1Experiment
}

function loadExperiments(): StoredExperiment[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as StoredExperiment[] : []
  } catch {
    return []
  }
}

function saveExperiments(experiments: StoredExperiment[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments))
}

export function useExperiments() {
  const experiments = useState<StoredExperiment[]>('experiments-store', () => [])

  async function initialize() {
    experiments.value = loadExperiments()
  }

  async function createExperiment(spec: ExperimentSpec, design: ExperimentDesign) {
    const protocol = createProtocolSpec(spec, design)
    const runtime: NOf1Experiment = {
      id: protocol.id,
      intervention: protocol.intervention,
      metric: protocol.metric,
      baselineDays: protocol.baselineDays,
      interventionDays: protocol.interventionDays,
      washoutDays: protocol.washoutDays,
      observations: [],
      status: 'planned',
    }
    const stored = { ...protocol, runtime }
    experiments.value = [...experiments.value, stored]
    saveExperiments(experiments.value)
    return stored
  }

  function summarize(experiment: StoredExperiment) {
    const summary = summarizeNOf1(experiment.runtime)
    const stopping = evaluateStoppingRules({
      severeAdverseEvents: summary.severeAdverseEventCount,
      missingDataRate: summary.baselineCount + summary.interventionCount === 0 ? 1 : undefined,
    })
    return { summary, stopping }
  }

  return {
    experiments,
    templates: EXPERIMENT_PROTOCOL_TEMPLATES,
    initialize,
    createExperiment,
    summarize,
  }
}
