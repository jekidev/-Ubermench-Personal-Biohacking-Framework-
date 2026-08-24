import type { HFModelDefinition } from '~/types/hf-model'
import type { ModelRun } from '~/types/biology'

const HF_INFERENCE_BASE_URL = 'https://router.huggingface.co/hf-inference/models'
const DEFAULT_TIMEOUT_MS = 30_000

export interface InferenceRequest {
  model: HFModelDefinition
  inputs: string | Record<string, unknown>
  token?: string
  signal?: AbortSignal
  timeoutMs?: number
}

function makeTimeoutSignal(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('HF inference timeout')), timeoutMs)
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    },
  }
}

function runId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

export async function runHFInference<T = unknown>(request: InferenceRequest): Promise<ModelRun<T>> {
  const id = runId()
  const startedAt = new Date().toISOString()

  if (!request.model.endpointCompatible) {
    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: 'Model is not marked endpoint-compatible; use a local inference adapter.' }
  }

  if (!request.token?.trim()) {
    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: 'No inference credential supplied.' }
  }

  const timeout = makeTimeoutSignal(request.signal, request.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${HF_INFERENCE_BASE_URL}/${encodeURIComponent(request.model.id)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${request.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ inputs: request.inputs }),
      signal: timeout.signal,
    })

    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json') ? await response.json() as unknown : await response.text()
    if (!response.ok) {
      const detail = typeof body === 'string' ? body : JSON.stringify(body)
      throw new Error(`HF inference failed (${response.status}): ${detail}`)
    }

    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'completed', output: body as T }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { id, modelId: request.model.id, task: request.model.tasks[0] ?? 'inference', startedAt, completedAt: new Date().toISOString(), status: 'failed', error: message }
  } finally {
    timeout.cleanup()
  }
}
