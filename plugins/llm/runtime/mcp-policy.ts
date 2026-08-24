export type McpTransport = 'http' | 'stdio'
export type RuntimeHost = 'web' | 'tauri'

export type McpPolicy = {
  transport: McpTransport
  runtime: RuntimeHost
  requiresExplicitApproval: true
}

export function assertMcpRuntime(policy: McpPolicy): void {
  if (policy.transport === 'stdio' && policy.runtime !== 'tauri') {
    throw new Error('MCP stdio is blocked outside the native Tauri runtime.')
  }
}

export function canUseMcp(policy: McpPolicy, approved: boolean): boolean {
  assertMcpRuntime(policy)
  return approved
}
