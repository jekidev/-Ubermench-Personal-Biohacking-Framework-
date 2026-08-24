import { orchestrateLLM } from '~/services/llm-orchestrator'
import { agentKernel } from '~/services/agent-superstack/kernel'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentRun, AgentObservation } from './types'
import { browserRuntimeStore } from './memory-store'

export async function runAgentTask(task: AgentTask): Promise<AgentRun> {
  const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const startedAt = new Date().toISOString()
  const memories = await browserRuntimeStore.loadMemory()
  agentKernel.memory.hydrate(memories)
  const context = agentKernel.prepare(task)
  const run: AgentRun = { id, task, status: 'planning', context, observations: [], toolCalls: [], selectedModel: context.selectedModel, startedAt }
  try {
    const memoryContext = context.memories.map((m) => `- ${m.text}`).join('\n')
    const skillContext = context.skills.map((s) => `- ${s.name}: ${s.description}`).join('\n')
    const system = [
      'You are the Uberm3nch agent kernel. Follow policy and never bypass approval gates.',
      `Task kind: ${task.kind}`,
      `Selected model: ${context.selectedModel?.provider ?? 'unavailable'}/${context.selectedModel?.model ?? 'unavailable'}`,
      memoryContext ? `Relevant memory:\n${memoryContext}` : 'Relevant memory: none',
      skillContext ? `Available skills:\n${skillContext}` : 'Available skills: none',
    ].join('\n\n')
    run.status = 'executing'
    const response = await orchestrateLLM({ prompt: task.prompt, system, mode: task.kind === 'research' ? 'researcher' : 'biohacker' })
    const observation: AgentObservation = { kind: 'model', text: response.text, createdAt: new Date().toISOString() }
    run.observations.push(observation)
    run.status = 'completed'
    run.completedAt = new Date().toISOString()
    agentKernel.learnFromTask(task, 'success: model response completed')
    await browserRuntimeStore.saveMemory(agentKernel.memory.all())
    await browserRuntimeStore.appendRun(run)
    return run
  } catch (error) {
    run.status = 'failed'
    run.error = error instanceof Error ? error.message : String(error)
    run.completedAt = new Date().toISOString()
    await browserRuntimeStore.appendRun(run)
    throw error
  }
}
