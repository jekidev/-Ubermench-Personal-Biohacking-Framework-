import type { AgentToolCall } from './types'

const MAX_TOOL_CALLS = 8
const TOOL_NAME = /^[a-z][a-z0-9._:-]{1,80}$/

function tryParseJson(text: string): unknown {
  try { return JSON.parse(text) }
  catch { return undefined }
}

function asToolEnvelope(value: unknown): { toolCalls?: unknown } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  if (!Array.isArray((value as { toolCalls?: unknown }).toolCalls)) return undefined
  return value as { toolCalls: unknown }
}

function extractBalancedObject(text: string, openIndex: number): string | undefined {
  if (text[openIndex] !== '{') return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(openIndex, index + 1)
    }
  }
  return undefined
}

function parseCandidate(text: string): { toolCalls?: unknown } | undefined {
  const trimmed = text.trim()
  const fences = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)]
  for (const fence of fences) {
    const envelope = asToolEnvelope(tryParseJson(fence[1] ?? ''))
    if (envelope) return envelope
  }

  const direct = asToolEnvelope(tryParseJson(trimmed))
  if (direct) return direct

  const marker = /"toolCalls"\s*:/.exec(trimmed)
  if (!marker) return undefined
  const openIndex = trimmed.lastIndexOf('{', marker.index)
  if (openIndex < 0) return undefined
  return asToolEnvelope(tryParseJson(extractBalancedObject(trimmed, openIndex) ?? ''))
}

export type ToolApprovalLookup = Array<{ name: string; requiresApproval: boolean }>

export function toolNameRequiresNativeApproval(name: string): boolean {
  return name === 'mcp.stdio' || name.startsWith('mcp.stdio:')
}

export function partitionPendingByApprovalSurface(calls: AgentToolCall[]): {
  catalog: AgentToolCall[]
  native: AgentToolCall[]
} {
  const catalog: AgentToolCall[] = []
  const native: AgentToolCall[] = []
  for (const call of calls) {
    if (toolNameRequiresNativeApproval(call.name)) native.push(call)
    else catalog.push(call)
  }
  return { catalog, native }
}

export function selectApprovableToolCalls(
  calls: AgentToolCall[],
  options: { includeNative?: boolean; nativeCallIds?: string[] } = {},
): AgentToolCall[] {
  const { catalog, native } = partitionPendingByApprovalSurface(calls)
  if (options.includeNative !== true) return catalog
  if (options.nativeCallIds?.length) {
    const allowed = new Set(options.nativeCallIds)
    return [...catalog, ...native.filter((call) => allowed.has(call.id))]
  }
  return [...catalog, ...native.slice(0, 1)]
}

export function applyCatalogApproval(
  calls: AgentToolCall[],
  catalog: ToolApprovalLookup = [],
): AgentToolCall[] {
  return calls.map((call) => {
    const listed = catalog.find((tool) => tool.name === call.name)
    return {
      ...call,
      requiresApproval: call.requiresApproval === true
        || listed?.requiresApproval === true
        || toolNameRequiresNativeApproval(call.name),
      approvalToken: undefined,
    }
  })
}

export function callRequiresApproval(call: AgentToolCall): boolean {
  return (call.requiresApproval === true || toolNameRequiresNativeApproval(call.name))
    && !call.approvalToken?.trim()
}

export function partitionToolCalls(calls: AgentToolCall[]): {
  executable: AgentToolCall[]
  awaitingApproval: AgentToolCall[]
} {
  const executable = calls.filter((call) => !callRequiresApproval(call))
  const awaitingApproval = calls.filter((call) => callRequiresApproval(call))
  return { executable, awaitingApproval }
}

export function assignUniqueToolCallIds(
  calls: AgentToolCall[],
  reserved: Iterable<string> = [],
): AgentToolCall[] {
  const taken = new Set([...reserved].filter(Boolean))
  const idToName = new Map<string, string>()
  return calls.map((call, index) => {
    const base = call.id.trim() || `tool_${index + 1}`
    let id = base
    const conflicts = taken.has(id) || (idToName.has(id) && idToName.get(id) !== call.name)
    if (conflicts) {
      let suffix = index + 1
      let next = `${base}__${suffix}`
      while (taken.has(next) || idToName.has(next)) {
        suffix += 1
        next = `${base}__${suffix}`
      }
      id = next
    }
    idToName.set(id, call.name)
    return { ...call, id }
  })
}

export function upsertToolCalls(existing: AgentToolCall[], incoming: AgentToolCall[]): AgentToolCall[] {
  const merged = [...existing]
  for (const call of incoming) {
    const index = merged.findIndex((item) => item.id === call.id && item.name === call.name)
    if (index >= 0) merged[index] = { ...merged[index], ...call }
    else {
      const [unique] = assignUniqueToolCallIds([call], merged.map((item) => item.id))
      if (unique) merged.push(unique)
    }
  }
  return merged
}

export function selectUnobservedFollowUpCalls(
  calls: AgentToolCall[],
  run: {
    toolCalls: AgentToolCall[]
    observations: Array<{ kind: string; toolCallId?: string }>
  },
  extraPending: AgentToolCall[] = [],
): AgentToolCall[] {
  const reserved = [
    ...run.toolCalls.map((call) => call.id),
    ...run.observations.flatMap((item) => item.toolCallId ? [item.toolCallId] : []),
    ...extraPending.map((call) => call.id),
  ]
  const unique = assignUniqueToolCallIds(calls, reserved)
  const executedNames = new Set(
    run.toolCalls
      .filter((call) => run.observations.some((item) => item.kind === 'tool' && item.toolCallId === call.id))
      .map((call) => call.name),
  )
  const pendingNames = new Set(extraPending.map((call) => call.name))
  return unique.filter((call) => !executedNames.has(call.name) && !pendingNames.has(call.name))
}

export function extractToolCalls(text: string, catalog: ToolApprovalLookup = []): AgentToolCall[] {
  const candidate = parseCandidate(text)
  const planned = candidate?.toolCalls
  if (!Array.isArray(planned)) return []

  const parsed = planned.slice(0, MAX_TOOL_CALLS).flatMap((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object') return []
    const value = raw as Record<string, unknown>
    const name = typeof value.name === 'string' ? value.name.trim() : ''
    if (!TOOL_NAME.test(name)) return []
    const args = value.args && typeof value.args === 'object' && !Array.isArray(value.args)
      ? value.args as Record<string, unknown>
      : {}
    const id = typeof value.id === 'string' && value.id.trim() ? value.id : `tool_${index + 1}`
    return [{
      id,
      name,
      args,
      requiresApproval: value.requiresApproval === true,
    }]
  })
  return applyCatalogApproval(assignUniqueToolCallIds(parsed), catalog)
}
