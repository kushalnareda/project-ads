// MCP server — publisher earnings tools for project-ads
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const SERVER = process.env.PROJECT_ADS_URL_BASE ?? 'https://project-ads.fly.dev'
const CONFIG = join(homedir(), '.project-ads', 'config.json')
const WALLET = join(homedir(), '.project-ads', 'wallet.json')

function readJson(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

function publisherToken(): string | null {
  const token = readJson(CONFIG).publisher_token
  return typeof token === 'string' ? token : null
}

const server = new McpServer({ name: 'project-ads', version: '0.1.0' })

server.tool(
  'get_earnings',
  'Get your project-ads publisher earnings: total credits, impression count, and daily breakdown from the server ledger.',
  {},
  async () => {
    const token = publisherToken()
    if (!token) {
      return {
        content: [{ type: 'text' as const, text: 'Not registered. Run: npx @project-ads/setup' }],
      }
    }

    const res = await fetch(`${SERVER}/v1/publisher/earnings`, {
      headers: { authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return {
        content: [{ type: 'text' as const, text: `Failed to fetch earnings (HTTP ${res.status})` }],
        isError: true,
      }
    }

    const data = await res.json()
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
  },
)

server.tool(
  'get_local_wallet',
  'Read the local offline wallet cache (~/.project-ads/wallet.json). May lag behind the server ledger.',
  {},
  async () => {
    const wallet = readJson(WALLET)
    return { content: [{ type: 'text' as const, text: JSON.stringify(wallet, null, 2) }] }
  },
)

server.tool(
  'get_earnings_for_day',
  'Get impressions and credits earned on a specific day (YYYY-MM-DD).',
  { day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
  async ({ day }) => {
    const token = publisherToken()
    if (!token) {
      return {
        content: [{ type: 'text' as const, text: 'Not registered. Run: npx @project-ads/setup' }],
      }
    }

    const res = await fetch(`${SERVER}/v1/publisher/earnings`, {
      headers: { authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return {
        content: [{ type: 'text' as const, text: `Failed to fetch earnings (HTTP ${res.status})` }],
        isError: true,
      }
    }

    const data = await res.json() as { daily?: Record<string, unknown> }
    const entry = data.daily?.[day] ?? { credits: 0, impressions: 0 }
    return { content: [{ type: 'text' as const, text: JSON.stringify({ day, ...entry }, null, 2) }] }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
