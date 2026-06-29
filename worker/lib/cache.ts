const PUBLIC_DATA_CACHE_PATH = '/api/public/data'
const PUBLIC_DATA_BROWSER_TTL = 30
const PUBLIC_DATA_EDGE_TTL = 120

function publicDataCacheRequest(urlLike: string): Request {
  const url = new URL(urlLike)
  url.pathname = PUBLIC_DATA_CACHE_PATH
  url.search = ''
  return new Request(url.toString(), { method: 'GET' })
}

function edgeCache(): Cache {
  return (caches as unknown as { default: Cache }).default
}

function waitUntil(c: unknown, promise: Promise<unknown>): void {
  const executionCtx = (c as { executionCtx?: ExecutionContext }).executionCtx
  if (executionCtx) {
    executionCtx.waitUntil(promise)
  }
}

export async function matchPublicDataCache(requestUrl: string): Promise<Response | undefined> {
  return await edgeCache().match(publicDataCacheRequest(requestUrl))
}

export function cachePublicDataResponse(c: unknown, requestUrl: string, response: Response): void {
  const cached = response.clone()
  cached.headers.set(
    'Cache-Control',
    `public, max-age=${PUBLIC_DATA_BROWSER_TTL}, s-maxage=${PUBLIC_DATA_EDGE_TTL}, stale-while-revalidate=300`,
  )
  waitUntil(c, edgeCache().put(publicDataCacheRequest(requestUrl), cached))
}

export function invalidatePublicDataCache(c: unknown, requestUrl: string): void {
  waitUntil(c, edgeCache().delete(publicDataCacheRequest(requestUrl)))
}
