import type { Habit } from './types'

/** Fixed decimals per habit: weight is always shown with one decimal (87,0). */
export function decimalsOf(habit: Pick<Habit, 'unit'> | undefined): number | undefined {
  return habit?.unit === 'kg' ? 1 : undefined
}

/** German number format with comma, e.g. 87,0 or 16,5 */
export function fmt(v: number, decimals?: number) {
  return v.toLocaleString('de-CH', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
    useGrouping: false,
  }).replace('.', ',')
}

export const fmtHabit = (v: number, habit: Pick<Habit, 'unit'> | undefined) => fmt(v, decimalsOf(habit))

export function fmtDelta(v: number, decimals = 1) {
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v), decimals)}`
}
