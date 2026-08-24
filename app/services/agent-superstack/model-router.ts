import type { AgentTask, ModelCapability, ModelEndpoint } from './types'
import { providerHealth } from '~/services/agent-runtime/provider-health'

const capabilityWeight = (endpoint: ModelEndpoint, required: ModelCapability[]) =>
  required.length === 0 ? 1 : required.filter((cap) => endpoint.capabilities.includes(cap)).length / required.length

export class ModelRouter {
  constructor(private readonly endpoints: ModelEndpoint[]) {}

  listAvailable(): ModelEndpoint[] {
    return this.endpoints.filter((item) => item.enabled && providerHealth.isAvailable(item.provider))
  }

  select(task: AgentTask): ModelEndpoint | undefined {
    const required = task.requiredCapabilities ?? []
    const candidates = this.listAvailable()
      .map((endpoint) => ({
        endpoint,
        score: capabilityWeight(endpoint, required) * 100
          - endpoint.priority
          + (endpoint.costTier === 'free' ? 12 : endpoint.costTier === 'low' ? 5 : 0),
      }))
      .filter(({ endpoint, score }) => {
        const satisfiesCapabilities = required.every((cap) => endpoint.capabilities.includes(cap))
        return score > 0 && satisfiesCapabilities
      })
      .sort((a, b) => b.score - a.score)

    return candidates[0]?.endpoint
  }

  reportSuccess(provider: string): void { providerHealth.recordSuccess(provider) }
  reportFailure(provider: string): void { providerHealth.recordFailure(provider) }
  health() { return providerHealth.snapshot() }
}

export function createDefaultModelRouter(): ModelRouter {
  return new ModelRouter([
    { id: 'openrouter-auto', provider: 'openrouter', model: 'openrouter/auto', baseUrl: 'https://openrouter.ai/api/v1', capabilities: ['reasoning', 'coding', 'vision', 'tools', 'fast', 'research'], costTier: 'low', enabled: true, priority: 10 },
    { id: 'openai', provider: 'openai', model: 'gpt-5', baseUrl: 'https://api.openai.com/v1', capabilities: ['reasoning', 'coding', 'vision', 'tools', 'research'], costTier: 'paid', enabled: true, priority: 20 },
    { id: 'anthropic', provider: 'anthropic', model: 'claude-sonnet', baseUrl: 'https://api.anthropic.com/v1', capabilities: ['reasoning', 'coding', 'vision', 'tools', 'research'], costTier: 'paid', enabled: true, priority: 30 },
    { id: 'huggingface', provider: 'huggingface', model: 'auto', baseUrl: 'https://router.huggingface.co/v1', capabilities: ['reasoning', 'coding', 'fast'], costTier: 'free', enabled: true, priority: 40 },
  ])
}
