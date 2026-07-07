// Structured JSON-lines logger. One line per event so Fly log drains /
// grep-based alerting can key on `event` without parsing prose.
type Level = 'info' | 'warn' | 'error'

function emit(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields })
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, err?: unknown, fields?: Record<string, unknown>) =>
    emit('error', event, { ...fields, message: err instanceof Error ? err.message : err === undefined ? undefined : String(err) }),
}
