import { describe, expect, it } from 'vitest'
import { validateMcpRequest } from './transport'
import { authorizeMcpStdioSpawn } from './tauri-stdio-policy'
import { validateStdioCommand } from './stdio-allowlist'

describe('MCP transport boundary', () => {
  it('accepts a valid HTTP request without command', () => {
    expect(() => validateMcpRequest({ serverId: 's1', transport: 'http', target: 'https://mcp.example', payload: {} })).not.toThrow()
  })

  it('rejects HTTP requests that smuggle a process command', () => {
    expect(() => validateMcpRequest({ serverId: 's1', transport: 'http', target: 'https://mcp.example', command: 'sh', payload: {} })).toThrow()
  })

  it('rejects stdio without a command', () => {
    expect(() => validateMcpRequest({ serverId: 's1', transport: 'stdio', target: 'local', payload: {} })).toThrow()
  })

  it('blocks stdio spawn without explicit approval', () => {
    expect(() => authorizeMcpStdioSpawn({ serverId: 's1', transport: 'stdio', target: 'local', command: 'node', payload: {} }, { tauriRuntime: true })).toThrow()
  })

  it('blocks stdio spawn outside Tauri even when approved', () => {
    expect(() => authorizeMcpStdioSpawn({ serverId: 's1', transport: 'stdio', target: 'local', command: 'node', payload: {} }, { decision: 'approved', tauriRuntime: false } as never)).toThrow()
  })

  it('allowlists executable and arguments', () => {
    const server = { serverId: 's1', executable: 'node', allowedArgs: ['server.mjs'] }
    expect(() => validateStdioCommand(server, 'node', ['server.mjs'])).not.toThrow()
    expect(() => validateStdioCommand(server, 'sh', ['server.mjs'])).toThrow()
    expect(() => validateStdioCommand(server, 'node', ['-c', 'danger'])).toThrow()
  })
})
