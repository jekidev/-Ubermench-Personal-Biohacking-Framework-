export type RetryOptions = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

export async function withHealthSyncRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 250
  const maxDelayMs = options.maxDelayMs ?? 4000
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === attempts - 1) break
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
