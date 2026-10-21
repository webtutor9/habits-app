import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Habit, HabitsData } from '../types'
import { MONTHS, WEEKDAYS, daysOfYear, parse, todayIso } from '../dates'
import { delta, sections } from '../calc'
import { CellSheet, Legend, type PickTarget } from '../components'

export function Grid({ data }: { data: HabitsData }) {
  const today = todayIso()
  const years = useMemo(() => {
    const ys = new Set(Object.keys(data.entries).map((d) => Number(d.slice(0, 4))))
    ys.add(new Date().getFullYear())
    return [...ys].sort()
  }, [data.entries])
  const [year, setYear] = useState(new Date().getFullYear())
  const [pick, setPick] = useState<PickTarget | null>(null)
  const days = useMemo(() => daysOfYear(year), [year])
  const scroller = useRef<HTMLDivElement>(null)

  const months = useMemo(() => {
    const out: { name: string; span: number }[] = []
    for (const d of days) {
      const m = parse(d).getMonth()
      if (out.length && out[out.length - 1].name === MONTHS[m]) out[out.length - 1].span++
      else out.push({ name: MONTHS[m], span: 1 })
    }
    return out
  }, [days])

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('th.is-today')
    if (el && scroller.current) scroller.current.scrollLeft = el.offsetLeft - scroller.current.clientWidth / 2
  }, [year])

  const groups = sections(data.habits)

  return (
    <div className="grid-view">
      <div className="grid-toolbar">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Jahr">
          {[...years, Math.max(...years) + 1].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <Legend compact />
      </div>
      <div className="grid-scroll" ref={scroller}>
        <table className="grid">
          <thead>
            <tr>
              <th className="corner" rowSpan={3}>
                {year}
              </th>
              {months.map((m) => (
                <th key={m.name} colSpan={m.span} className="month">
                  <span>{m.name}</span>
                </th>
              ))}
            </tr>
            <tr>
              {days.map((d) => (
                <th key={d} className={dayClass(d, today)}>
                  {parse(d).getDate()}
                </th>
              ))}
            </tr>
            <tr>
              {days.map((d) => (
                <th key={d} className={`${dayClass(d, today)} wd`}>
                  {WEEKDAYS[parse(d).getDay()]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([section, habits]) =>
              habits.map((h, i) => (
                <GridRow
                  key={h.id}
                  habit={h}
                  section={i === 0 ? section : null}
                  days={days}
                  today={today}
                  data={data}
                  onPick={setPick}
                />
              )),
            )}
          </tbody>
        </table>
      </div>
      <CellSheet target={pick} onClose={() => setPick(null)} />
    </div>
  )
}

function dayClass(d: string, today: string) {
  const wd = parse(d).getDay()
  return [d === today ? 'is-today' : '', wd === 0 || wd === 6 ? 'weekend' : '', parse(d).getDate() === 1 ? 'm-start' : '']
    .filter(Boolean)
    .join(' ')
}

const GridRow = memo(function GridRow({
  habit,
  section,
  days,
  today,
  data,
  onPick,
}: {
  habit: Habit
  section: string | null
  days: string[]
  today: string
  data: HabitsData
  onPick: (t: PickTarget) => void
}) {
  return (
    <tr className={section ? 'section-start' : ''}>
      <th className="habit-name" scope="row">
        {section && <span className="section-label">{section}</span>}
        {habit.name}
      </th>
      {days.map((d) => {
        const cls = dayClass(d, today)
        if (habit.type === 'delta') {
          const v = delta(data, habit, d)
          return (
            <td key={d} className={`${cls} num ${v === null ? '' : v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>
              {v === null ? '' : v > 0 ? `+${v}` : v}
            </td>
          )
        }
        const v = data.entries[d]?.[habit.id]
        return (
          <td
            key={d}
            className={`${cls} ${typeof v === 'number' ? 'num' : (v ?? '')} ${d < today ? 'past' : ''}`}
            onClick={() => onPick({ date: d, habit, value: v })}
          >
            {typeof v === 'number' ? v : v === 'iso' ? 'i' : ''}
          </td>
        )
      })}
    </tr>
  )
})
