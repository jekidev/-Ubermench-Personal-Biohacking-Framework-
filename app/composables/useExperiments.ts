import type { ExperimentSpec } from '~/services/experiment-lifecycle'
import type { ExperimentDesign } from '~/services/experiment-protocols'
import { createProtocolSpec, EXPERIMENT_PROTOCOL_TEMPLATES } from '~/services/experiment-protocols'
import { summarizeNOf1, type NOf1Experiment } from '~/services/experiment-engine'
import { evaluateStoppingRules } from '~/services/experiment-stopping-rules'
import { analyzeExperimentSensitivity, buildSensitivityObservations } from '~/services/experiment-sensitivity'
import { summarizeExperimentConfounders, type ExperimentConfounder } from '~/services/experiment-confounders'
import {
  createExperimentBackup,
  parseExperimentBackup,
  recordExperimentBackupExport,
  serializeExperimentBackup,
  type StoredExperimentRecord,
} from '~/services/experiment-backup'
import { previewExperimentImport, type ExperimentImportPreview } from '~/services/experiment-import-validator'

const STORAGE_KEY = 'ubermench.experiments.v1'

export type StoredExperiment = StoredExperimentRecord

function loadExperiments(): StoredExperiment[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as Array<StoredExperiment & { confounders?: ExperimentConfounder[] }> : []
    return parsed.map((item) => ({ ...item, confounders: item.confounders ?? [] }))
  } catch {
    return []
  }
}

function saveExperiments(experiments: StoredExperiment[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments))
}

function plannedObservationDays(experiment: StoredExperiment) {
  return Math.max(1, experiment.baselineDays + experiment.interventionDays)
}

function missingDataRate(experiment: StoredExperiment, summary: ReturnType<typeof summarizeNOf1>) {
  const planned = plannedObservationDays(experiment)
  const completed = summary.baselineCount + summary.interventionCount
  return Math.max(0, Math.min(1, 1 - completed / planned))
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
      adherence: [],
      adverseEvents: [],
      status: 'planned',
    }
    const stored: StoredExperiment = { ...protocol, runtime, confounders: [] }
    experiments.value = [...experiments.value, stored]
    saveExperiments(experiments.value)
    return stored
  }

  function updateExperiment(id: string, updater: (experiment: StoredExperiment) => StoredExperiment) {
    experiments.value = experiments.value.map((item) => (item.id === id ? updater(item) : item))
    saveExperiments(experiments.value)
  }

  function recordAdherence(experimentId: string, completed: boolean, note?: string) {
    updateExperiment(experimentId, (experiment) => ({
      ...experiment,
      runtime: {
        ...experiment.runtime,
        adherence: [
          ...(experiment.runtime.adherence ?? []),
          {
            plannedAt: new Date().toISOString(),
            completedAt: completed ? new Date().toISOString() : undefined,
            completed,
            note,
          },
        ],
      },
    }))
  }

  function recordConfounder(experimentId: string, confounder: Omit<ExperimentConfounder, 'id' | 'recordedAt'>) {
    updateExperiment(experimentId, (experiment) => ({
      ...experiment,
      confounders: [
        ...experiment.confounders,
        {
          ...confounder,
          id: `conf-${Date.now()}`,
          recordedAt: new Date().toISOString(),
        },
      ],
    }))
  }

  function summarize(experiment: StoredExperiment) {
    const summary = summarizeNOf1(experiment.runtime)
    const stopping = evaluateStoppingRules({
      severeAdverseEvents: summary.severeAdverseEventCount,
      missingDataRate: missingDataRate(experiment, summary),
      completedVisits: summary.baselineCount + summary.interventionCount,
      plannedVisits: plannedObservationDays(experiment),
    })
    const sensitivity = analyzeExperimentSensitivity(buildSensitivityObservations(experiment.runtime))
    const confounders = summarizeExperimentConfounders(experiment.confounders)
    return { summary, stopping, sensitivity, confounders }
  }

  async function exportBackup() {
    const backup = await createExperimentBackup(experiments.value)
    recordExperimentBackupExport({
      lastExportedAt: backup.exportedAt,
      lastChecksumPrefix: backup.checksum?.slice(0, 16),
      experimentCount: backup.metadata?.experimentCount,
      format: backup.format,
    })
    return serializeExperimentBackup(backup)
  }

  async function importBackup(raw: string, options?: { replace?: boolean }) {
    const backup = await parseExperimentBackup(raw)
    if (options?.replace) {
      experiments.value = backup.experiments
    } else {
      const merged = new Map(experiments.value.map((item) => [item.id, item]))
      for (const item of backup.experiments) merged.set(item.id, item)
      experiments.value = Array.from(merged.values())
    }
    saveExperiments(experiments.value)
    return backup
  }

  async function previewImport(raw: string): Promise<ExperimentImportPreview> {
    const backup = await parseExperimentBackup(raw)
    return previewExperimentImport(backup, experiments.value)
  }

  return {
    experiments,
    templates: EXPERIMENT_PROTOCOL_TEMPLATES,
    initialize,
    createExperiment,
    recordAdherence,
    recordConfounder,
    summarize,
    exportBackup,
    importBackup,
    previewImport,
  }
}
