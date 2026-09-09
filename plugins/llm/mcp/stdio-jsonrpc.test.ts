import { describe, expect, it } from 'vitest'
import { buildJsonRpcLine, parseJsonRpcStdout } from './stdio-jsonrpc'

describe('stdio jsonrpc helpers', () => {
  it('builds newline-delimited JSON-RPC payloads', () => {
    expect(buildJsonRpcLine({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })).toContain('"method":"initialize"')
    expect(buildJsonRpcLine({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }).endsWith('\n')).toBe(true)
  })

  it('parses matching JSON-RPC responses from stdout', () => {
    const stdout = '{"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n'
    expect(parseJsonRpcStdout(stdout, 2)).toEqual({ tools: [] })
  })
})
