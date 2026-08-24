import type { AgentTask } from '~/services/agent-superstack/types'
import { evaluateTask } from '~/services/agent-superstack/governance'
import { nativeMcpExecute } from './native-mcp'
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
    if (!policy.allowed) throw new Error(`Tool execution blocked: ${policy.reason}`)
    if (policy.requiresConfirmation || tool.requiresApproval || call.requiresApproval) {
      throw new Error(`Tool execution requires explicit approval: ${tool.name}`)
    }
    return tool.execute(call.args)
  }

  async executeApproved(task: AgentTask, call: AgentToolCall): Promise<unknown> {
    const tool = this.tools.get(call.name)
    if (!tool) throw new Error(`Unknown agent tool: ${call.name}`)
    const policy = evaluateTask({ ...task, allowTools: true, riskLevel: tool.risk })
    if (!policy.allowed) throw new Error(`Tool execution blocked: ${policy.reason}`)
    if (tool.requiresApproval || call.requiresApproval || policy.requiresConfirmation) {
      if (!call.approvalToken?.trim()) throw new Error(`Tool execution requires explicit approval token: ${tool.name}`)
    }
    return tool.execute({ ...call.args, __approvalToken: call.approvalToken })
  }
}

export function createDefaultToolGateway(): AgentToolGateway {
  const gateway = new AgentToolGateway()
  gateway.register({
    name: 'memory.search',
    description: 'Search persistent agent memory.',
    risk: 'low',
    requiresApproval: false,
    async execute(args) { return args },
  })
  gateway.register({
    name: 'graph.query',
    description: 'Query the local knowledge graph.',
    risk: 'low',
    requiresApproval: false,
    async execute(args) { return args },
  })
  gateway.register({
    name: 'mcp.stdio',
    description: 'Execute a Tauri-native MCP stdio server after explicit human approval.',
    risk: 'high',
    requiresApproval: true,
    async execute(args) {
      const command = typeof args.command === 'string' ? args.command : ''
      const commandArgs = Array.isArray(args.args) && args.args.every((value) => typeof value === 'string') ? args.args as string[] : []
      const approvalToken = typeof args.__approvalToken === 'string' ? args.__approvalToken : ''
      const stdinPayload = typeof args.stdinPayload === 'string' ? args.stdinPayload : ''
      const timeoutMs = typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined
      return nativeMcpExecute(command, commandArgs, approvalToken, stdinPayload, timeoutMs)
    },
  })
  return gateway
}
