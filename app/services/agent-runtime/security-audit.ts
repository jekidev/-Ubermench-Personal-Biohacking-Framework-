import type { AgentTask } from '~/services/agent-superstack/types'

export interface SecurityFinding {
  id: string
  severity: 'low' | 'medium' | 'high'
  area: 'task' | 'native-mcp' | 'persistence' | 'network'
  message: string
  remediation: string
}

export function auditTaskSecurity(task: AgentTask): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  if (task.allowTools && task.riskLevel === 'high') {
    findings.push({ id: 'high-risk-tools', severity: 'high', area: 'task', message: 'High-risk tool execution requested.', remediation: 'Require explicit approval and route native actions through the approval-token boundary.' })
  }
  if (task.prompt.length > 20_000) {
    findings.push({ id: 'prompt-size', severity: 'medium', area: 'task', message: 'Prompt exceeds the runtime safety budget.', remediation: 'Trim or summarize the prompt before execution.' })
  }
  return findings
}
