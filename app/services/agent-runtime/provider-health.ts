export type ProviderHealthState = 'healthy' | 'degraded' | 'open'

export interface ProviderHealth {
  provider: string
  state: ProviderHealthState
  failures: number
  successes: number
  openedAt?: number
  cooldownMs: number
}

const DEFAULT_COOLDOWN_MS = 30_000
const FAILURE_THRESHOLD = 3

export class ProviderHealthRegistry {
  private readonly entries = new Map<string, ProviderHealth>()

  get(provider: string): ProviderHealth {
    return this.entries.get(provider) ?? {
      provider,
      state: 'healthy',
      failures: 0,
      successes: 0,
      cooldownMs: DEFAULT_COOLDOWN_MS,
    }
  }

  isAvailable(provider: string, now = Date.now()): boolean {
    const health = this.get(provider)
    if (health.state !== 'open') return true
    if (health.openedAt === undefined || now - health.openedAt >= health.cooldownMs) {
      health.state = 'degraded'
      health.openedAt = undefined
      this.entries.set(provider, health)
      return true
    }
    return false
  }

  recordSuccess(provider: string): void {
    const health = this.get(provider)
    health.successes += 1
    health.failures = 0
    health.state = 'healthy'
    health.openedAt = undefined
    this.entries.set(provider, health)
  }

  recordFailure(provider: string, now = Date.now()): void {
    const health = this.get(provider)
    health.failures += 1
    health.state = health.failures >= FAILURE_THRESHOLD ? 'open' : 'degraded'
    if (health.state === 'open') health.openedAt = now
    this.entries.set(provider, health)
  }

  snapshot(): ProviderHealth[] {
    return [...this.entries.values()].map((item) => ({ ...item }))
  }
}

export const providerHealth = new ProviderHealthRegistry()
