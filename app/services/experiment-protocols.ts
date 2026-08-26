import type { ExperimentSpec } from './experiment-lifecycle'

export type ExperimentDesign = 'single-subject-crossover' | 'ab-ba' | 'randomized-n-of-1'

export interface ExperimentProtocolTemplate {
  id: ExperimentDesign
  name: string
  description: string
  requiresWashout: boolean
  minimumPhases: number
  phaseOrder: Array<'A' | 'B'>
}

export const EXPERIMENT_PROTOCOL_TEMPLATES: readonly ExperimentProtocolTemplate[] = [
  {
    id: 'single-subject-crossover',
    name: 'Single-subject crossover',
    description: 'Alternates control and intervention periods with an optional washout between conditions.',
    requiresWashout: false,
    minimumPhases: 2,
    phaseOrder: ['A', 'B'],
  },
  {
    id: 'ab-ba',
    name: 'AB/BA crossover',
    description: 'Balances order effects by running both intervention orders across two periods.',
    requiresWashout: true,
    minimumPhases: 4,
    phaseOrder: ['A', 'B'],
  },
  {
    id: 'randomized-n-of-1',
    name: 'Randomized N-of-1',
    description: 'Uses repeated randomized A/B periods while preserving the pre-declared outcome and stopping rules.',
    requiresWashout: false,
    minimumPhases: 4,
    phaseOrder: ['A', 'B'],
  },
]

export interface ProtocolValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validateExperimentProtocol(spec: ExperimentSpec, design: ExperimentDesign): ProtocolValidationIssue[] {
  const template = EXPERIMENT_PROTOCOL_TEMPLATES.find((item) => item.id === design)
  if (!template) return [{ field: 'design', message: 'Unknown experiment design.', severity: 'error' }]

  const issues: ProtocolValidationIssue[] = []
  if (!spec.id.trim()) issues.push({ field: 'id', message: 'Experiment id is required.', severity: 'error' })
  if (!spec.subjectId.trim()) issues.push({ field: 'subjectId', message: 'Subject id is required.', severity: 'error' })
  if (!spec.metric.trim()) issues.push({ field: 'metric', message: 'Primary metric must be pre-declared.', severity: 'error' })
  if (!spec.intervention.trim()) issues.push({ field: 'intervention', message: 'Intervention must be pre-declared.', severity: 'error' })
  if (!Number.isFinite(new Date(spec.startAt).getTime())) issues.push({ field: 'startAt', message: 'Start timestamp must be valid.', severity: 'error' })
  if (spec.baselineDays < 1) issues.push({ field: 'baselineDays', message: 'Baseline must contain at least one day.', severity: 'error' })
  if (spec.interventionDays < 1) issues.push({ field: 'interventionDays', message: 'Intervention must contain at least one day.', severity: 'error' })
  if (template.requiresWashout && spec.washoutDays < 1) issues.push({ field: 'washoutDays', message: `${template.name} requires a washout period.`, severity: 'error' })
  if (spec.baselineDays < 3) issues.push({ field: 'baselineDays', message: 'Short baseline; conclusions should be treated as exploratory.', severity: 'warning' })
  if (spec.interventionDays < 3) issues.push({ field: 'interventionDays', message: 'Short intervention period; conclusions should be treated as exploratory.', severity: 'warning' })
  return issues
}

export function createProtocolSpec(spec: ExperimentSpec, design: ExperimentDesign): ExperimentSpec & { design: ExperimentDesign } {
  const issues = validateExperimentProtocol(spec, design)
  if (issues.some((issue) => issue.severity === 'error')) {
    throw new Error(`Invalid experiment protocol: ${issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join(' ')}`)
  }
  return { ...spec, design }
}
