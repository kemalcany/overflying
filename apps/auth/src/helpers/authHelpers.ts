import { create, verify, getNumericDate, Payload } from 'djwt'
import { Context, MiddlewareHandler } from 'hono'
import { User, UserResponse, prepareUserResponse, updateUserRefreshToken } from './dbHelpers.ts'
import { hashRefreshToken } from './bcryptHelpers.ts'
import { Pool } from 'postgres'

export interface EnvVars {
  DATABASE_URL: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  JWT_ACCESS_EXPIRE: number
  JWT_REFRESH_EXPIRE: number
  ENVIRONMENT: string
}

const getKey = async (secretKey: string): Promise<CryptoKey> =>
  await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )

const getPayload = (user: User, expDuration: number) => ({
  email: user.email,
  sub: user.id,
  role: user.role,
  exp: getNumericDate(expDuration)
})

export const generateTokens = async (user: User, envVars: EnvVars) => {
  const accessToken = await create(
    { alg: 'HS256', typ: 'JWT' },
    getPayload(user, envVars.JWT_ACCESS_EXPIRE),
    await getKey(envVars.JWT_ACCESS_SECRET)
  )
  const refreshToken = await create(
    { alg: 'HS256', typ: 'JWT' },
    getPayload(user, envVars.JWT_REFRESH_EXPIRE),
    await getKey(envVars.JWT_REFRESH_SECRET)
  )
  return { accessToken, refreshToken }
}

export const generateAuthResponse = async (
  user: User,
  envVars: EnvVars,
  pool: Pool
): Promise<{
  success: boolean
  data: {
    user: UserResponse
    accessToken: string
    refreshToken: string
  }
}> => {
  const { accessToken, refreshToken } = await generateTokens(user, envVars)

  const hashedRefreshToken = await hashRefreshToken(refreshToken)
  await updateUserRefreshToken(pool, user.id, hashedRefreshToken)

  const userResponse = prepareUserResponse(user)
  return { success: true, data: { user: userResponse, accessToken, refreshToken } }
}

export const verifyToken = async (token: string, secret: string): Promise<Payload | null> => {
  try {
    const key = await getKey(secret)
    const payload = await verify(token, key)
    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export type AppVariables = {
  Variables: {
    userId: string
    pool: Pool
  }
}

export const authReq = (envVars: EnvVars): MiddlewareHandler<AppVariables> => {
  return async (c: Context<AppVariables>, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization')
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    if (!accessToken) return c.json({ success: false, message: 'No access token provided' }, 401)
    try {
      const verifiedToken = await verifyToken(accessToken, envVars.JWT_ACCESS_SECRET)
      if (!verifiedToken) return c.json({ success: false, message: 'Invalid token' }, 401)
      c.set('userId', verifiedToken.sub as string)
      await next()
    } catch (_) {
      return c.json({ success: false, message: 'Unauthenticated request' }, 401)
    }
  }
}
