import type { LLMRequest, LLMSettings } from '~/types/llm'
import { DEFAULT_LLM_SETTINGS } from '~/types/llm'
import { getSecret, isSecretVaultUnlocked, lockSecretVault, removeSecret, setSecret, unlockSecretVault } from '~/services/secret-vault'
import { loadLLMSettings, orchestrateLLM, saveLLMSettings } from '~/services/llm-orchestrator'

const secretKey = (provider: string) => `llm:${provider}`

export function useLLM() {
  const settings = useState<LLMSettings>('ubermench-llm-settings', () => loadLLMSettings())
  const vaultUnlocked = useState<boolean>('ubermench-llm-vault-unlocked', () => isSecretVaultUnlocked())

  async function reload() {
    const next = loadLLMSettings()
    if (isSecretVaultUnlocked()) {
      for (const provider of next.providers) {
        try { provider.apiKey = await getSecret(secretKey(provider.provider)) } catch { provider.apiKey = undefined }
      }
    }
    settings.value = next
  }

  async function unlockVault(masterPassword: string) {
    await unlockSecretVault(masterPassword)
    vaultUnlocked.value = isSecretVaultUnlocked()
    await reload()
  }

  async function lockVault() {
    await lockSecretVault()
    vaultUnlocked.value = false
    settings.value = loadLLMSettings()
  }

  function update(next: Partial<LLMSettings>) {
    settings.value = { ...settings.value, ...next }
    saveLLMSettings(settings.value)
  }

  async function setProviderKey(provider: LLMSettings['providers'][number]['provider'], apiKey: string, model?: string) {
    if (isSecretVaultUnlocked()) {
      if (apiKey.trim()) await setSecret(secretKey(provider), apiKey.trim())
      else await removeSecret(secretKey(provider))
    }
    const providers = settings.value.providers.map((item) => item.provider === provider ? { ...item, apiKey: apiKey.trim() || undefined, ...(model ? { model } : {}) } : item)
    settings.value = { ...settings.value, providers }
    saveLLMSettings(settings.value)
  }

  async function clearKeys() {
    for (const provider of settings.value.providers) {
      try { await removeSecret(secretKey(provider.provider)) } catch { /* vault locked / browser fallback */ }
    }
    settings.value = { ...settings.value, providers: settings.value.providers.map((item) => ({ ...item, apiKey: undefined })) }
    saveLLMSettings(settings.value)
  }

  async function run(request: LLMRequest) { return orchestrateLLM(request, settings.value) }
  function reset() { settings.value = structuredClone(DEFAULT_LLM_SETTINGS); saveLLMSettings(settings.value) }

  return { settings, vaultUnlocked, reload, unlockVault, lockVault, update, setProviderKey, clearKeys, run, reset }
}
