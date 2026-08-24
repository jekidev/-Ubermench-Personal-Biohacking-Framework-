export type ApprovalToken = {
  action: 'send'
  target: string
  payloadHash: string
  expiresAt: number
  used: boolean
}
