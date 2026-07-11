import { describe, expect, it } from 'vitest'
import { consumeErrorReportQuota } from '../../worker/lib/errorReportRateLimit'

class MemoryKv {
  items = new Map<string, string>()
  async get(key: string): Promise<string | null> { return this.items.get(key) ?? null }
  async put(key: string, value: string): Promise<void> { this.items.set(key, value) }
}

describe('error report rate limit', () => {
  it('allows twelve requests per IP and resets after the window', async () => {
    const kv = new MemoryKv()
    const env = { SESSION: kv } as never
    for (let index = 0; index < 12; index += 1) expect(await consumeErrorReportQuota(env, '203.0.113.1', 1000)).toBe(true)
    expect(await consumeErrorReportQuota(env, '203.0.113.1', 1000)).toBe(false)
    expect(await consumeErrorReportQuota(env, '203.0.113.1', 61_001)).toBe(true)
  })

  it('keeps independent counters per IP', async () => {
    const kv = new MemoryKv()
    const env = { SESSION: kv } as never
    expect(await consumeErrorReportQuota(env, '203.0.113.1', 1000)).toBe(true)
    expect(await consumeErrorReportQuota(env, '203.0.113.2', 1000)).toBe(true)
    expect(kv.items.size).toBe(2)
  })
})
