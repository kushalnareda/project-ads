import { Hono } from 'hono'
import { config } from './config.js'
import { logImpression, registerPublisher } from './r2.js'

const app = new Hono()

const SURFACE_CREDITS: Record<string, number> = {
  'claude-code-spinner': config.ad.credits.spinner,
  'claude-code-statusline': config.ad.credits.statusLine,
}

app.post('/v1/impression', async (c) => {
  let body: { surface?: unknown; sdk_version?: unknown; publisher_token?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.surface !== 'string' || !body.surface) {
    return c.json({ error: 'surface is required' }, 400)
  }

  const credits_delta = SURFACE_CREDITS[body.surface] ?? config.ad.credits.default

  const impression = {
    surface: body.surface,
    sdk_version: typeof body.sdk_version === 'string' ? body.sdk_version : 'unknown',
    ad_text: config.ad.text,
    url: config.ad.url,
    credits_delta,
    timestamp: new Date().toISOString(),
    tool: 'claude-code',
    publisher_token: typeof body.publisher_token === 'string' ? body.publisher_token : null,
  }

  void logImpression(impression)

  return c.json({
    ad_text: config.ad.text,
    url: config.ad.url,
    credits_delta,
  })
})

app.post('/v1/publisher/register', async (c) => {
  let body: { email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return c.json({ error: 'valid email is required' }, 400)
  }

  try {
    const publisher = await registerPublisher(body.email)
    return c.json({ token: publisher.token, registered_at: publisher.registered_at })
  } catch (err) {
    console.error('[register]', err instanceof Error ? err.message : err)
    return c.json({ error: 'registration failed' }, 500)
  }
})

app.get('/health', (c) => c.json({ ok: true }))

export default app
