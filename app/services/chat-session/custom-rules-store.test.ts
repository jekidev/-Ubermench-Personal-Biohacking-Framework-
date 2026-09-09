import { describe, expect, it } from 'vitest'
import { addCustomChatRule, loadCustomChatRules, removeCustomChatRule } from './custom-rules-store'

describe('custom-rules-store', () => {
  it('adds and removes custom rules', () => {
    const storage = new Map<string, string>()
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }
    const created = addCustomChatRule({
      name: 'No stimulants after 14:00',
      description: 'Sleep hygiene',
      prompt: 'Never suggest caffeine or stimulants after 14:00 local time.',
    }, store)
    expect(created).toHaveLength(1)
    expect(loadCustomChatRules(store)[0]?.custom).toBe(true)
    removeCustomChatRule(created[0]!.id, store)
    expect(loadCustomChatRules(store)).toHaveLength(0)
  })
})
