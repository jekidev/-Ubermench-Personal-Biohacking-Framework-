export type ToolRisk = 'read' | 'retrieve' | 'write' | 'execute'

export type ToolPolicy = {
  enabled: boolean
  risk: ToolRisk
  requiresNativeTauri: boolean
  requiresExplicitApproval: boolean
}

// Pure local reads may remain available without approval.
export const DEFAULT_TOOL_POLICY: ToolPolicy = {
  enabled: true,
  risk: 'read',
  requiresNativeTauri: false,
  requiresExplicitApproval: false,
}

// Network/RAG/scraping are retrieval actions and always require explicit approval.
export const RETRIEVAL_TOOL_POLICY: ToolPolicy = {
  enabled: true,
  risk: 'retrieve',
  requiresNativeTauri: false,
  requiresExplicitApproval: true,
}

export const WRITE_TOOL_POLICY: ToolPolicy = {
  enabled: false,
  risk: 'write',
  requiresNativeTauri: true,
  requiresExplicitApproval: true,
}

export const EXECUTE_TOOL_POLICY: ToolPolicy = {
  enabled: false,
  risk: 'execute',
  requiresNativeTauri: true,
  requiresExplicitApproval: true,
}

export function canRunTool(policy: ToolPolicy, runtime: 'web' | 'tauri', approved: boolean): boolean {
  if (!policy.enabled) return false
  if (policy.requiresNativeTauri && runtime !== 'tauri') return false
  if (policy.requiresExplicitApproval && !approved) return false
  return true
}
