const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{16,}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bBearer\s+[A-Za-z0-9._~-]{16,}\b/i,
  /\bgarm[in]?[-_]?access[-_]?token\b/i,
]

const SENSITIVE_KEY_PATTERN = /token|secret|password|api[-_]?key|authorization|refresh/i

export function containsLikelySecret(value: unknown, path = 'root'): string[] {
  const hits: string[] = []
  if (typeof value === 'string') {
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(value)) hits.push(path)
    }
    return hits
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...containsLikelySecret(item, `${path}[${index}]`))
    })
    return hits
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = `${path}.${key}`
      if (SENSITIVE_KEY_PATTERN.test(key) && typeof nested === 'string' && nested.trim()) {
        hits.push(nextPath)
      }
      hits.push(...containsLikelySecret(nested, nextPath))
    }
  }
  return hits
}

export function assertNoSecretsInExport(label: string, value: unknown): void {
  const hits = containsLikelySecret(value)
  if (hits.length) {
    throw new Error(`${label} contains sensitive values at ${hits.slice(0, 3).join(', ')}`)
  }
}
