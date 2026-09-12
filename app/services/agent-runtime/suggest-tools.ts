import type { AgentToolCall } from './types'
import {
  applyCatalogApproval,
  type ToolApprovalLookup,
} from './tool-plan'

const MAX_SUGGESTED_AUTO_TOOLS = 3

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle))
}

function quotedQuery(prompt: string): string | undefined {
  const match = prompt.match(/["“']([^"”']{2,80})["”']/)
  const value = match?.[1]?.trim()
  return value || undefined
}

function exerciseQuery(prompt: string): string {
  return quotedQuery(prompt)
    ?? prompt.match(/\b(squat|deadlift|bench|dumbbell|kettlebell|pull[- ]?up|plank|lunge|row|press)\b/i)?.[1]
    ?? 'squat'
}

function literatureGoal(prompt: string): string {
  const trimmed = prompt.replace(/^\s*\/research\s+/i, '').trim()
  return trimmed.slice(0, 240) || 'longevity'
}

function makeCall(name: string, args: Record<string, unknown>, index: number): AgentToolCall {
  return {
    id: `plan_${index + 1}_${name.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`,
    name,
    args,
  }
}

export function suggestToolCallsFromPrompt(
  prompt: string,
  catalog: ToolApprovalLookup = [],
): AgentToolCall[] {
  const text = prompt.toLowerCase()
  const planned: AgentToolCall[] = []
  const add = (name: string, args: Record<string, unknown> = {}) => {
    if (planned.some((call) => call.name === name)) return
    planned.push(makeCall(name, args, planned.length))
  }

  if (includesAny(text, ['garmin', 'wearable', 'hrv', 'sleep score', 'resting hr', 'wellness api'])) {
    add('plugins.garmin.status')
  }
  if (includesAny(text, ['lab pdf', 'bloods pdf', 'inspect pdf', 'pdf inspect', 'scanned pdf', 'sample pdf'])) {
    add('plugins.pdf.inspect', text.includes('sample') ? { sample: true } : {})
  }
  if (includesAny(text, ['exercise catalog', 'exercises', 'dumbbell', 'squat', 'workout catalog'])) {
    add('plugins.exercises.search', { query: exerciseQuery(prompt), limit: 8 })
  }
  if (includesAny(text, ['watchlist', 'geroscience', 'epigenetic clock', 'aging clock'])) {
    add('plugins.watchlist.list', text.includes('clock') ? { tier: 'clock' } : {})
  }
  if (includesAny(text, ['plugin status', 'starred integration', 'pdf inspector'])) {
    add('plugins.status')
  }
  if (includesAny(text, ['pubmed', 'arxiv', 'biorxiv', 'europe pmc', 'paper search', 'openalex', 'literature'])) {
    add('research.europepmc', { goal: literatureGoal(prompt), pageSize: 8 })
    add('research.status')
  }
  if (includesAny(text, ['paperqa', 'cite from pdf', 'local rag', 'indexed pdf'])) {
    add('research.paperqa.plan', { question: prompt.slice(0, 240) })
  }
  if (includesAny(text, ['ldr-mcp', 'local deep research', 'ldr status', 'paper-search mcp', 'transcriptor mcp'])) {
    add('research.status')
  }

  const approved = applyCatalogApproval(planned, catalog)
  const auto = approved.filter((call) => !call.requiresApproval)
  return auto.slice(0, MAX_SUGGESTED_AUTO_TOOLS)
}

export function resolveToolCallsFromModel(
  modelText: string,
  prompt: string,
  catalog: ToolApprovalLookup,
  extract: (text: string, catalog: ToolApprovalLookup) => AgentToolCall[],
): { calls: AgentToolCall[]; source: 'model' | 'planner' | 'none' } {
  const fromModel = extract(modelText, catalog)
  if (fromModel.length) return { calls: fromModel, source: 'model' }
  const planned = suggestToolCallsFromPrompt(prompt, catalog)
  if (planned.length) return { calls: planned, source: 'planner' }
  return { calls: [], source: 'none' }
}

export function formatSuggestedTools(calls: AgentToolCall[]): string {
  if (!calls.length) return ''
  const lines = calls.map((call) => `- ${call.name} ${JSON.stringify(call.args)}`)
  return `Suggested auto tools if a lookup would help (emit toolCalls JSON; never invent approval tokens):\n${lines.join('\n')}`
}
