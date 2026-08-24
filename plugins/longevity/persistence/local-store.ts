export type LocalSourceDocument = {
  id: string
  sha256: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  localOnly: true
}

export type LocalObservation = {
  id: string
  sourceDocumentId: string
  biomarker: string
  value: number
  unit: string
  collectedAt: string
  laboratory?: string
  referenceLow?: number
  referenceHigh?: number
  confidence: number
  locator?: string
}

export type LocalGeneticVariant = {
  id: string
  sourceDocumentId: string
  gene?: string
  rsid?: string
  chromosome?: string
  position?: number
  genotype: string
  importedAt: string
}

export type LongevityLocalStore = {
  schemaVersion: 1
  documents: LocalSourceDocument[]
  observations: LocalObservation[]
  variants: LocalGeneticVariant[]
}

const STORAGE_KEY = 'ubermench:longevity:v1'

export function emptyLongevityStore(): LongevityLocalStore {
  return { schemaVersion: 1, documents: [], observations: [], variants: [] }
}

export function loadLongevityStore(storage: Pick<Storage, 'getItem'>): LongevityLocalStore {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return emptyLongevityStore()
  try {
    const parsed = JSON.parse(raw) as LongevityLocalStore
    if (parsed.schemaVersion !== 1) return emptyLongevityStore()
    return parsed
  } catch {
    return emptyLongevityStore()
  }
}

export function saveLongevityStore(storage: Pick<Storage, 'setItem'>, store: LongevityLocalStore): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function appendDocument(store: LongevityLocalStore, document: LocalSourceDocument): LongevityLocalStore {
  if (store.documents.some((item) => item.sha256 === document.sha256)) return store
  return { ...store, documents: [...store.documents, document] }
}

export function appendObservations(store: LongevityLocalStore, observations: LocalObservation[]): LongevityLocalStore {
  const seen = new Set(store.observations.map((item) => item.id))
  const fresh: LocalObservation[] = []
  for (const item of observations) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    fresh.push(item)
  }
  return fresh.length ? { ...store, observations: [...store.observations, ...fresh] } : store
}

export function appendVariants(store: LongevityLocalStore, variants: LocalGeneticVariant[]): LongevityLocalStore {
  const seen = new Set(store.variants.map((item) => item.id))
  const fresh: LocalGeneticVariant[] = []
  for (const item of variants) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    fresh.push(item)
  }
  return fresh.length ? { ...store, variants: [...store.variants, ...fresh] } : store
}

export { STORAGE_KEY }
