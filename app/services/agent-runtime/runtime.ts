import { orchestrateLLM } from '~/services/llm-orchestrator'
import type { LLMProvider } from '~/types/llm'
import { agentKernel } from '~/services/agent-superstack/kernel'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentObservation, AgentRun, AgentToolCall } from './types'
import { createRuntimeStore } from './store'
import { SkillEvolutionEngine } from './skill-evolution'
import { executeApprovedToolCalls } from './tool-loop'

const skillEvolution = new SkillEvolutionEngine()

export async function runAgentTask(task: AgentTask): Promise<AgentRun> {
  const store = createRuntimeStore()
  const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const startedAt = new Date().toISOString()
  const memories = await store.loadMemory()
  agentKernel.memory.hydrate(memories)
  const context = agentKernel.prepare(task)
  const run: AgentRun = { id, task, status: 'planning', context, observations: [], toolCalls: [], selectedModel: context.selectedModel, startedAt }
  try {
    if (!context.policy.allowed) throw new Error(`Agent task blocked: ${context.policy.reason}`)
    if (context.policy.requiresConfirmation) throw new Error('Agent task requires explicit confirmation before execution.')
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
    const response = await orchestrateLLM({
      prompt: task.prompt,
      system,
      mode: task.kind === 'research' ? 'researcher' : 'biohacker',
      preferredProvider: context.selectedModel?.provider as LLMProvider | undefined,
      preferredModel: context.selectedModel?.model,
    })
    run.observations.push({ kind: 'model', text: response.text, createdAt: new Date().toISOString() } as AgentObservation)
    run.status = 'completed'
    run.completedAt = new Date().toISOString()
    skillEvolution.propose(task.prompt, 'success: model response completed')
    await store.saveMemory(agentKernel.memory.all())
    await store.appendRun(run)
    return run
  } catch (error) {
    run.status = 'failed'
    run.error = error instanceof Error ? error.message : String(error)
    run.completedAt = new Date().toISOString()
    await store.appendRun(run)
    throw error
  }
}

export async function continueAgentWithTools(task: AgentTask, run: AgentRun, calls: AgentToolCall[], maxToolCalls = 8): Promise<AgentRun> {
  if (run.task.id !== task.id) throw new Error('Agent continuation task does not match the run task.')
  if (run.status === 'failed') throw new Error('Cannot continue a failed agent run.')
  const result = await executeApprovedToolCalls(task, run, calls, maxToolCalls)
  const store = createRuntimeStore()
  run.status = 'executing'
  const toolContext = run.observations
    .filter((observation) => observation.kind === 'tool')
    .slice(-maxToolCalls)
    .map((observation) => observation.text)
    .join('\n')
  const response = await orchestrateLLM({
    prompt: `${task.prompt}\n\nTool results:\n${toolContext}`,
    system: 'Continue the agent task using the verified tool results. Do not claim tools were executed unless present in the observations.',
    mode: task.kind === 'research' ? 'researcher' : 'biohacker',
    preferredProvider: run.selectedModel?.provider as LLMProvider | undefined,
    preferredModel: run.selectedModel?.model,
  })
  run.observations.push({ kind: 'model', text: response.text, createdAt: new Date().toISOString() })
  run.status = 'completed'
  run.completedAt = new Date().toISOString()
  await store.appendRun(run)
  return result.run
}

export function pendingSkillCandidates() { return skillEvolution.listPending() }
