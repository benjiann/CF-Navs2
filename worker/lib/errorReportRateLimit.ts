import type { Env } from '../types'

const PREFIX = 'rl:error-report:'
const MAX_REQUESTS = 12
const WINDOW_SECONDS = 60
const MEMORY_MAX_ENTRIES = 512
type RateState = { count: number; resetAt: number }
const memoryStates = new Map<string, RateState>()

function pruneMemory(now: number): void {
  for (const [key, state] of memoryStates) {
    if (state.resetAt <= now) memoryStates.delete(key)
  }
  while (memoryStates.size > MEMORY_MAX_ENTRIES) {
    const oldest = memoryStates.keys().next().value as string | undefined
    if (!oldest) break
    memoryStates.delete(oldest)
  }
}

export function clearErrorReportRateLimitMemory(): void {
  memoryStates.clear()
}

export async function consumeErrorReportQuota(env: Env, ip: string, now = Date.now()): Promise<boolean> {
  const storageKey = `${PREFIX}${encodeURIComponent(ip || 'unknown')}`
  pruneMemory(now)
  const memoryState = memoryStates.get(storageKey)
  if (memoryState && memoryState.resetAt > now && memoryState.count >= MAX_REQUESTS) return false

  const raw = await env.SESSION.get(storageKey)
  let state: RateState | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<RateState>
      if (typeof parsed.count === 'number' && typeof parsed.resetAt === 'number') state = { count: parsed.count, resetAt: parsed.resetAt }
    } catch { state = null }
  }
  const current = memoryState && memoryState.resetAt > now
    ? memoryState
    : state && state.resetAt > now ? state : null
  if (current && current.count >= MAX_REQUESTS) return false
  const next = current ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: now + WINDOW_SECONDS * 1000 }
  memoryStates.set(storageKey, next)
  await env.SESSION.put(storageKey, JSON.stringify(next), { expirationTtl: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) })
  return true
}
