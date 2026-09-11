import type { AgentObservation, AgentRun, AgentToolCall } from './types'

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

export function observationForToolCall(run: AgentRun, callId: string): AgentObservation | undefined {
  return run.observations.find((item) => item.kind === 'tool' && item.toolCallId === callId)
}

function previewToolText(text: string): string {
  if (text.length <= TOOL_PREVIEW_CHARS) return text
  return `${text.slice(0, TOOL_PREVIEW_CHARS)}…`
}

export function formatAgentRunReply(run: AgentRun): string {
  const toolObservations = run.observations.filter((item) => item.kind === 'tool')
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
  if (pending.length) {
    sections.push(`Waiting for approval: ${pending.map((call) => call.name).join(', ')}`)
  }
  if (lastModel.trim()) sections.push(lastModel.trim())
  if (run.error && !sections.length) return run.error
  return sections.join('\n\n') || 'No response.'
}
