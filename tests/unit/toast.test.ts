import { describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { createToastStore, toastStore } from '../../src/lib/toast'

describe('toast store', () => {
  it('starts with an empty list', () => {
    const store = createToastStore()
    expect(get(store)).toEqual([])
  })

  it('adds toasts with unique ids', () => {
    const store = createToastStore()
    const id1 = store.addToast('first', 'success')
    const id2 = store.addToast('second', 'error')

    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^toast-/)
    expect(id2).toMatch(/^toast-/)

    const items = get(store)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ type: 'success', message: 'first' })
    expect(items[1]).toMatchObject({ type: 'error', message: 'second' })
  })

  it('dismisses toasts by id', () => {
    const store = createToastStore()
    store.addToast('keep', 'info')
    const id = store.addToast('remove', 'success')
    store.addToast('also keep', 'error')

    store.dismissToast(id)

    const items = get(store)
    expect(items).toHaveLength(2)
    expect(items.every((item) => item.id !== id)).toBe(true)
  })

  it('defaults to info type', () => {
    const store = createToastStore()
    store.addToast('message')
    expect(get(store)[0].type).toBe('info')
  })

  it('does not throw when dismissing a non-existent id', () => {
    const store = createToastStore()
    store.addToast('only')
    store.dismissToast('nonexistent')
    expect(get(store)).toHaveLength(1)
  })
})
