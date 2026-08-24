import type { ApprovalRequest, ApprovalDecision, LlmAction } from './human-approval-gate'

export type ApprovalToken = {
  tokenId: string
  action: LlmAction
  target: string
  payloadHash: string
  expiresAt: string
  decision: ApprovalDecision
  used: boolean
}

async function fingerprint(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value ?? null))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function issueApprovalToken(request: ApprovalRequest, ttlMs = 120_000): Promise<ApprovalToken> {
  const payloadHash = await fingerprint(request.payloadPreview)
  return {
    tokenId: crypto.randomUUID(),
    action: request.action,
    target: request.target,
    payloadHash,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    decision: 'approved',
    used: false,
  }
}

export async function consumeApprovalToken(token: ApprovalToken, action: LlmAction, target: string, payload: unknown): Promise<void> {
  if (token.used) throw new Error('LLM action blocked: approval token has already been used.')
  if (token.decision !== 'approved') throw new Error('LLM action blocked: approval was denied.')
  if (Date.parse(token.expiresAt) <= Date.now()) throw new Error('LLM action blocked: approval token has expired.')
  if (token.action !== action || token.target !== target) throw new Error('LLM action blocked: approval scope does not match the requested action.')
  const payloadHash = await fingerprint(payload)
  if (token.payloadHash !== payloadHash) throw new Error('LLM action blocked: approved payload does not match the requested payload.')
  token.used = true
}
