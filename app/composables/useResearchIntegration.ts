import { syncConnectorMcpInstall } from '../../plugins/connectors/connector-mcp-sync'
import { getConnectorStatus } from '../../plugins/connectors/connector-runtime'
import { useConnectorEnablement } from './useConnectorEnablement'
import type { ConnectorId } from '../../plugins/connectors/types'
import { getInstalledMcpServer } from '../../plugins/llm/mcp/install-store'
import { installMcpFromCatalog } from '../../plugins/llm/mcp/install'
import { answerPaperQaFromLocalRag, type PaperQaAnswer } from '../services/paper-qa'
import { listResearchProviders } from '../services/external-research-providers'
import { setSecret } from '../services/secret-vault'

const MCP_BY_CONNECTOR: Partial<Record<ConnectorId, string>> = {
  'paper-search': 'paper-search',
  'local-deep-research': 'local-deep-research',
  transcriptor: 'transcriptor',
}

export function useResearchIntegration() {
  const { settings, isEnabled, setEnabled } = useConnectorEnablement()
  const busy = ref(false)
  const error = ref('')
  const unpaywallEmailDraft = ref('')
  const ldrProviderDraft = ref('')
  const paperQaQuestion = ref('')
  const paperQaAnswer = ref<PaperQaAnswer | null>(null)

  const providers = computed(() => {
    void settings.value.enabled
    return listResearchProviders()
  })

  function mcpStatus(serverId: string) {
    const installed = getInstalledMcpServer(serverId)
    if (!installed) return 'not installed'
    return installed.enabled ? 'installed + enabled' : 'installed, disabled'
  }

  async function saveUnpaywallEmail() {
    busy.value = true
    error.value = ''
    try {
      await setSecret('PAPER_SEARCH_MCP_UNPAYWALL_EMAIL', unpaywallEmailDraft.value.trim())
      unpaywallEmailDraft.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to save Unpaywall email'
    } finally {
      busy.value = false
    }
  }

  async function saveLdrProvider() {
    busy.value = true
    error.value = ''
    try {
      await setSecret('LDR_LLM_PROVIDER', ldrProviderDraft.value.trim())
      ldrProviderDraft.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to save LDR provider'
    } finally {
      busy.value = false
    }
  }

  function setConnector(id: ConnectorId, enabled: boolean) {
    setEnabled(id, enabled)
    const serverId = MCP_BY_CONNECTOR[id]
    if (serverId) syncConnectorMcpInstall(id, enabled)
    if (enabled && serverId) installMcpFromCatalog(serverId)
  }

  async function refreshConnectorStatus(id: ConnectorId) {
    return getConnectorStatus(id)
  }

  function runPaperQaPreview() {
    error.value = ''
    try {
      if (!isEnabled('paper-qa')) {
        throw new Error('Enable the PaperQA connector first.')
      }
      paperQaAnswer.value = answerPaperQaFromLocalRag(paperQaQuestion.value)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'PaperQA preview failed'
      paperQaAnswer.value = null
    }
  }

  return {
    busy,
    error,
    unpaywallEmailDraft,
    ldrProviderDraft,
    paperQaQuestion,
    paperQaAnswer,
    providers,
    mcpStatus,
    saveUnpaywallEmail,
    saveLdrProvider,
    setConnector,
    refreshConnectorStatus,
    runPaperQaPreview,
    isConnectorEnabled: isEnabled,
  }
}
