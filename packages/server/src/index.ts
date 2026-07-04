import { serve } from '@hono/node-server'
import { config } from './config.js'
import app from './app.js'

const port = config.port
console.log(`ad server listening on :${port}`)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
