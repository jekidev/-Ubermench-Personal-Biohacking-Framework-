import { orchestrateLLM } from '~/services/llm-orchestrator'
import type { LLMProvider } from '~/types/llm'
import { agentKernel } from '~/services/agent-superstack/kernel'
import type { AgentTask } from '~/services/agent-superstack/types'
import type { AgentObservation, AgentRun, AgentToolCall } from './types'
import { createRuntimeStore } from './store'
import { recordAudit } from './audit'
import { withRecovery } from './recovery'
import { SkillEvolutionEngine } from './skill-evolution'
import { executeApprovedToolCalls } from './tool-loop'
import { extractToolCalls } from './tool-plan'

const skillEvolution = new SkillEvolutionEngine()

function auditEvent(runId: string, type: Parameters<typeof recordAudit>[1]['type'], detail: string, metadata?: Record<string, unknown>) {
  return { id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, runId, type, detail, createdAt: new Date().toISOString(), metadata }
}

function splitToolCalls(calls: AgentToolCall[]): { executable: AgentToolCall[]; awaitingApproval: AgentToolCall[] } {
  const approvalRequired = (call: AgentToolCall) => call.requiresApproval === true || call.name === 'mcp.stdio'
  const executable = calls.filter((call) => !approvalRequired(call) || Boolean(call.approvalToken?.trim()))
  const awaitingApproval = calls.filter((call) => approvalRequired(call) && !call.approvalToken?.trim())
  return { executable, awaitingApproval }
}

export async function runAgentTask(task: AgentTask): Promise<AgentRun> {
  const store = createRuntimeStore()
  const existing = await store.findRunByTaskId(task.id)
  if (existing?.status === 'completed') return existing
  if (existing && existing.status !== 'failed') throw new Error(`Agent task ${task.id} already has an active run (${existing.status}). Resume or cancel that run before creating another.`)

  const id = existing?.id ?? `run_${task.id}`
  const startedAt = existing?.startedAt ?? new Date().toISOString()
  const memories = await store.loadMemory()
  agentKernel.memory.hydrate(memories)
  const context = agentKernel.prepare(task)
  const run: AgentRun = existing ?? { id, task, status: 'planning', context, observations: [], toolCalls: [], selectedModel: context.selectedModel, startedAt, retryCount: 0 }
  run.context = context
  run.selectedModel = context.selectedModel
  run.status = 'planning'
  await store.appendRun(run)
  await recordAudit(store, auditEvent(id, 'run.started', existing ? 'Resuming recoverable agent run' : 'Agent run started', { taskKind: task.kind, idempotencyKey: task.id }))
  try {
    if (!context.policy.allowed) {
      await recordAudit(store, auditEvent(id, 'policy.blocked', context.policy.reason))
      throw new Error(`Agent task blocked: ${context.policy.reason}`)
    }
    if (context.policy.requiresConfirmation) {
      await recordAudit(store, auditEvent(id, 'policy.blocked', 'Agent task requires explicit confirmation'))
      throw new Error('Agent task requires explicit confirmation before execution.')
    }
    const memoryContext = context.memories.map((m) => `- ${m.text}`).join('\n')
    const skillContext = context.skills.map((s) => `- ${s.name}: ${s.description}`).join('\n')
    const system = [
      'You are the Uberm3nch agent kernel. Follow policy and never bypass approval gates.',
      'When a tool would materially help, return a JSON object with a toolCalls array and do not claim the tool ran.',
      'Each tool call must contain id, name and args. Set requiresApproval for risky actions. Never invent approval tokens.',
      `Task kind: ${task.kind}`,
      `Selected model: ${context.selectedModel?.provider ?? 'unavailable'}/${context.selectedModel?.model ?? 'unavailable'}`,
      memoryContext ? `Relevant memory:\n${memoryContext}` : 'Relevant memory: none',
      skillContext ? `Available skills:\n${skillContext}` : 'Available skills: none',
    ].join('\n\n')
    run.status = 'executing'
    const response = await withRecovery(
      () => orchestrateLLM({
        prompt: task.prompt,
        system,
        mode: task.kind === 'research' ? 'researcher' : 'biohacker',
        preferredProvider: context.selectedModel?.provider as LLMProvider | undefined,
        preferredModel: context.selectedModel?.model,
      }),
      undefined,
      async (attempt, error, delayMs) => {
        run.retryCount = attempt
        await store.appendRun(run)
        await recordAudit(store, auditEvent(id, 'recovery.retry', 'Retrying LLM execution', { attempt, delayMs, error: error instanceof Error ? error.message : String(error) }))
      },
    )
    run.observations.push({ kind: 'model', text: response.text, createdAt: new Date().toISOString() } as AgentObservation)
    const calls = extractToolCalls(response.text)
    for (const call of calls) await recordAudit(store, auditEvent(id, 'tool.requested', `Tool requested: ${call.name}`, { toolCallId: call.id, requiresApproval: call.requiresApproval === true || call.name === 'mcp.stdio' }))

    const { executable, awaitingApproval } = splitToolCalls(calls)
    if (awaitingApproval.length) {
      run.toolCalls.push(...awaitingApproval.filter((call) => !run.toolCalls.some((existingCall) => existingCall.id === call.id)))
      run.status = 'waiting-approval'
      await store.appendRun(run)
      await recordAudit(store, auditEvent(id, 'tool.blocked', 'Execution paused pending explicit approval', { toolCalls: awaitingApproval.map((call) => call.name) }))
      return run
    }

    if (executable.length) {
      const result = await executeApprovedToolCalls(task, run, executable)
      await recordAudit(store, auditEvent(id, 'tool.completed', `Executed ${result.executed} tool call(s)`))
      const toolContext = run.observations.filter((observation) => observation.kind === 'tool').slice(-8).map((observation) => observation.text).join('\n')
      const continuation = await withRecovery(
        () => orchestrateLLM({
          prompt: `${task.prompt}\n\nVerified tool results:\n${toolContext}`,
          system: 'Continue using only verified tool results. Never claim a tool ran unless present in the observations. If another risky tool is needed, return a structured toolCalls JSON object without executing it.',
          mode: task.kind === 'research' ? 'researcher' : 'biohacker',
          preferredProvider: context.selectedModel?.provider as LLMProvider | undefined,
          preferredModel: context.selectedModel?.model,
        }),
        undefined,
        async (attempt, error, delayMs) => {
          run.retryCount = (run.retryCount ?? 0) + 1
          await store.appendRun(run)
          await recordAudit(store, auditEvent(id, 'recovery.retry', 'Retrying continuation model execution', { attempt, delayMs, error: error instanceof Error ? error.message : String(error) }))
        },
      )
      run.observations.push({ kind: 'model', text: continuation.text, createdAt: new Date().toISOString() })
    }

    await recordAudit(store, auditEvent(id, 'model.completed', 'Model execution completed', { provider: response.provider, model: response.model, attempts: response.attempts, toolCalls: calls.length }))
    run.status = 'completed'
    run.completedAt = new Date().toISOString()
    skillEvolution.propose(task.prompt, 'success: model response completed')
    agentKernel.learnFromTask(task, 'success: agent run completed')
    await store.saveMemory(agentKernel.memory.all())
    await store.appendRun(run)
    await recordAudit(store, auditEvent(id, 'run.completed', 'Agent run completed'))
    return run
  } catch (error) {
    run.status = 'failed'
    run.error = error instanceof Error ? error.message : String(error)
    run.completedAt = new Date().toISOString()
    await store.appendRun(run)
    await recordAudit(store, auditEvent(id, 'run.failed', run.error, { retryCount: run.retryCount ?? 0 }))
    throw error
  }
}

