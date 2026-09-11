import bundledCatalog from '~/data/starchive/catalog.json'
import type { StarchiveCatalog, StarchiveSearchOptions, StarchiveSearchResult } from '../../plugins/starchive/types'
import { searchStarchiveCatalog } from '../../plugins/starchive/catalog-loader'

const STORAGE_KEY = 'ubermensch-starchive-catalog'

type StarchiveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StarchiveStorage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

function parseStoredCatalog(raw: string): StarchiveCatalog | null {
  try {
    const parsed = JSON.parse(raw) as StarchiveCatalog
    if (!parsed?.username || !Array.isArray(parsed.repos)) return null
    return parsed
  } catch {
    return null
  }
}

export function loadBundledStarchiveCatalog(): StarchiveCatalog {
  return bundledCatalog as StarchiveCatalog
}

export function loadStoredStarchiveCatalog(storage: StarchiveStorage | undefined = defaultStorage()): StarchiveCatalog | null {
  if (!storage) return null
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  return parseStoredCatalog(raw)
}

export function saveStarchiveCatalog(
  catalog: StarchiveCatalog,
  storage: StarchiveStorage | undefined = defaultStorage(),
): void {
  if (!storage) return
  storage.setItem(STORAGE_KEY, JSON.stringify(catalog))
}

export function clearStoredStarchiveCatalog(storage: StarchiveStorage | undefined = defaultStorage()): void {
  storage?.removeItem(STORAGE_KEY)
}

export function resolveActiveStarchiveCatalog(storage: StarchiveStorage | undefined = defaultStorage()): {
  catalog: StarchiveCatalog
  source: 'bundled' | 'refreshed'
} {
  const stored = loadStoredStarchiveCatalog(storage)
  if (stored) return { catalog: stored, source: 'refreshed' }
  return { catalog: loadBundledStarchiveCatalog(), source: 'bundled' }
}

export function searchActiveStarchive(
  options: StarchiveSearchOptions = {},
  storage: StarchiveStorage | undefined = defaultStorage(),
): StarchiveSearchResult {
  const { catalog, source } = resolveActiveStarchiveCatalog(storage)
  const result = searchStarchiveCatalog(catalog, options)
  return { ...result, source }
}
