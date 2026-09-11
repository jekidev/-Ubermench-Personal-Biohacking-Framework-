import { describe, expect, it } from 'vitest'
import { getMcpServer } from './servers'
import {
  applyMcpRequestPolicy,
  applyMcpToolPolicy,
  filterMcpToolsByPolicy,
} from './tool-policy'

function paperSearchServer() {
  const server = getMcpServer('paper-search')
  if (!server) throw new Error('Paper Search MCP registry entry is missing.')
  return server
}

describe('MCP tool policy', () => {
  it('hides and blocks Sci-Hub tools', () => {
    const server = paperSearchServer()
    expect(filterMcpToolsByPolicy(server, [
      { name: 'search_papers' },
      { name: 'download_scihub' },
    ])).toEqual([{ name: 'search_papers' }])
    expect(() => applyMcpToolPolicy(server, 'download_scihub', {})).toThrow(/disabled by local policy/i)
  })

  it('forces the open-access-only fallback path', () => {
    const server = paperSearchServer()
    expect(applyMcpToolPolicy(server, 'download_with_fallback', {
      doi: '10.1000/example',
      use_scihub: true,
    })).toEqual({
      name: 'download_with_fallback',
      arguments: {
        doi: '10.1000/example',
        use_scihub: false,
      },
    })
  })

  it('applies policy to direct tools/call requests', () => {
    const server = paperSearchServer()
    expect(applyMcpRequestPolicy(server, 'tools/call', {
      name: 'download_with_fallback',
      arguments: { use_scihub: true },
    })).toEqual({
      name: 'download_with_fallback',
      arguments: { use_scihub: false },
    })
  })
})
