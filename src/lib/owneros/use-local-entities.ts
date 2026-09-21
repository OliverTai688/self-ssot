"use client"

import * as React from "react"

export interface LocalEntity {
  id: string
}

interface UseLocalEntitiesOptions {
  /** localStorage key. Omit to keep the list in-memory only (resets on reload). */
  storageKey?: string
  /** Simulated network latency in ms, so loading affordances behave like a real API call. */
  latencyMs?: number
}

export interface LocalEntityStore<T extends LocalEntity> {
  items: T[]
  isPending: boolean
  /** Add a new row. Shaped like a future `POST /api/...` call. */
  create: (item: T) => Promise<void>
  /** Patch an existing row by id. Shaped like a future `PATCH /api/.../:id` call. */
  update: (id: string, patch: Partial<T>) => Promise<void>
  /** Remove a row by id. Shaped like a future `DELETE /api/.../:id` call. */
  remove: (id: string) => Promise<void>
  /** Replace the whole list (e.g. reset to defaults). Not persisted through the simulated latency. */
  replaceAll: (items: T[]) => void
}

function readStorage<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

function writeStorage<T>(key: string, items: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Local rehearsal store only — ignore quota/serialization errors.
  }
}

/**
 * Local, browser-only CRUD store for admin/settings panels that don't have a
 * backend yet. Every action is async and shaped like a future
 * `fetch("/api/...")` call, so wiring a real API later means replacing the
 * body of create/update/remove — not the call sites in the UI. Persists to
 * localStorage (per `storageKey`) so edits survive a refresh during
 * rehearsal; this is explicitly NOT a source of truth once a real backend
 * exists.
 */
export function useLocalEntities<T extends LocalEntity>(
  seedItems: T[],
  options: UseLocalEntitiesOptions = {}
): LocalEntityStore<T> {
  const { storageKey, latencyMs = 220 } = options
  const [items, setItems] = React.useState<T[]>(seedItems)
  const [isPending, setIsPending] = React.useState(false)
  const hydrated = React.useRef(false)

  React.useEffect(() => {
    if (!storageKey || hydrated.current) return
    hydrated.current = true
    // Deferred to a microtask so this doesn't setState synchronously inside
    // the effect body (react-hooks/set-state-in-effect).
    window.queueMicrotask(() => {
      const stored = readStorage<T>(storageKey)
      if (stored) setItems(stored)
    })
  }, [storageKey])

  const create = React.useCallback(
    async (item: T) => {
      setIsPending(true)
      // TODO(api): replace with `await fetch("/api/...", { method: "POST", body: JSON.stringify(item) })`
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
      setItems((current) => {
        const next = [...current, item]
        if (storageKey) writeStorage(storageKey, next)
        return next
      })
      setIsPending(false)
    },
    [latencyMs, storageKey]
  )

  const update = React.useCallback(
    async (id: string, patch: Partial<T>) => {
      setIsPending(true)
      // TODO(api): replace with `await fetch(`/api/.../${id}`, { method: "PATCH", body: JSON.stringify(patch) })`
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
      setItems((current) => {
        const next = current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
        if (storageKey) writeStorage(storageKey, next)
        return next
      })
      setIsPending(false)
    },
    [latencyMs, storageKey]
  )

  const remove = React.useCallback(
    async (id: string) => {
      setIsPending(true)
      // TODO(api): replace with `await fetch(`/api/.../${id}`, { method: "DELETE" })`
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
      setItems((current) => {
        const next = current.filter((entry) => entry.id !== id)
        if (storageKey) writeStorage(storageKey, next)
        return next
      })
      setIsPending(false)
    },
    [latencyMs, storageKey]
  )

  const replaceAll = React.useCallback(
    (next: T[]) => {
      setItems(next)
      if (storageKey) writeStorage(storageKey, next)
    },
    [storageKey]
  )

  return { items, isPending, create, update, remove, replaceAll }
}
