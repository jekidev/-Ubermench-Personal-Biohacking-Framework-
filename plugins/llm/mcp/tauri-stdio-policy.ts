import { authorizeLlmAction, type ActionContext } from '../security/action-policy'
import type { McpRequest } from './transport'

export type TauriStdioApproval = ActionContext & {
  tauriRuntime: true
}

/**
 * Policy-only boundary: validation is performed before any native spawn.
 * The actual Tauri command should call this immediately before process spawn.
 */
export function authorizeMcpStdioSpawn(request: McpRequest, context: TauriStdioApproval): void {
  if (request.transport !== 'stdio') {
    throw new Error('MCP stdio authorization requires a stdio request.')
  }

  authorizeLlmAction('execute', context)
}
