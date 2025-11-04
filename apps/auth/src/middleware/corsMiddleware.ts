import { Context, MiddlewareHandler } from 'hono'

export const corsMiddleware: MiddlewareHandler = async (c: Context, next: () => Promise<void>) => {
  // Set CORS headers
  const allowedOrigins = [
    'http://localhost:3000',
    'https://outs-www.vercel.app',
    'capacitor://deno.dev',
    'https://deno.dev',
    'https://outs-sw.loca.lt',
    'https://outs.tand.ing',
    'https://server-new.onedrawtwo.com',
  ]

  const origin = c.req.header('Origin')
  
  if (origin && allowedOrigins.includes(origin)) {
    c.res.headers.set('Access-Control-Allow-Origin', origin)
    c.res.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
  c.res.headers.set('Access-Control-Expose-Headers', 'Content-Length')
  c.res.headers.set('Access-Control-Max-Age', '600')

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  await next()
}