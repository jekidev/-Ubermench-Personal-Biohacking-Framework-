import { authorizeLlmAction } from '../security/action-policy'
import type { ApprovalToken } from '../security/scoped-approval'

type ProviderRequest = {
  provider: string
  target: string
  payload: unknown
}

type ProviderAdapter = (request: ProviderRequest) => Promise<unknown>

export async function executeProviderRequest(
  request: ProviderRequest,
  token: ApprovalToken | undefined,
  adapter: ProviderAdapter,
): Promise<unknown> {
  if (!token) throw new Error('Provider call blocked: valid user approval token is required.')

  authorizeLlmAction('send', {
    decision: 'approved',
    tauriRuntime: true,
    payload: request.payload,
  })

  if (token.action !== 'send' || token.target !== request.target || token.payloadHash !== stableHash(request.payload)) {
    throw new Error('Provider call blocked: approval token does not match the exact request.')
  }

  if (Date.now() >= token.expiresAt) throw new Error('Provider call blocked: approval token has expired.')
  if (token.used) throw new Error('Provider call blocked: approval token has already been consumed.')

  token.used = true
  return adapter(request)
}

function stableHash(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).sort())
}
