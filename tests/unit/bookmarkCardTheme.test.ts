import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('bookmark card theme styles', () => {
  it('uses backdrop blur on both card variants for the glass surface', () => {
    const compact = readFileSync('src/components/BookmarkCardCompact.svelte', 'utf8')
    const info = readFileSync('src/components/BookmarkCardInfo.svelte', 'utf8')

    expect(compact).toContain('backdrop-filter: blur(18px) saturate(135%);')
    expect(info).toContain('backdrop-filter: blur(18px) saturate(135%);')
  })

  it('keeps compact card titles readable in dark mode', () => {
    const source = readFileSync('src/components/BookmarkCardCompact.svelte', 'utf8')

    expect(source).toContain(":global([data-theme='dark']) .bookmark-icon-title")
    expect(source).toContain('color: var(--card-text-color, #e5eefb);')
  })

  it('keeps information card titles readable in dark mode', () => {
    const source = readFileSync('src/components/BookmarkCardInfo.svelte', 'utf8')

    expect(source).toContain(":global([data-theme='dark']) .bookmark-card-info .bookmark-title")
    expect(source).toContain('color: var(--card-text-color, #e5eefb);')
  })

  it('keeps light-mode bookmark descriptions above normal-text contrast', () => {
    const source = readFileSync('src/components/BookmarkCardInfo.svelte', 'utf8')

    expect(source).toContain('color: var(--card-text-color, #475569);')
    expect(source).toContain('opacity: 0.88;')
  })
})
