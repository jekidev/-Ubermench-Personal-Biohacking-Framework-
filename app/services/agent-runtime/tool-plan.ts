import type { AgentToolCall } from './types'

const MAX_TOOL_CALLS = 8
const TOOL_NAME = /^[a-z][a-z0-9._-]{1,63}$/

function parseCandidate(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1]) }
    catch { return undefined }
  }
  try { return JSON.parse(trimmed) }
  catch { return undefined }
}

export function extractToolCalls(text: string): AgentToolCall[] {
  const candidate = parseCandidate(text) as { toolCalls?: unknown } | undefined
  if (!candidate || !Array.isArray(candidate.toolCalls)) return []

  return candidate.toolCalls.slice(0, MAX_TOOL_CALLS).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return []
    const value = raw as Record<string, unknown>
    const name = typeof value.name === 'string' ? value.name.trim() : ''
    if (!TOOL_NAME.test(name)) return []
    const args = value.args && typeof value.args === 'object' && !Array.isArray(value.args) ? value.args as Record<string, unknown> : {}
    const id = typeof value.id === 'string' && value.id.trim() ? value.id : `tool_${index + 1}`
    return [{ id, name, args, requiresApproval: value.requiresApproval === true, approvalToken: typeof value.approvalToken === 'string' ? value.approvalToken : undefined }]
  })
}
