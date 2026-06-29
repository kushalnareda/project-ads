interface Ad {
  adText: string
  url: string
}

function supportsOsc8(): boolean {
  const term = process.env['TERM_PROGRAM'] ?? ''
  const colorterm = process.env['COLORTERM'] ?? ''
  // Terminals known to support OSC 8 hyperlinks
  return (
    term === 'iTerm.app' ||
    term === 'WezTerm' ||
    term === 'ghostty' ||
    colorterm === 'truecolor' ||
    colorterm === 'truecolor'
  )
}

export function render(ad: Ad): void {
  if (!process.stderr.isTTY) return

  let line: string
  if (supportsOsc8()) {
    // OSC 8 hyperlink: \x1b]8;;<url>\x1b\\ <text> \x1b]8;;\x1b\\
    line = `[ad] ${ad.adText} \x1b]8;;${ad.url}\x1b\\→ ${ad.url}\x1b]8;;\x1b\\\n`
  } else {
    line = `[ad] ${ad.adText} → ${ad.url}\n`
  }

  process.stderr.write(line)
}
