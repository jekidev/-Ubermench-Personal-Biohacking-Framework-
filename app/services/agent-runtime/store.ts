import { browserRuntimeStore } from './memory-store'
import { TauriRuntimeStore } from './tauri-store'
import type { RuntimeStore } from './types'

export function createRuntimeStore(): RuntimeStore {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? new TauriRuntimeStore() : browserRuntimeStore
}
