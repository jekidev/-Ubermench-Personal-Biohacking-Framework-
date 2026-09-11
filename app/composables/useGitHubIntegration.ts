import { syncConnectorMcpInstall } from '../../plugins/connectors/connector-mcp-sync'
import { getConnectorStatus } from '../../plugins/connectors/connector-runtime'
import { isConnectorEnabled, setConnectorEnabled } from '../../plugins/connectors/connector-store'
import { DEFAULT_GITHUB_USERNAME, summarizeStarchiveCatalog } from '../../plugins/starchive/catalog-loader'
import { fetchStarredReposFromGithub } from '../../plugins/starchive/github-api'
import type { StarchiveRepo } from '../../plugins/starchive/types'
import { getInstalledMcpServer } from '../../plugins/llm/mcp/install-store'
import { installMcpFromCatalog } from '../../plugins/llm/mcp/install'
import {
  clearStoredStarchiveCatalog,
  resolveActiveStarchiveCatalog,
  saveStarchiveCatalog,
  searchActiveStarchive,
} from '../services/starchive-store'
import { getSecret, setSecret } from '../services/secret-vault'

export function useGitHubIntegration() {
  const busy = ref(false)
  const error = ref('')
  const searchQuery = ref('')
  const searchLanguage = ref('')
  const searchResults = ref<StarchiveRepo[]>([])
  const searchTotal = ref(0)
  const tokenDraft = ref('')
  const usernameDraft = ref(DEFAULT_GITHUB_USERNAME)

  const activeCatalog = computed(() => resolveActiveStarchiveCatalog())
  const summary = computed(() => summarizeStarchiveCatalog(activeCatalog.value.catalog))
  const connectorEnabled = computed(() => isConnectorEnabled('github'))
  const mcpInstalled = computed(() => Boolean(getInstalledMcpServer('github')))
  const mcpEnabled = computed(() => Boolean(getInstalledMcpServer('github')?.enabled))

  async function loadCredentials() {
    tokenDraft.value = ''
    usernameDraft.value = (await getSecret('GITHUB_USERNAME'))?.trim() || DEFAULT_GITHUB_USERNAME
  }

  async function saveToken() {
    busy.value = true
    error.value = ''
    try {
      await setSecret('GITHUB_PERSONAL_ACCESS_TOKEN', tokenDraft.value.trim())
      tokenDraft.value = ''
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to save GitHub token'
    } finally {
      busy.value = false
    }
  }

  async function saveUsername() {
    busy.value = true
    error.value = ''
    try {
      await setSecret('GITHUB_USERNAME', usernameDraft.value.trim() || DEFAULT_GITHUB_USERNAME)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to save GitHub username'
    } finally {
      busy.value = false
    }
  }

  async function setConnector(enabled: boolean) {
    setConnectorEnabled('github', enabled)
    syncConnectorMcpInstall('github', enabled)
  }

  function ensureMcpInstalled() {
    installMcpFromCatalog('github')
  }

  async function refreshStatus() {
    return getConnectorStatus('github')
  }

  function runSearch() {
    const result = searchActiveStarchive({
      query: searchQuery.value,
      language: searchLanguage.value,
      limit: 50,
    })
    searchResults.value = result.items
    searchTotal.value = result.total
  }

  async function refreshArchive() {
    busy.value = true
    error.value = ''
    try {
      const token = await getSecret('GITHUB_PERSONAL_ACCESS_TOKEN')
      if (!token?.trim()) throw new Error('Add a GitHub personal access token first.')
      const username = usernameDraft.value.trim() || DEFAULT_GITHUB_USERNAME
      const catalog = await fetchStarredReposFromGithub(username, token)
      saveStarchiveCatalog(catalog)
      runSearch()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to refresh starred archive'
    } finally {
      busy.value = false
    }
  }

  function resetToBundled() {
    clearStoredStarchiveCatalog()
    runSearch()
  }

  return {
    busy,
    error,
    searchQuery,
    searchLanguage,
    searchResults,
    searchTotal,
    tokenDraft,
    usernameDraft,
    activeCatalog,
    summary,
    connectorEnabled,
    mcpInstalled,
    mcpEnabled,
    loadCredentials,
    saveToken,
    saveUsername,
    setConnector,
    ensureMcpInstalled,
    refreshStatus,
    runSearch,
    refreshArchive,
    resetToBundled,
  }
}
