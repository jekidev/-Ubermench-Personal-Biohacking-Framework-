import { isConnectorActivatable, loadConnectorSettings, setConnectorEnabled } from '../../plugins/connectors/connector-store'
import type { ConnectorId } from '../../plugins/connectors/types'
import type { ConnectorSettings } from '../../plugins/connectors/connector-store'

export const CONNECTOR_SETTINGS_STATE_KEY = 'ubermensch-connector-settings'

export function useConnectorSettingsState() {
  return useState<ConnectorSettings>(CONNECTOR_SETTINGS_STATE_KEY, () => loadConnectorSettings())
}

export function useConnectorEnablement() {
  const settings = useConnectorSettingsState()

  function isEnabled(id: ConnectorId) {
    if (!isConnectorActivatable(id)) return false
    return settings.value.enabled[id] ?? false
  }

  function setEnabled(id: ConnectorId, enabled: boolean) {
    settings.value = setConnectorEnabled(id, enabled)
    return settings.value
  }

  return { settings, isEnabled, setEnabled }
}
