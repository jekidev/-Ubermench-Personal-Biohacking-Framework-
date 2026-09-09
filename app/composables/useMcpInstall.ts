import { installCustomMcpServer, installMcpFromCatalog, listMcpCatalog, uninstallMcpServer } from '../../plugins/llm/mcp/install'
import { setInstalledMcpEnabled, type InstalledMcpServer } from '../../plugins/llm/mcp/install-store'
import type { McpCatalogItem } from '../../plugins/llm/mcp/install'

export function useMcpInstall() {
  const catalog = ref<McpCatalogItem[]>([])
  const busy = ref(false)
  const error = ref('')

  function refresh() {
    catalog.value = listMcpCatalog()
  }

  async function install(serverId: string) {
    busy.value = true
    error.value = ''
    try {
      installMcpFromCatalog(serverId)
      refresh()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'MCP install failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  async function installCustom(input: {
    serverId: string
    executable: string
    args: string[]
    envKeys: string[]
    description?: string
    userConfirmed: boolean
  }) {
    busy.value = true
    error.value = ''
    try {
      installCustomMcpServer(input)
      refresh()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Custom MCP install failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  async function uninstall(serverId: string) {
    busy.value = true
    error.value = ''
    try {
      uninstallMcpServer(serverId)
      refresh()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'MCP uninstall failed'
      throw cause
    } finally {
      busy.value = false
    }
  }

  function setEnabled(serverId: string, enabled: boolean): InstalledMcpServer {
    const next = setInstalledMcpEnabled(serverId, enabled)
    refresh()
    return next
  }

  return { catalog, busy, error, refresh, install, installCustom, uninstall, setEnabled }
}
