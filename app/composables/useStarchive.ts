import { getSecret, isSecretVaultUnlocked, removeSecret, setSecret } from '~/services/secret-vault'
import {
  buildStarredRepoListsCsv,
  buildStarredReposCsv,
  createStarchiveClient,
  type StarchiveCatalog,
} from '~/services/starchive'

const USERNAME_KEY = 'ubermench-starchive-username'
const TOKEN_SECRET_KEY = 'starchive:github-token'

function readStoredUsername(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(USERNAME_KEY) ?? ''
}

function writeStoredUsername(username: string): void {
  if (typeof localStorage === 'undefined') return
  if (username.trim()) localStorage.setItem(USERNAME_KEY, username.trim())
  else localStorage.removeItem(USERNAME_KEY)
}

function downloadText(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function useStarchive() {
  const username = useState<string>('ubermench-starchive-username', () => readStoredUsername())
  const token = useState<string>('ubermench-starchive-token', () => '')
  const catalog = useState<StarchiveCatalog | null>('ubermench-starchive-catalog', () => null)
  const error = useState<string>('ubermench-starchive-error', () => '')
  const status = useState<string>('ubermench-starchive-status', () => '')
  const loading = useState<boolean>('ubermench-starchive-loading', () => false)

  async function reloadToken(): Promise<void> {
    if (!isSecretVaultUnlocked()) return
    try {
      token.value = (await getSecret(TOKEN_SECRET_KEY)) ?? ''
    } catch {
      token.value = ''
    }
  }

  function saveUsername(next: string): void {
    username.value = next
    writeStoredUsername(next)
  }

  async function saveToken(next: string): Promise<void> {
    const value = next.trim()
    token.value = value
    if (!isSecretVaultUnlocked()) return
    if (value) await setSecret(TOKEN_SECRET_KEY, value)
    else await removeSecret(TOKEN_SECRET_KEY)
  }

  async function fetchCatalog(): Promise<StarchiveCatalog> {
    error.value = ''
    status.value = ''
    loading.value = true
    try {
      const client = createStarchiveClient({ username: username.value, token: token.value })
      const next = await client.fetchCatalog()
      catalog.value = next
      status.value = next.lists.length
        ? `Fetched ${next.repos.length} starred repositories across ${next.lists.length} lists.`
        : `Fetched ${next.repos.length} starred repositories.`
      return next
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to fetch starred repositories'
      error.value = message
      throw cause instanceof Error ? cause : new Error(message)
    } finally {
      loading.value = false
    }
  }

  function downloadReposCsv(): void {
    if (!catalog.value) throw new Error('Fetch starred repositories before exporting a CSV')
    downloadText('starred_repos.csv', buildStarredReposCsv(catalog.value.repos))
  }

  function downloadListsCsv(): void {
    if (!catalog.value) throw new Error('Fetch starred repositories before exporting a CSV')
    downloadText('starred_repo_lists.csv', buildStarredRepoListsCsv(catalog.value))
  }

  return {
    username,
    token,
    catalog,
    error,
    status,
    loading,
    reloadToken,
    saveUsername,
    saveToken,
    fetchCatalog,
    downloadReposCsv,
    downloadListsCsv,
  }
}
