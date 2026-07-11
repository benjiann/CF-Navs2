import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin settings layout', () => {
  it('aligns the settings panel with category and bookmark content', () => {
    const source = readFileSync('src/components/admin/AdminTabContent.svelte', 'utf8')
    const settingsRule = source.match(/\.settings-panel-wrap\s*\{([^}]+)\}/)?.[1] ?? ''

    expect(settingsRule).toContain('width: 100%')
    expect(settingsRule).toContain('margin: 0 0 24px')
    expect(settingsRule).not.toContain('margin: 0 auto')
  })
})
