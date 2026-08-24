export interface ValidatedToolResult {
  value: unknown
  serialized: string
  bytes: number
}

const MAX_RESULT_BYTES = 256 * 1024
const MAX_DEPTH = 8

function assertJsonSafe(value: unknown, depth = 0): void {
  if (depth > MAX_DEPTH) throw new Error('Tool result rejected: maximum nesting depth exceeded.')
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return
  if (typeof value !== 'object') throw new Error('Tool result rejected: non-JSON value.')
  if (Array.isArray(value)) {
    for (const item of value) assertJsonSafe(item, depth + 1)
    return
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key.length > 1024) throw new Error('Tool result rejected: property name too long.')
    assertJsonSafe(item, depth + 1)
  }
}

export function validateToolResult(value: unknown): ValidatedToolResult {
  assertJsonSafe(value)
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  const bytes = new TextEncoder().encode(serialized).byteLength
  if (bytes > MAX_RESULT_BYTES) throw new Error(`Tool result rejected: ${bytes} bytes exceeds ${MAX_RESULT_BYTES} byte limit.`)
  return { value, serialized, bytes }
}
