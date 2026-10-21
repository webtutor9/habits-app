import type { Habit, HabitsData } from './types'
import { addDays, parse } from './dates'
import { isDone } from './status'

/** Change vs. the most recent earlier measurement (skips days without value, max 14 days back). */
export function delta(data: HabitsData, habit: Habit, date: string): number | null {
  if (!habit.source) return null
  const cur = data.entries[date]?.[habit.source]
  if (typeof cur !== 'number') return null
  for (let i = 1; i <= 14; i++) {
    const prev = data.entries[addDays(date, -i)]?.[habit.source]
    if (typeof prev === 'number') return Math.round((cur - prev) * 10) / 10
  }
  return null
}

/** Consecutive done days ending today (or yesterday if today is still open). */
export function streak(data: HabitsData, habitId: string, today: string): number {
  let d = today
  if (!isDone(data.entries[d]?.[habitId])) d = addDays(d, -1)
  let n = 0
  while (isDone(data.entries[d]?.[habitId])) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export interface MonthStat {
  done: number
  missed: number
  rate: number | null
}

/** Per month: done vs. missed (planned/urgent in the past). Rest days and empty cells are neutral. */
export function monthStats(data: HabitsData, habitId: string, year: number, today: string): MonthStat[] {
  const out: MonthStat[] = Array.from({ length: 12 }, () => ({ done: 0, missed: 0, rate: null }))
  for (const [date, day] of Object.entries(data.entries)) {
    if (!date.startsWith(String(year)) || date >= today) continue
    const v = day[habitId]
    const m = parse(date).getMonth()
    if (isDone(v)) out[m].done++
    else if (v === 'planned' || v === 'urgent') out[m].missed++
  }
  for (const s of out) s.rate = s.done + s.missed ? s.done / (s.done + s.missed) : null
  return out
}

export function numberSeries(data: HabitsData, habitId: string, from: string, to: string) {
  const pts: { date: string; value: number }[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const v = data.entries[d]?.[habitId]
    if (typeof v === 'number') pts.push({ date: d, value: v })
  }
  return pts
}

export function sections(habits: Habit[]) {
  const map = new Map<string, Habit[]>()
  for (const h of habits) {
    if (h.archived) continue
    if (!map.has(h.section)) map.set(h.section, [])
    map.get(h.section)!.push(h)
  }
  return [...map.entries()]
}
