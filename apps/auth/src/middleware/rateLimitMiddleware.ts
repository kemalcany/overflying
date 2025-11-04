import { Context, MiddlewareHandler } from 'hono'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Simple in-memory rate limiter
// For production, consider using Redis or a distributed rate limiting solution
export const rateLimitMiddleware = (
  maxRequests: number = 5,
  windowMs: number = 60000, // 1 minute
): MiddlewareHandler => {
  return async (c: Context, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const now = Date.now()

    const entry = rateLimitStore.get(ip)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
      await next()
    } else if (entry.count < maxRequests) {
      // Increment count
      entry.count++
      await next()
    } else {
      // Rate limit exceeded
      return c.json(
        {
          success: false,
          message: 'Too many requests. Please try again later.',
        },
        429,
      )
    }
  }
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip)
    }
  }
}, 60000) // Cleanup every minute
