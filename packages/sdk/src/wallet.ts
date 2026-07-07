import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'

const WALLET_DIR = join(homedir(), '.adline')
const WALLET_PATH = join(WALLET_DIR, 'wallet.json')
const WALLET_TMP = join(WALLET_DIR, 'wallet.tmp')

interface Wallet {
  total: number
}

function read(): Wallet {
  try {
    return JSON.parse(readFileSync(WALLET_PATH, 'utf8')) as Wallet
  } catch {
    return { total: 0 }
  }
}

export function increment(delta: number): void {
  try {
    mkdirSync(WALLET_DIR, { recursive: true })
    const wallet = read()
    wallet.total = (wallet.total ?? 0) + delta
    // Atomic write: tmp → rename
    writeFileSync(WALLET_TMP, JSON.stringify(wallet), 'utf8')
    renameSync(WALLET_TMP, WALLET_PATH)
  } catch {
    // Swallow silently per spec — credits not redeemable at MVP
    if (process.env['DEBUG']?.includes('adline')) {
      process.stderr.write(`[adline] wallet write failed\n`)
    }
  }
}
