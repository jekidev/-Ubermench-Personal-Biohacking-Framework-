import { detectProductRuntime, isAndroidProduct, type ProductRuntime } from '~/utils/runtime-platform'
import { formatAndroidNativeHandoff, nativeMcpUnavailableMessage } from '../android-fallbacks'
import { formatNextNativePreflightLabel } from './mcp-server-tools'
import { nativeMcpAgentHref } from './native-mcp-handoff'
import type { AgentObservation, AgentRun, AgentToolCall } from './types'
import { partitionPendingByApprovalSurface, upsertToolCalls } from './tool-plan'

const TOOL_PREVIEW_CHARS = 1200

export function pendingAgentToolCalls(run: AgentRun): AgentToolCall[] {
  return run.toolCalls.filter((call) => {
    if (call.approvalToken?.trim() && run.observations.some((item) => item.kind === 'tool' && item.toolCallId === call.id)) {
      return false
    }
    const observed = run.observations.some((item) => item.kind === 'tool' && item.toolCallId === call.id)
    return !observed && call.requiresApproval === true && !call.approvalToken?.trim()
  })
}

export function pendingCatalogAgentToolCalls(run: AgentRun): AgentToolCall[] {
  return partitionPendingByApprovalSurface(pendingAgentToolCalls(run)).catalog
}

export function pendingNativeAgentToolCalls(run: AgentRun): AgentToolCall[] {
  return partitionPendingByApprovalSurface(pendingAgentToolCalls(run)).native
}

export function runNeedsApprovalUi(run: AgentRun): boolean {
  return run.status === 'waiting-approval' || pendingAgentToolCalls(run).length > 0
}

export function applyWaitingApprovalIfNeeded(run: AgentRun, extraAwaiting: AgentToolCall[] = []): AgentToolCall[] {
  if (extraAwaiting.length) {
    run.toolCalls = upsertToolCalls(run.toolCalls, extraAwaiting)
  }
  const pending = pendingAgentToolCalls(run)
  if (pending.length) {
    run.status = 'waiting-approval'
    run.completedAt = undefined
  }
  return pending
}

export function summarizeAgentRunForUi(run: AgentRun): {
  text: string
  provider: string
  model: string
  status: string
  prompt: string
} {
  return {
    text: formatAgentRunReply(run),
    provider: run.activeProvider ?? run.selectedModel?.provider ?? 'none',
    model: run.activeModel ?? run.selectedModel?.model ?? 'none',
    status: run.status,
    prompt: run.task.prompt,
  }
}

export function formatNativeMcpAgentHandoff(
  calls: AgentToolCall[],
  runtime: ProductRuntime = detectProductRuntime(),
): string {
  const names = calls.map((call) => call.name).join(', ')
  if (isAndroidProduct(runtime)) {
    return formatAndroidNativeHandoff(names, runtime)
  }
  const next = formatNextNativePreflightLabel(calls)
  const sequential = next
    ? ` Approve one native server at a time. ${next}`
    : ''
  const href = nativeMcpAgentHref(calls, runtime)
  return `${nativeMcpUnavailableMessage(runtime)} Native MCP still needs the Agent Control Center preflight token: ${names}.${sequential} Open ${href} to continue those calls. Catalog tools can be approved here.`
}

export function observationForToolCall(run: AgentRun, callId: string): AgentObservation | undefined {
  return run.observations.find((item) => item.kind === 'tool' && item.toolCallId === callId)
}

function previewToolText(text: string): string {
  if (text.length <= TOOL_PREVIEW_CHARS) return text
  return `${text.slice(0, TOOL_PREVIEW_CHARS)}…`
}

export function formatAgentRunReply(run: AgentRun): string {
  const toolObservations = run.observations.filter((item) => item.kind === 'tool')
  const systemNotes = run.observations.filter((item) => item.kind === 'system')
  const lastModel = [...run.observations].reverse().find((item) => item.kind === 'model')?.text ?? ''
  const pending = pendingAgentToolCalls(run)

  const sections: string[] = []
  if (toolObservations.length) {
    const lines = toolObservations.map((item) => {
      const name = run.toolCalls.find((call) => call.id === item.toolCallId)?.name ?? 'tool'
      return `- ${name}: ${previewToolText(item.text)}`
    })
    sections.push(`Tool results:\n${lines.join('\n')}`)
  }
  if (systemNotes.length) {
    sections.push(systemNotes.map((item) => item.text).join('\n'))
  }
  if (pending.length) {
    const { catalog, native } = partitionPendingByApprovalSurface(pending)
    const lines = [`Waiting for approval: ${pending.map((call) => call.name).join(', ')}`]
    if (catalog.length) {
      lines.push(`Approve catalog tools (${catalog.map((call) => call.name).join(', ')}) on Chat, Overview, or Agent.`)
    }
    if (native.length) {
      lines.push(formatNativeMcpAgentHandoff(native))
    }
    sections.push(lines.join('\n'))
  }
  if (lastModel.trim()) sections.push(lastModel.trim())
  if (run.error && !sections.length) return run.error
  return sections.join('\n\n') || 'No response.'
}
