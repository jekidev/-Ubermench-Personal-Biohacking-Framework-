import type { ApprovalRequest, ApprovalDecision, LlmAction } from './human-approval-gate'
import { fingerprintPayload } from './payload-fingerprint'

export type ApprovalToken = {
  tokenId: string
  action: LlmAction
  target: string
  payloadHash: string
  expiresAt: string
  decision: ApprovalDecision
  used: boolean
}

export function issueApprovalToken(request: ApprovalRequest, ttlMs?: number): Promise<ApprovalToken>
export function issueApprovalToken(request: ApprovalRequest, exactPayload: unknown, ttlMs?: number): Promise<ApprovalToken>
export async function issueApprovalToken(request: ApprovalRequest, exactPayloadOrTtl: unknown = request.payloadPreview, ttlMs = 120_000): Promise<ApprovalToken> {
  const exactPayload = typeof exactPayloadOrTtl === 'number' && arguments.length === 2
    ? request.payloadPreview
    : exactPayloadOrTtl
  const effectiveTtlMs = typeof exactPayloadOrTtl === 'number' && arguments.length === 2
    ? exactPayloadOrTtl
    : ttlMs
  const payloadHash = await fingerprintPayload(exactPayload)
  return {
    tokenId: crypto.randomUUID(),
    action: request.action,
    target: request.target,
    payloadHash,
    expiresAt: new Date(Date.now() + effectiveTtlMs).toISOString(),
    decision: 'approved',
    used: false,
  }
}

export async function consumeApprovalToken(token: ApprovalToken, action: LlmAction, target: string, payload: unknown): Promise<void> {
  if (token.used) throw new Error('LLM action blocked: approval token has already been used.')
  if (token.decision !== 'approved') throw new Error('LLM action blocked: approval was denied.')

  const expiresAt = Date.parse(token.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('LLM action blocked: approval token has expired.')
  }

  if (token.action !== action || token.target !== target) {
    throw new Error('LLM action blocked: approval scope does not match the requested action.')
  }

  const payloadHash = await fingerprintPayload(payload)
  if (token.payloadHash !== payloadHash) {
    throw new Error('LLM action blocked: approved payload does not match the requested payload.')
  }

  token.used = true
}
