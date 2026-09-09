export type OpenRouterModel = {
  id: string
  name: string
  contextLength: number
  free: boolean
}

type OpenRouterApiModel = {
  id?: string
  name?: string
  context_length?: number
  pricing?: { prompt?: string | number; completion?: string | number }
  architecture?: { output_modalities?: string[] }
}

function isFreeModel(model: OpenRouterApiModel): boolean {
  const prompt = Number(model.pricing?.prompt ?? 1)
  const completion = Number(model.pricing?.completion ?? 1)
  const modalities = model.architecture?.output_modalities ?? ['text']
  return prompt === 0 && completion === 0 && modalities.includes('text')
}

export async function discoverOpenRouterFreeModels(apiKey: string, signal?: AbortSignal): Promise<OpenRouterModel[]> {
  const key = apiKey.trim()
  if (!key) return []

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  })
  if (!response.ok) {
    throw new Error(`OpenRouter /models failed: ${response.status}`)
  }

  const body = await response.json() as { data?: OpenRouterApiModel[] }
  const models = Array.isArray(body.data) ? body.data : []

  return models
    .filter(isFreeModel)
    .map((model) => ({
      id: String(model.id ?? ''),
      name: String(model.name ?? model.id ?? 'unknown'),
      contextLength: Number(model.context_length ?? 0),
      free: true,
    }))
    .filter((model) => model.id.length > 0)
    .sort((left, right) => right.contextLength - left.contextLength)
}
