import { useSyncExternalStore } from 'react'
import type { CellValue, Habit, HabitsData, Op, SyncConfig } from './types'
import { loadRemote, saveRemote, ConflictError } from './github'

const K_DATA = 'habits.data'
const K_PENDING = 'habits.pending'
const K_SYNC = 'habits.sync'

export type SyncState =
  | { state: 'off' }
  | { state: 'idle'; at: string }
  | { state: 'syncing' }
  | { state: 'pending' }
  | { state: 'error'; message: string }

interface StoreState {
  data: HabitsData | null
  pending: Op[]
  sync: SyncState
  config: SyncConfig | null
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage full or blocked – sync still keeps the remote copy */
  }
}

let state: StoreState = {
  data: read<HabitsData | null>(K_DATA, null),
  pending: read<Op[]>(K_PENDING, []),
  config: read<SyncConfig | null>(K_SYNC, null),
  sync: { state: 'off' },
}
state.sync = state.config ? (state.pending.length ? { state: 'pending' } : { state: 'idle', at: '' }) : { state: 'off' }

const listeners = new Set<() => void>()
function set(patch: Partial<StoreState>) {
  state = { ...state, ...patch }
  if ('data' in patch) write(K_DATA, state.data)
  if ('pending' in patch) write(K_PENDING, state.pending)
  if ('config' in patch) write(K_SYNC, state.config)
  listeners.forEach((l) => l())
}

export function useStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Apply ops on top of a data snapshot (pure). Last write per cell wins. */
export function applyOps(data: HabitsData, ops: Op[]): HabitsData {
  const entries = { ...data.entries }
  let habits = data.habits
  for (const op of ops) {
    if (op.kind === 'habits') {
      habits = op.habits
    } else {
      const day = { ...(entries[op.date] ?? {}) }
      if (op.value === null) delete day[op.habit]
      else day[op.habit] = op.value
      if (Object.keys(day).length) entries[op.date] = day
      else delete entries[op.date]
    }
  }
  return { ...data, habits, entries, updatedAt: new Date().toISOString() }
}

function commit(op: Op) {
  if (!state.data) return
  set({
    data: applyOps(state.data, [op]),
    pending: state.config ? [...state.pending, op] : [],
    sync: state.config ? { state: 'pending' } : state.sync,
  })
  scheduleSync()
}

export function setCell(date: string, habit: string, value: CellValue | null) {
  commit({ kind: 'cell', date, habit, value })
}

export function setHabits(habits: Habit[]) {
  commit({ kind: 'habits', habits })
}

/** Replace all data (import / first start). */
export function replaceData(data: HabitsData) {
  set({
    data,
    pending: state.config ? [{ kind: 'habits', habits: data.habits }, ...allCellOps(data)] : [],
  })
  scheduleSync(0)
}

function allCellOps(data: HabitsData): Op[] {
  const ops: Op[] = []
  for (const [date, day] of Object.entries(data.entries))
    for (const [habit, value] of Object.entries(day)) ops.push({ kind: 'cell', date, habit, value })
  return ops
}

export function setConfig(config: SyncConfig | null) {
  set({ config, sync: config ? { state: 'pending' } : { state: 'off' }, pending: config ? state.pending : [] })
  if (config) syncNow()
}

let timer: number | undefined
function scheduleSync(delay = 1500) {
  if (!state.config) return
  clearTimeout(timer)
  timer = window.setTimeout(syncNow, delay)
}

let running = false
export async function syncNow(): Promise<void> {
  const cfg = state.config
  if (!cfg || running) return
  if (!navigator.onLine) {
    set({ sync: { state: 'error', message: 'Offline – wird später synchronisiert' } })
    return
  }
  running = true
  set({ sync: { state: 'syncing' } })
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ops = state.pending
      const remote = await loadRemote(cfg)
      let base: HabitsData
      if (remote) base = remote.data
      else if (state.data) base = state.data
      else {
        // empty repo and nothing local yet: wait for import or example start
        set({ sync: { state: 'idle', at: new Date().toISOString() } })
        return
      }
      if (!ops.length && remote) {
        set({ data: remote.data, sync: { state: 'idle', at: new Date().toISOString() } })
        return
      }
      const merged = applyOps(base, ops)
      try {
        await saveRemote(cfg, merged, remote?.sha)
      } catch (e) {
        if (e instanceof ConflictError) continue
        throw e
      }
      // keep ops added while we were saving
      const rest = state.pending.slice(ops.length)
      set({ data: applyOps(merged, rest), pending: rest, sync: rest.length ? { state: 'pending' } : { state: 'idle', at: new Date().toISOString() } })
      if (rest.length) scheduleSync(300)
      return
    }
    throw new Error('Konflikt beim Speichern – bitte erneut versuchen')
  } catch (e) {
    set({ sync: { state: 'error', message: e instanceof Error ? e.message : String(e) } })
  } finally {
    running = false
  }
}

export function emptyData(habits: Habit[] = []): HabitsData {
  return { version: 1, habits, entries: {}, updatedAt: new Date().toISOString() }
}

// Pull fresh data when the app comes back to the foreground or online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
}
