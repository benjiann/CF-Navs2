import type { Env } from '../types'

const PREFIX = 'rl:error-report:'
const MAX_REQUESTS = 12
const WINDOW_SECONDS = 60
type RateState = { count: number; resetAt: number }

export async function consumeErrorReportQuota(env: Env, ip: string, now = Date.now()): Promise<boolean> {
  const storageKey = `${PREFIX}${encodeURIComponent(ip || 'unknown')}`
  const raw = await env.SESSION.get(storageKey)
  let state: RateState | null = null
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<RateState>
      if (typeof parsed.count === 'number' && typeof parsed.resetAt === 'number') state = { count: parsed.count, resetAt: parsed.resetAt }
    } catch { state = null }
  }
  if (state && state.resetAt > now && state.count >= MAX_REQUESTS) return false
  const next = state && state.resetAt > now ? { count: state.count + 1, resetAt: state.resetAt } : { count: 1, resetAt: now + WINDOW_SECONDS * 1000 }
  await env.SESSION.put(storageKey, JSON.stringify(next), { expirationTtl: Math.max(1, Math.ceil((next.resetAt - now) / 1000)) })
  return true
}
