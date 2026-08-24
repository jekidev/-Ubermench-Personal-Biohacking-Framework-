import type { AgentTask, PolicyDecision } from './types'

const destructivePatterns = [/\brm\s+-rf\b/i, /\bformat\b.*\bdisk\b/i, /\bdrop\s+database\b/i, /\bdelete\s+all\b/i, /\breset\s+--hard\b/i, /\bforce\s+push\b/i]
const sensitivePatterns = [/api[_ -]?key/i, /password/i, /private[_ -]?key/i, /secret/i, /token/i]

export function evaluateTask(task: AgentTask): PolicyDecision {
  if (task.riskLevel === 'high') return { allowed: true, reason: 'High-risk task requires explicit confirmation before execution.', requiresConfirmation: true }
  if (destructivePatterns.some((pattern) => pattern.test(task.prompt))) return { allowed: true, reason: 'Potentially destructive operation detected; confirmation required.', requiresConfirmation: true }
  if (sensitivePatterns.some((pattern) => pattern.test(task.prompt))) return { allowed: true, reason: 'Sensitive credential material detected; restrict secret handling.', requiresConfirmation: true }
  if (task.allowTools === false) return { allowed: true, reason: 'Tools disabled for this task.', requiresConfirmation: false }
  return { allowed: true, reason: 'No elevated-risk pattern detected.', requiresConfirmation: false }
}
