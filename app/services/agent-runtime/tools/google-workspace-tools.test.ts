import { describe, expect, it, vi } from 'vitest'
import { createGoogleWorkspaceTools } from './google-workspace-tools'

vi.mock('../../../../plugins/connectors/oauth/google-token-store', () => ({
  googleWorkspaceStatus: vi.fn(async () => ({ connected: false, clientConfigured: false, services: { gmail: false, 'google-drive': false, 'google-calendar': false }, grantedScopes: [] })),
  isGoogleServiceConnected: vi.fn(async () => false),
}))

describe('google workspace tools', () => {
  it('registers the required agent tools and fail-closes when disconnected', async () => {
    const tools = createGoogleWorkspaceTools()
    const names = tools.map((tool) => tool.name)
    expect(names).toEqual(expect.arrayContaining([
      'connector.google.status',
      'calendar.list',
      'calendar.create',
      'gmail.search',
      'gmail.draft',
      'gmail.send',
      'drive.search',
      'drive.sync',
    ]))
    expect(tools.find((tool) => tool.name === 'gmail.send')?.requiresApproval).toBe(true)
    await expect(tools.find((tool) => tool.name === 'gmail.send')!.execute({ to: 'a@b.com', subject: 'x', body: 'y' }))
      .rejects.toThrow(/not connected/)
  })
})
