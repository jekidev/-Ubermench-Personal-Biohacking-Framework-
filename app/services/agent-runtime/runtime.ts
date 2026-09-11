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
import { extractToolCalls, partitionToolCalls, selectUnobservedFollowUpCalls, upsertToolCalls } from './tool-plan'
import { applyWaitingApprovalIfNeeded } from './run-reply'
import { formatAgentToolCatalog, listAgentToolCatalog } from './tool-catalog'
import { formatSuggestedTools, resolveToolCallsFromModel } from './suggest-tools'
import { auditTaskSecurity } from './security-audit'
import { listAllChatRules, listEnabledChatRules } from '~/services/chat-session/rule-registry'
import { buildStackSynergySnapshot, formatStackSynergyContext } from '~/services/chat-session/stack-synergy'

const skillEvolution = new SkillEvolutionEngine()

function auditEvent(runId: string, type: Parameters<typeof recordAudit>[1]['type'], detail: string, metadata?: Record<string, unknown>) {
  return { id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, runId, type, detail, createdAt: new Date().toISOString(), metadata }
}

function mergeRunToolCalls(run: AgentRun, calls: AgentToolCall[]) {
  run.toolCalls = upsertToolCalls(run.toolCalls, calls)
}

function followUpCallsFromModel(text: string, run: AgentRun, extraPending: AgentToolCall[] = []) {
  const catalog = listAgentToolCatalog()
  return selectUnobservedFollowUpCalls(extractToolCalls(text, catalog), run, extraPending)
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
    const securityFindings = auditTaskSecurity(task)
    if (securityFindings.length) {
      await recordAudit(store, auditEvent(id, 'policy.blocked', 'Runtime security audit produced findings', { findings: securityFindings }))
      if (securityFindings.some((finding) => finding.severity === 'high' || finding.id === 'prompt-size')) {
        throw new Error(`Agent task blocked by runtime security audit: ${securityFindings.map((finding) => finding.message).join(' ')}`)
      }
    }

    if (!context.policy.allowed) {
      await recordAudit(store, auditEvent(id, 'policy.blocked', context.policy.reason))
      throw new Error(`Agent task blocked: ${context.policy.reason}`)
    }
    if (context.policy.requiresConfirmation) {
      await recordAudit(store, auditEvent(id, 'policy.blocked', 'Agent task requires explicit confirmation'))
      throw new Error('Agent task requires explicit confirmation before execution.')
    }
    const memoryContext = context.memories.map((m) => `- ${m.text}`).join('\n')
    const skillContext = context.skills.map((skill) => {
      const tools = skill.tools.length ? ` (tools: ${skill.tools.join(', ')})` : ''
      return `- ${skill.name}: ${skill.description}${tools}`
    }).join('\n')
    const enabledRuleIds = task.chatOptions?.enabledRuleIds
      ?? listAllChatRules().filter((rule) => rule.enabled).map((rule) => rule.id)
    const ruleContext = listEnabledChatRules(enabledRuleIds)
      .map((rule) => `- ${rule.name}: ${rule.prompt}`)
      .join('\n')
    const stackContext = task.chatOptions?.showStackSynergy
      ? formatStackSynergyContext(buildStackSynergySnapshot({
        enabledSkillIds: task.chatOptions?.enabledSkillIds,
        enabledRuleIds,
        enabledWorkflowIds: task.chatOptions?.enabledWorkflowIds,
        showStackSynergy: true,
        workflowId: task.chatOptions?.workflowId,
      }))
      : ''
    const catalog = listAgentToolCatalog()
    const suggested = formatSuggestedTools(resolveToolCallsFromModel('', task.prompt, catalog, extractToolCalls).calls)
    const system = [
      'You are the Uberm3nch agent kernel. Follow policy and never bypass approval gates.',
      'When a registered tool would materially help (Garmin status, PDF inspect, exercise catalog, watchlist, Europe PMC, PaperQA, research.status), emit a JSON object with a toolCalls array BEFORE answering. Do not claim a tool ran unless its result is in observations.',
      'Each tool call must contain id, name and args. Never invent approval tokens. Approval-gated tools (mcp.stdio:*, research.paperqa.ask) pause the run.',
      'Sci-Hub is disabled. Prefer research.europepmc or mcp.stdio:paper-search for literature.',
      task.chatOptions?.workflowId === 'stack' || task.kind === 'biohacking'
        ? 'When discussing supplements, protocols, or interventions, explain synergies, timing interactions, and conflicts between stacks. Separate evidence quality from personal N-of-1 data.'
        : '',
      `Task kind: ${task.kind}`,
      task.chatOptions?.workflowId ? `Workflow: ${task.chatOptions.workflowId}` : '',
      `Selected model: ${context.selectedModel?.provider ?? 'unavailable'}/${context.selectedModel?.model ?? 'unavailable'}`,
      memoryContext ? `Relevant memory:\n${memoryContext}` : 'Relevant memory: none',
      skillContext ? `Active skills:\n${skillContext}` : 'Active skills: none',
      formatAgentToolCatalog(catalog),
      suggested,
      ruleContext ? `Active rules:\n${ruleContext}` : 'Active rules: none',
      task.chatOptions?.conversationHistory ? `Conversation history:\n${task.chatOptions.conversationHistory}` : '',
      task.chatOptions?.ragContext ? `Indexed document excerpts:\n${task.chatOptions.ragContext}` : '',
      stackContext,
    ].filter(Boolean).join('\n\n')
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
    run.activeProvider = response.provider
    run.activeModel = response.model
    run.fallbackUsed = response.fallbackUsed
    run.observations.push({ kind: 'model', text: response.text, createdAt: new Date().toISOString() } as AgentObservation)
    const resolved = resolveToolCallsFromModel(response.text, task.prompt, catalog, extractToolCalls)
    const calls = resolved.calls
    for (const call of calls) {
      await recordAudit(store, auditEvent(id, 'tool.requested', `Tool requested: ${call.name}`, {
        toolCallId: call.id,
        requiresApproval: call.requiresApproval === true,
        source: resolved.source,
      }))
    }

    const partitioned = partitionToolCalls(calls)
    const executable = partitioned.executable
    const awaitingApproval = [...partitioned.awaitingApproval]
    if (executable.length) {
      const result = await executeApprovedToolCalls(task, run, executable)
      await recordAudit(store, auditEvent(id, 'tool.completed', `Executed ${result.executed} tool call(s)`, { source: resolved.source }))
      const toolContext = run.observations.filter((observation) => observation.kind === 'tool').slice(-8).map((observation) => observation.text).join('\n')
      const continuation = await withRecovery(
        () => orchestrateLLM({
          prompt: `${task.prompt}\n\nVerified tool results:\n${toolContext}`,
          system: 'Continue using only verified tool results. Never claim a tool ran unless present in the observations. If another risky tool is needed, return a structured toolCalls JSON object without executing it. Never invent approval tokens. Sci-Hub stays off.',
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
      const followUp = followUpCallsFromModel(continuation.text, run, awaitingApproval)
      const more = partitionToolCalls(followUp)
      if (more.executable.length) {
        const extra = await executeApprovedToolCalls(task, run, more.executable)
        await recordAudit(store, auditEvent(id, 'tool.completed', `Executed ${extra.executed} follow-up tool call(s)`, { source: 'model' }))
      }
      awaitingApproval.push(...more.awaitingApproval)
    }

    if (awaitingApproval.length) {
      mergeRunToolCalls(run, awaitingApproval)
      run.status = 'waiting-approval'
      await store.appendRun(run)
      await recordAudit(store, auditEvent(id, 'tool.blocked', 'Execution paused pending explicit approval', { toolCalls: awaitingApproval.map((call) => call.name) }))
      return run
    }

    await recordAudit(store, auditEvent(id, 'model.completed', 'Model execution completed', { provider: response.provider, model: response.model, attempts: response.attempts, toolCalls: calls.length, toolSource: resolved.source }))
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
  const followUp = followUpCallsFromModel(response.text, run)
  const { executable: moreAuto, awaitingApproval } = partitionToolCalls(followUp)
  if (moreAuto.length) {
    const extra = await executeApprovedToolCalls(task, run, moreAuto, maxToolCalls)
    await recordAudit(store, auditEvent(run.id, 'tool.completed', `Executed ${extra.executed} follow-up tool call(s)`))
  }
  const stillPending = applyWaitingApprovalIfNeeded(run, awaitingApproval)
  if (stillPending.length) {
    await recordAudit(store, auditEvent(run.id, 'tool.blocked', 'Continuation paused pending explicit approval', { toolCalls: stillPending.map((call) => call.name) }))
    await store.appendRun(run)
    return run
  }
  run.status = 'completed'
  run.completedAt = new Date().toISOString()
  await recordAudit(store, auditEvent(run.id, 'model.completed', 'Continuation model execution completed', { provider: response.provider, model: response.model, pendingApproval: false }))
  await store.appendRun(run)
  return run
}

export function pendingSkillCandidates() { return skillEvolution.listPending() }
