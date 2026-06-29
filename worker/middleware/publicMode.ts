import type { MiddlewareHandler } from 'hono'
import { ErrCode } from '../../shared/types'
import { getSettings } from '../lib/db'
import { fail } from '../lib/response'
import type { HonoEnv } from '../types'
import { extractBearerToken, validateSession } from './auth'

export const publicOrAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const settings = await getSettings(c.env.DB)
  c.set('publicSettings', settings)
  if (settings.public_mode) {
    await next()
    return
  }

  const token = extractBearerToken(c.req.header('Authorization'))
  if (!token) {
    return c.json(fail(ErrCode.FORBIDDEN, 'forbidden'))
  }

  const session = await validateSession(c.env, token)
  if (!session) {
    return c.json(fail(ErrCode.FORBIDDEN, 'forbidden'))
  }

  c.set('username', session.username)
  await next()
}
