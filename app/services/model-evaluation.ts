export interface ModelEvaluationInput {
  provider: string
  model: string
  latencyMs: number
  citationAccuracy?: number
  factuality?: number
  grounding?: number
  taskSuccess?: number
  cost?: number
}

export interface ModelEvaluationResult extends ModelEvaluationInput {
  compositeScore: number
  weaknesses: string[]
}

function clamp(value: number) { return Math.max(0, Math.min(1, value)) }

export function evaluateModel(input: ModelEvaluationInput): ModelEvaluationResult {
  const dimensions = [input.citationAccuracy, input.factuality, input.grounding, input.taskSuccess].filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).map(clamp)
  const quality = dimensions.length ? dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length : 0
  const latencyPenalty = Math.min(0.15, Math.max(0, input.latencyMs - 3000) / 30000)
  const costPenalty = typeof input.cost === 'number' ? Math.min(0.15, Math.max(0, input.cost) / 0.1 * 0.15) : 0
  const weaknesses: string[] = []
  if (input.citationAccuracy !== undefined && input.citationAccuracy < 0.8) weaknesses.push('citation accuracy')
  if (input.grounding !== undefined && input.grounding < 0.8) weaknesses.push('evidence grounding')
  if (input.factuality !== undefined && input.factuality < 0.8) weaknesses.push('factuality')
  if (input.latencyMs > 5000) weaknesses.push('latency')
  return { ...input, compositeScore: clamp(quality - latencyPenalty - costPenalty), weaknesses }
}

export function rankModels(inputs: ModelEvaluationInput[]) {
  return inputs.map(evaluateModel).sort((a, b) => b.compositeScore - a.compositeScore)
}
