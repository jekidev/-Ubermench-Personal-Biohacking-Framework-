import type { LLMRequest, LLMSettings } from '~/types/llm'
import { DEFAULT_LLM_SETTINGS } from '~/types/llm'
import { loadLLMSettings, orchestrateLLM, saveLLMSettings } from '~/services/llm-orchestrator'

export function useLLM() {
  const settings = useState<LLMSettings>('ubermench-llm-settings', () => loadLLMSettings())

  function reload() { settings.value = loadLLMSettings() }
  function update(next: Partial<LLMSettings>) {
    settings.value = { ...settings.value, ...next }
    saveLLMSettings(settings.value)
  }
  function setProviderKey(provider: LLMSettings['providers'][number]['provider'], apiKey: string, model?: string) {
    const providers = settings.value.providers.map((item) => item.provider === provider ? { ...item, apiKey, ...(model ? { model } : {}) } : item)
    settings.value = { ...settings.value, providers }
    saveLLMSettings(settings.value)
  }
  function clearKeys() {
    settings.value = { ...settings.value, providers: settings.value.providers.map((item) => ({ ...item, apiKey: undefined })) }
    saveLLMSettings(settings.value)
  }
  async function run(request: LLMRequest) { return orchestrateLLM(request, settings.value) }
  function reset() { settings.value = structuredClone(DEFAULT_LLM_SETTINGS); saveLLMSettings(settings.value) }

  return { settings, reload, update, setProviderKey, clearKeys, run, reset }
}
