import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { config } from './config.js'
import { logImpression } from './r2.js'

const app = new Hono()

app.post('/v1/impression', async (c) => {
  let body: { surface?: unknown; sdk_version?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.surface !== 'string' || !body.surface) {
    return c.json({ error: 'surface is required' }, 400)
  }

  const impression = {
    surface: body.surface,
    sdk_version: typeof body.sdk_version === 'string' ? body.sdk_version : 'unknown',
    ad_text: config.ad.text,
    url: config.ad.url,
    credits_delta: config.ad.creditsDelta,
    timestamp: new Date().toISOString(),
  }

  // Fire-and-forget R2 write — never block the response
  void logImpression(impression)

  return c.json({
    ad_text: config.ad.text,
    url: config.ad.url,
    credits_delta: config.ad.creditsDelta,
  })
})

app.get('/health', (c) => c.json({ ok: true }))

const port = config.port
console.log(`ad server listening on :${port}`)
serve({ fetch: app.fetch, port })
