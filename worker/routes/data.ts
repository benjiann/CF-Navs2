import { Hono } from 'hono'
import type { Context } from 'hono'
import { ErrCode, type ImportReq, type ImportResp } from '../../shared/types'
import { invalidatePublicDataCache, invalidateSiteConfigCache } from '../lib/cache'
import { getSettings, importData, touchDataVersion } from '../lib/db'
import { validateImportPayload } from '../lib/importValidation'
import { fail, ok } from '../lib/response'
import { invalidateRuntimeDataCache } from '../lib/runtimeCache'
import type { HonoEnv } from '../types'

type AppContext = Context<HonoEnv>

function badRequest(c: AppContext, msg: string) {
  return c.json(fail(ErrCode.BAD_REQUEST, msg))
}

async function readJson<T>(c: AppContext): Promise<T | null> {
  try {
    return await c.req.json<T>()
  } catch {
    return null
  }
}

export const dataRoutes = new Hono<HonoEnv>()

dataRoutes.post('/import', async (c) => {
  const body = await readJson<ImportReq>(c)
  const validation = validateImportPayload(body)
  if (!validation.ok) return badRequest(c, validation.message)
  const payload = validation.payload

  try {
    const result = await importData(c.env.DB, {
      categories: payload.categories,
      bookmarks: payload.bookmarks,
      settings: payload.settings,
    })
    const settings = await getSettings(c.env.DB)
    const version = await touchDataVersion(c.env.DB)
    const data = {
      categories: result.importedCategories,
      bookmarks: result.importedBookmarks,
      settings,
      version,
    }
    invalidateRuntimeDataCache()
    invalidatePublicDataCache(c, c.req.url)
    invalidateSiteConfigCache(c, c.req.url)
    return c.json(ok<ImportResp>({ categories: result.categories, bookmarks: result.bookmarks, data }))
  } catch {
    return c.json(fail(ErrCode.SERVER_ERROR, 'failed to import data'))
  }
})

export default dataRoutes
