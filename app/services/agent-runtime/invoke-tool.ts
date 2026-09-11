import type { AgentTask } from '~/services/agent-superstack/types'
import { createDefaultToolGateway } from './tool-gateway'
import { validateToolResult, type ValidatedToolResult } from './tool-result-validation'
import type { AgentToolCall } from './types'

export function exampleArgsForTool(name: string): Record<string, unknown> {
  switch (name) {
    case 'plugins.exercises.search':
      return { query: 'squat', limit: 5 }
    case 'plugins.watchlist.list':
      return { tier: 'clock' }
    case 'plugins.pdf.inspect':
      return { sample: true }
    case 'research.europepmc':
      return { goal: 'metformin longevity' }
    case 'research.paperqa.plan':
      return { question: 'What is my latest CRP?' }
    case 'research.paperqa.ask':
      return { question: 'What is my latest CRP?' }
    case 'memory.search':
      return { query: 'longevity', limit: 5 }
    default:
      return {}
  }
}

export async function invokeCatalogTool(
  name: string,
  args: Record<string, unknown> = {},
  approvalToken?: string,
): Promise<ValidatedToolResult> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Tool name is required')
  const gateway = createDefaultToolGateway()
  const tool = gateway.get(trimmed)
  if (!tool) throw new Error(`Unknown agent tool: ${trimmed}`)
  const task: AgentTask = {
    id: `invoke_${trimmed}`,
    kind: 'automation',
    prompt: `Invoke ${trimmed}`,
    allowTools: true,
    riskLevel: tool.risk,
  }
  const call: AgentToolCall = {
    id: `invoke_${trimmed}`,
    name: trimmed,
    args,
    requiresApproval: tool.requiresApproval,
    approvalToken,
  }
  const result = tool.requiresApproval
    ? await gateway.executeApproved(task, call)
    : await gateway.execute(task, call)
  return validateToolResult(result)
}
