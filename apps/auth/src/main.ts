import { Hono } from 'hono'
import type { Context } from 'hono'
import { connectToPostgres, getUserByEmail, getUserById } from './helpers/dbHelpers.ts'
import { comparePlainAndHash } from './helpers/bcryptHelpers.ts'
import {
  type AppVariables,
  authReq,
  type EnvVars,
  generateAuthResponse,
  verifyToken,
} from './helpers/authHelpers.ts'
import { corsMiddleware } from './middleware/corsMiddleware.ts'
import { config } from 'dotenv'
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware.ts'

// Load environment variables from .env.development in development mode
const loadDotEnv = (): Record<string, string> => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development'
  
  if (environment === 'development') {
    try {
      const envData = config({ path: "./.env.development" })
      console.log('Loaded .env.development successfully')
      return envData as Record<string, string>
    } catch (error) {
      console.warn('Failed to load .env.development:', error)
      return {}
    }
  }
  return {}
}

const dotEnvData = loadDotEnv()

// Helper function to get env variable with fallback to dotenv data
const getEnvVar = (key: string): string | undefined => {
  return Deno.env.get(key) || dotEnvData[key]
}

// Load environment variables
const loadEnvVars = (): EnvVars => {
  const environment = getEnvVar('ENVIRONMENT') || 'development'

  // Token expiration in seconds
  // Development: 10 minutes access, 7 days refresh
  // Production: 5 days access, 30 days refresh
  const accessExpire = environment === 'production' ? 432000 : 600 // 5 days : 10 minutes
  const refreshExpire = environment === 'production' ? 2592000 : 604800 // 30 days : 7 days

  // Get DATABASE_URL and convert psycopg2 format to standard postgres format
  let databaseUrl = getEnvVar('DATABASE_URL') || ''
  if (databaseUrl.startsWith('postgresql+psycopg2://')) {
    databaseUrl = databaseUrl.replace('postgresql+psycopg2://', 'postgresql://')
  }

  const jwtAccessSecret = getEnvVar('JWT_ACCESS_SECRET') || 'dev-access-secret-change-in-production'
  const jwtRefreshSecret = getEnvVar('JWT_REFRESH_SECRET') || 'dev-refresh-secret-change-in-production'

  return {
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRE: accessExpire,
    JWT_REFRESH_EXPIRE: refreshExpire,
    ENVIRONMENT: environment,
  }
}

const envVars = loadEnvVars()
console.log(`Starting auth service in ${envVars.ENVIRONMENT} mode`)
console.log(`Using DATABASE_URL: ${envVars.DATABASE_URL}`);
console.log(`Access token expiration: ${envVars.JWT_ACCESS_EXPIRE}s`)
console.log(`Refresh token expiration: ${envVars.JWT_REFRESH_EXPIRE}s`)

// Connect to Postgres
const pool = connectToPostgres(envVars.DATABASE_URL)

// Create Hono app
const app = new Hono<AppVariables>()

// Global middleware
app.use('/*', corsMiddleware)

// Store pool in context for all requests
app.use('/*', async (c: Context<AppVariables>, next: () => Promise<void>) => {
  c.set('pool', pool)
  await next()
})

/**
 * POST /login
 * Authenticates a user with email and password
 * Returns access token, refresh token, and user data
 */
app.post('/login', rateLimitMiddleware(5, 60000), async (c: Context<AppVariables>) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    if (!email || !password) {
      return c.json({ success: false, message: 'Email and password are required' }, 400)
    }

    const user = await getUserByEmail(pool, email)
    if (!user) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    const isPasswordValid = await comparePlainAndHash(password, user.password_hash)
    if (!isPasswordValid) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    return c.json(await generateAuthResponse(user, envVars, pool))
  } catch (error) {
    console.error('Login endpoint error:', error)
    return c.json({ success: false, message: 'Login failed' }, 500)
  }
})

/**
 * POST /refresh
 * Refreshes access and refresh tokens using a valid refresh token
 * Returns new access token, new refresh token, and user data
 */
app.post('/refresh', async (c: Context<AppVariables>) => {
  try {
    const body = await c.req.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return c.json({ success: false, message: 'No refresh token provided' }, 401)
    }

    const decodedRefreshToken = await verifyToken(refreshToken, envVars.JWT_REFRESH_SECRET)
    if (!decodedRefreshToken) {
      return c.json({ success: false, message: 'Invalid refresh token' }, 401)
    }

    const user = await getUserById(pool, decodedRefreshToken.sub as string)
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 401)
    }

    // Verify the refresh token matches the one stored in the database
    if (!user.current_hashed_refresh_token) {
      return c.json({ success: false, message: 'No refresh token on record' }, 401)
    }

    const isRefreshTokenValid = await comparePlainAndHash(
      refreshToken,
      user.current_hashed_refresh_token,
    )
    if (!isRefreshTokenValid) {
      return c.json({ success: false, message: 'Invalid refresh token' }, 401)
    }

    return c.json(await generateAuthResponse(user, envVars, pool))
  } catch (error) {
    console.error('Refresh token endpoint error:', error)
    return c.json({ success: false, message: 'Token refresh failed' }, 401)
  }
})

/**
 * POST /logout
 * Logs out a user (requires valid access token)
 * Clears the refresh token from the database
 */
app.post('/logout', authReq(envVars), async (c: Context<AppVariables>) => {
  try {
    const userId = c.get('userId')
    const pool = c.get('pool')

    // Clear the refresh token from the database
    const connection = await pool.connect()
    try {
      await connection.queryObject(
        'UPDATE users SET current_hashed_refresh_token = NULL, updated_at = now() WHERE id = $1',
        [userId],
      )
    } finally {
      connection.release()
    }

    return c.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout endpoint error:', error)
    return c.json({ success: false, message: 'Logout failed' }, 500)
  }
})

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (c: Context) => {
  return c.json({ success: true, message: 'Auth service is running' })
})

/**
 * GET /me
 * Returns the current user's information (requires valid access token)
 */
app.get('/me', authReq(envVars), async (c: Context<AppVariables>) => {
  try {
    const userId = c.get('userId')
    const pool = c.get('pool')

    const user = await getUserById(pool, userId)
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404)
    }

    const {
      password_hash: _password_hash,
      current_hashed_refresh_token: _current_hashed_refresh_token,
      ...userResponse
    } = user
    return c.json({ success: true, data: { user: userResponse } })
  } catch (error) {
    console.error('Me endpoint error:', error)
    return c.json({ success: false, message: 'Failed to fetch user data' }, 500)
  }
})

const port = Deno.env.get('PORT') ? parseInt(Deno.env.get('PORT')!) : 9100
console.log(`Auth service listening on port ${port}`)
Deno.serve({ port }, app.fetch)
