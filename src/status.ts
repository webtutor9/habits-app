import type { Status } from './types'

export const STATUS_ORDER: Status[] = ['done', 'iso', 'rest', 'planned', 'urgent']

interface StatusInfo {
  code: string
  label: string
  pastLabel: string
}

export const STATUS: Record<Status, StatusInfo> = {
  done: { code: '1', label: 'Erledigt', pastLabel: 'Erledigt' },
  iso: { code: 'i', label: 'Isometrisch', pastLabel: 'Isometrisch' },
  rest: { code: 'f', label: 'Erholungstag', pastLabel: 'Erholungstag' },
  planned: { code: 'x', label: 'Geplant', pastLabel: 'Ausgelassen' },
  urgent: { code: 'y', label: 'Dringend geplant', pastLabel: 'Unglücklich ausgelassen' },
}

export function statusLabel(s: Status, isPast: boolean) {
  return isPast ? STATUS[s].pastLabel : STATUS[s].label
}

/** Counts as "done" for streaks and completion rates */
export const isDone = (v: unknown) => v === 'done' || v === 'iso'
