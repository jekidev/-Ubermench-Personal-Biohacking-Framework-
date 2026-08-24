import type { AgentTask } from '~/services/agent-superstack/types'
import { evaluateTask } from '~/services/agent-superstack/governance'
import type { AgentTool, AgentToolCall } from './types'

export class AgentToolGateway {
  private readonly tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void { this.tools.set(tool.name, tool) }
  list(): AgentTool[] { return [...this.tools.values()] }
  get(name: string): AgentTool | undefined { return this.tools.get(name) }

  async execute(task: AgentTask, call: AgentToolCall): Promise<unknown> {
    const tool = this.tools.get(call.name)
    if (!tool) throw new Error(`Unknown agent tool: ${call.name}`)
    const policy = evaluateTask({ ...task, allowTools: true, riskLevel: tool.risk })
    if (!policy.allowed || policy.requiresConfirmation || tool.requiresApproval || call.requiresApproval) {
      throw new Error(`Tool execution requires approval: ${tool.name}`)
    }
    return tool.execute(call.args)
  }
}

export function createDefaultToolGateway(): AgentToolGateway {
  const gateway = new AgentToolGateway()
  gateway.register({ name: 'memory.search', description: 'Search persistent agent memory.', risk: 'low', requiresApproval: false, async execute(args) { return args } })
  gateway.register({ name: 'graph.query', description: 'Query the local knowledge graph.', risk: 'low', requiresApproval: false, async execute(args) { return args } })
  return gateway
}
