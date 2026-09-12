import {
  getLastPdfInspection,
  subscribePdfInspectCache,
  type CachedPdfInspection,
} from '../services/pdf-inspect-cache'

export const PDF_INSPECT_CACHE_STATE_KEY = 'ubermensch-pdf-inspect-last'

export function usePdfInspectCache() {
  const last = useState<CachedPdfInspection | null>(PDF_INSPECT_CACHE_STATE_KEY, () => null)

  function hydrate() {
    last.value = getLastPdfInspection()
    return last.value
  }

  if (import.meta.client) {
    hydrate()
    const unsubscribe = subscribePdfInspectCache((entry) => {
      last.value = entry
    })
    onScopeDispose(() => {
      unsubscribe()
    })
  }

  return { last, hydrate }
}
