import { CONNECTOR_REGISTRY } from '../../plugins/connectors/registry'
import { isConnectorEnabled, loadConnectorSettings, setConnectorEnabled } from '../../plugins/connectors/connector-store'
import { listConnectorStatuses } from '../../plugins/connectors/connector-runtime'
import type { ConnectorId } from '../../plugins/connectors/types'
import { setSecret } from '../services/secret-vault'

export function useConnectors() {
  const settings = useState('ubermensch-connector-settings', () => loadConnectorSettings())
  const statuses = ref<Awaited<ReturnType<typeof listConnectorStatuses>>>([])
  const busy = ref(false)
  const error = ref('')

  async function refresh() {
    busy.value = true
    error.value = ''
    try {
      settings.value = loadConnectorSettings()
      statuses.value = await listConnectorStatuses()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to load connectors'
    } finally {
      busy.value = false
    }
  }

  function toggle(id: ConnectorId, enabled: boolean) {
    settings.value = setConnectorEnabled(id, enabled)
    return refresh()
  }

  async function saveCredential(key: string, value: string) {
    await setSecret(key, value)
    return refresh()
  }

  const catalog = computed(() => CONNECTOR_REGISTRY)

  return {
    catalog,
    settings,
    statuses,
    busy,
    error,
    refresh,
    toggle,
    saveCredential,
    isEnabled: (id: ConnectorId) => isConnectorEnabled(id),
  }
}
