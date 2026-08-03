import { describe, it, expect } from 'vitest'
import vm from 'node:vm'
import { LANDING_HTML } from './landing.js'

// LANDING_HTML is a template literal containing a browser <script>. A `\'`
// written inside that template literal is consumed by the template literal
// itself, so the browser receives a bare `'` that terminates the JS string —
// a syntax error that silently kills every script on the page (copy button,
// terminal demo, stats). These tests catch that class of bug at build time.

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  )
}

describe('landing page inline scripts', () => {
  const scripts = inlineScripts(LANDING_HTML)

  it('contains at least one inline script', () => {
    expect(scripts.length).toBeGreaterThan(0)
  })

  it('every inline script parses as valid JavaScript', () => {
    for (const [i, src] of scripts.entries()) {
      expect(
        () => new vm.Script(src),
        `inline script #${i} has a syntax error — the whole page's JS would be dead`,
      ).not.toThrow()
    }
  })

  it('defines the handlers referenced by inline event attributes', () => {
    const referenced = new Set(
      [...LANDING_HTML.matchAll(/on\w+="(\w+)\(/g)].map((m) => m[1]),
    )
    expect(referenced.size).toBeGreaterThan(0)
    const all = scripts.join('\n')
    for (const fn of referenced) {
      expect(all, `${fn}() is wired to an inline handler but never defined`).toMatch(
        new RegExp(`function\\s+${fn}\\s*\\(`),
      )
    }
  })
})
