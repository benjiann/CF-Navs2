import { writable } from 'svelte/store'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  type: ToastType
  message: string
}

export type ToastStore = {
  subscribe: ReturnType<typeof writable<ToastItem[]>>['subscribe']
  addToast: (message: string, type?: ToastType) => string
  dismissToast: (id: string) => void
}

export function createToastStore(): ToastStore {
  const { subscribe, update } = writable<ToastItem[]>([])
  let nextId = 0

  function addToast(message: string, type: ToastType = 'info'): string {
    const id = `toast-${++nextId}-${Date.now()}`
    const item: ToastItem = { id, type, message }
    update((items) => [...items, item])
    return id
  }

  function dismissToast(id: string): void {
    update((items) => items.filter((item) => item.id !== id))
  }

  return { subscribe, addToast, dismissToast }
}

export const toastStore = createToastStore()
