import { invoke } from '@tauri-apps/api/core'

export interface LLMSettings {
  preferredProvider: 'auto' | 'openrouter' | 'openai' | 'anthropic'
  autoFreeOnly: boolean
  allowFrameworkWrite: boolean
  showToolActivity: boolean
  mcpServers: MCPServerConfig[]
}

export interface MCPServerConfig {
  id: string
  name: string
  transport: 'http' | 'stdio'
  url?: string
  command?: string
  args?: string[]
  enabled: boolean
}

const STORAGE_KEY = 'ubermench.llm.settings.v1'

const defaults: LLMSettings = {
  preferredProvider: 'auto',
  autoFreeOnly: true,
  allowFrameworkWrite: true,
  showToolActivity: true,
  mcpServers: [],
}

export function useLLMSettings() {
  const settings = useState<LLMSettings>('ubermench-llm-settings', () => ({ ...defaults }))

  const load = async () => {
    if (import.meta.client) {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          settings.value = { ...defaults, ...JSON.parse(raw) }
        } catch {
          settings.value = { ...defaults }
        }
      }
    }
    return settings.value
  }

  const save = async () => {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  const setSecret = async (provider: string, value: string) => {
    await invoke('llm_set_secret', { provider, value })
  }

  const getSecretPresent = async (provider: string) => {
    try { return await invoke<boolean>('llm_has_secret', { provider }) } catch { return false }
  }

  return { settings, load, save, setSecret, getSecretPresent }
}
