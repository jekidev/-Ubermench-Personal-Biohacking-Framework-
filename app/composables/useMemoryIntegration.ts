import { syncConnectorMcpInstall } from '../../plugins/connectors/connector-mcp-sync'
import { getConnectorStatus } from '../../plugins/connectors/connector-runtime'
import { AgentMemoryRagIndex } from '../../plugins/longevity/rag/agent-memory-index'
import { searchUnifiedRag } from '../../plugins/longevity/rag/unified-search'
import type { UnifiedRagHit } from '../../plugins/longevity/rag/unified-search'
import { getInstalledMcpServer } from '../../plugins/llm/mcp/install-store'
import { installMcpFromCatalog } from '../../plugins/llm/mcp/install'
import type { ConnectorId } from '../../plugins/connectors/types'
import { setSecret } from '../services/secret-vault'
import { useConnectorEnablement } from './useConnectorEnablement'

const MEMORY_MCP_CONNECTORS: ConnectorId[] = ['supermemory', 'mem0', 'mcp-memory']

export function useMemoryIntegration() {
  const { isEnabled, setEnabled } = useConnectorEnablement()
  const busy = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const searchResults = ref<UnifiedRagHit[]>([])
  const mem0KeyDraft = ref('')

  const agentMemoryCount = computed(() => new AgentMemoryRagIndex().count())
  const connectorEnabled = computed(() => isEnabled('agent-memory'))

  function mcpStatus(serverId: string) {
    const installed = getInstalledMcpServer(serverId)
    if (!installed) return 'not installed'
    return installed.enabled ? 'installed + enabled' : 'installed, disabled'
  }

  async function loadCredentials() {
    mem0KeyDraft.value = ''
  }

  async function saveMem0Key() {
    busy.value = true
    error.value = ''
    try {
      await setSecret('MEM0_API_KEY', mem0KeyDraft.value.trim())
      mem0KeyDraft.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to save Mem0 API key'
    } finally {
      busy.value = false
    }
  }

  function setAgentMemoryConnector(enabled: boolean) {
    setEnabled('agent-memory', enabled)
  }

  async function setMemoryMcpConnector(id: ConnectorId, enabled: boolean) {
    setEnabled(id, enabled)
    syncConnectorMcpInstall(id, enabled)
    if (enabled) {
      const connector = { supermemory: 'supermemory', mem0: 'mem0', 'mcp-memory': 'memory' } as const
      const serverId = connector[id as keyof typeof connector]
      if (serverId) installMcpFromCatalog(serverId)
    }
  }

  async function refreshStatus(id: ConnectorId) {
    return getConnectorStatus(id)
  }

  function runSearch() {
    searchResults.value = searchUnifiedRag(searchQuery.value, {
      limit: 20,
      includeDocuments: true,
      includeAgentMemory: true,
    })
  }

  return {
    busy,
    error,
    searchQuery,
    searchResults,
    mem0KeyDraft,
    agentMemoryCount,
    connectorEnabled,
    mcpStatus,
    memoryMcpConnectors: MEMORY_MCP_CONNECTORS,
    loadCredentials,
    saveMem0Key,
    setAgentMemoryConnector,
    setMemoryMcpConnector,
    refreshStatus,
    runSearch,
    isConnectorEnabled: isEnabled,
  }
}