export async function continueAgentWithTools(task: AgentTask, run: AgentRun, calls: AgentToolCall[], maxToolCalls = 8): Promise<AgentRun> {
  if (run.task.id !== task.id) throw new Error('Agent continuation task does not match the run task.')
  if (run.status === 'failed') throw new Error('Cannot continue a failed agent run.')
  const store = createRuntimeStore()
  for (const call of calls) await recordAudit(store, auditEvent(run.id, 'tool.requested', `Tool continuation requested: ${call.name}`, { toolCallId: call.id }))
  const result = await executeApprovedToolCalls(task, run, calls, maxToolCalls)
  run.status = 'executing'
  await recordAudit(store, auditEvent(run.id, 'tool.completed', `Executed ${result.executed} continuation tool call(s)`))
  const toolContext = run.observations.filter((observation) => observation.kind === 'tool').slice(-maxToolCalls).map((observation) => observation.text).join('\n')
  const response = await withRecovery(
    () => orchestrateLLM({
      prompt: `${task.prompt}\n\nTool results:\n${toolContext}`,
      system: 'Continue the agent task using only verified tool results. Never claim an unobserved tool execution. Return structured toolCalls JSON if another tool is required.',
      mode: task.kind === 'research' ? 'researcher' : 'biohacker',
      preferredProvider: run.selectedModel?.provider as LLMProvider | undefined,
      preferredModel: run.selectedModel?.model,
    }),
    undefined,
    async (attempt, error, delayMs) => {
      run.retryCount = (run.retryCount ?? 0) + 1
      await store.appendRun(run)
      await recordAudit(store, auditEvent(run.id, 'recovery.retry', 'Retrying continuation model execution', { attempt, delayMs, error: error instanceof Error ? error.message : String(error) }))
    },
  )
  run.observations.push({ kind: 'model', text: response.text, createdAt: new Date().toISOString() })
  const pending = extractToolCalls(response.text).some((call) => (call.requiresApproval || call.name === 'mcp.stdio') && !call.approvalToken)
  run.status = pending ? 'waiting-approval' : 'completed'
  run.completedAt = pending ? undefined : new Date().toISOString()
  await recordAudit(store, auditEvent(run.id, 'model.completed', 'Continuation model execution completed', { provider: response.provider, model: response.model, pendingApproval: pending }))
  await store.appendRun(run)
  return run
}

export function pendingSkillCandidates() { return skillEvolution.listPending() }
