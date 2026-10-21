export const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const pad = (n: number) => String(n).padStart(2, '0')

export function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayIso() {
  return iso(new Date())
}

export function addDays(s: string, n: number) {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function daysOfYear(year: number) {
  const out: string[] = []
  const d = new Date(year, 0, 1)
  while (d.getFullYear() === year) {
    out.push(iso(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function formatLong(s: string) {
  const d = parse(s)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
