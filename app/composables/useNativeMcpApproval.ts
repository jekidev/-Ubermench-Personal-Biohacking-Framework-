import { issueNativeMcpApproval, nativeMcpPreflight } from '~/services/agent-runtime/native-mcp'

export function useNativeMcpApproval() {
  const state = useState<'idle' | 'preflight' | 'approved' | 'error'>('ubermench-native-mcp-approval-state', () => 'idle')
  const token = useState<string | null>('ubermench-native-mcp-approval-token', () => null)
  const expiresInMs = useState<number | null>('ubermench-native-mcp-approval-expiry', () => null)
  const error = useState<string | null>('ubermench-native-mcp-approval-error', () => null)

  async function request(command: string, args: string[]) {
    state.value = 'preflight'
    error.value = null
    token.value = null
    try {
      await nativeMcpPreflight(command, args)
      const approval = await issueNativeMcpApproval(command, args)
      token.value = approval.token
      expiresInMs.value = approval.expires_in_ms
      state.value = 'approved'
      return approval
    } catch (cause) {
      state.value = 'error'
      error.value = cause instanceof Error ? cause.message : String(cause)
      throw cause
    }
  }

  function clear() {
    state.value = 'idle'
    token.value = null
    expiresInMs.value = null
    error.value = null
  }

  return { state, token, expiresInMs, error, request, clear }
}
