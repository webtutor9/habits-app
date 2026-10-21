export type Status = 'done' | 'planned' | 'urgent' | 'rest' | 'iso'
export type CellValue = Status | number

export interface Habit {
  id: string
  name: string
  section: string
  type: 'status' | 'number' | 'delta'
  unit?: string
  /** for type 'delta': id of the number habit it is computed from */
  source?: string
  archived?: boolean
}

export interface HabitsData {
  version: 1
  habits: Habit[]
  /** ISO date (YYYY-MM-DD) -> habit id -> value */
  entries: Record<string, Record<string, CellValue>>
  updatedAt: string
}

export type Op =
  | { kind: 'cell'; date: string; habit: string; value: CellValue | null }
  | { kind: 'habits'; habits: Habit[] }

export interface SyncConfig {
  owner: string
  repo: string
  branch: string
  path: string
  token: string
}
