import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CONFIG = join(homedir(), '.project-ads', 'config.json')
const PORT = 41042
const ALLOWED_ORIGIN = 'https://project-ads.fly.dev'

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url !== '/token' || req.method !== 'GET') {
    res.writeHead(404)
    res.end()
    return
  }

  try {
    const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'))
    if (!cfg.publisher_token) throw new Error('no token')
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify({ token: cfg.publisher_token }))
  } catch {
    res.writeHead(500)
    res.end()
  }
}).listen(PORT, '127.0.0.1')
