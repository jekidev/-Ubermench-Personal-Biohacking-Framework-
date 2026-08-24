import type { HFModelDefinition } from '~/types/hf-model'
import type { ModelRun } from '~/types/biology'

export interface InferenceRequest { model: HFModelDefinition; inputs: string | Record<string, unknown>; token?: string; signal?: AbortSignal }

export async function runHFInference<T = unknown>(request: InferenceRequest): Promise<ModelRun<T>> {
  const id = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  if (!request.model.endpointCompatible) return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: 'Model is not marked endpoint-compatible; use a local inference adapter.' }
  if (!request.token) return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: 'No inference credential supplied.' }
  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${request.model.id}`, { method: 'POST', headers: { Authorization: `Bearer ${request.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: request.inputs }), signal: request.signal })
    if (!response.ok) throw new Error(`HF inference failed: ${response.status}`)
    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'completed', output: await response.json() as T }
  } catch (error) {
    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: error instanceof Error ? error.message : 'Unknown inference error' }
  }
}
