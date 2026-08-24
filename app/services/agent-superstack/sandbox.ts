export interface SandboxRequest { command: string; cwd?: string; timeoutMs?: number; allowNetwork?: boolean }
export interface SandboxResult { ok: boolean; stdout: string; stderr: string; exitCode: number | null; blocked: boolean; reason?: string }

const blocked = [/rm\s+-rf/i, /mkfs/i, /shutdown/i, /reboot/i, /:>\s*\/dev\//i, /dd\s+if=/i]

export function validateSandboxRequest(request: SandboxRequest): SandboxResult | null {
  const match = blocked.find((pattern) => pattern.test(request.command))
  if (!match) return null
  return { ok: false, stdout: '', stderr: '', exitCode: null, blocked: true, reason: `Blocked command pattern: ${match}` }
}

/** Platform adapter: actual process execution belongs in the Tauri/Rust side. */
export interface SandboxExecutor { execute(request: SandboxRequest): Promise<SandboxResult> }
