import { fmtDelta, fmtHabit } from '../format'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CellValue, Habit, HabitsData } from '../types'
import { MONTHS, WEEKDAYS, addDays, daysOfYear, parse, todayIso } from '../dates'
import { delta, sections } from '../calc'
import { CellSheet, Legend, type PickTarget } from '../components'

interface Day {
  iso: string
  date: number
  weekday: string
  weekend: boolean
  monthStart: boolean
}

export function Grid({ data }: { data: HabitsData }) {
  const today = todayIso()
  const years = useMemo(() => {
    const ys = new Set(Object.keys(data.entries).map((d) => Number(d.slice(0, 4))))
    ys.add(new Date().getFullYear())
    return [...ys].sort()
  }, [data.entries])
  const [year, setYear] = useState(new Date().getFullYear())
  const [pick, setPick] = useState<PickTarget | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // Weekday and day number are derived from the same Date object and rendered in the same cell,
  // so they can never drift apart.
  const days: Day[] = useMemo(
    () =>
      daysOfYear(year).map((iso) => {
        const d = parse(iso)
        const wd = d.getDay()
        return { iso, date: d.getDate(), weekday: WEEKDAYS[wd], weekend: wd === 0 || wd === 6, monthStart: d.getDate() === 1 }
      }),
    [year],
  )

  const months = useMemo(() => {
    const out: { name: string; span: number }[] = []
    for (const d of days) {
      const name = MONTHS[parse(d.iso).getMonth()]
      if (out.length && out[out.length - 1].name === name) out[out.length - 1].span++
      else out.push({ name, span: 1 })
    }
    return out
  }, [days])

  const scrollToToday = () => {
    const el = scroller.current?.querySelector<HTMLElement>('th.is-today')
    if (el && scroller.current) scroller.current.scrollLeft = el.offsetLeft - scroller.current.clientWidth / 2
  }
  useEffect(scrollToToday, [year])

  const groups = sections(data.habits)

  return (
    <div className="grid-view">
      <div className="grid-toolbar">
        <div className="grid-toolbar-left">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Jahr">
            {[...years, Math.max(...years) + 1].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          {year === new Date().getFullYear() && (
            <button className="btn small-btn" onClick={scrollToToday}>
              Heute
            </button>
          )}
        </div>
        <div className="legend-inline">
          <Legend compact />
        </div>
        <details className="legend-details">
          <summary>Legende</summary>
          <Legend compact />
        </details>
      </div>
      <div className="grid-card">
        <div className="grid-scroll" ref={scroller}>
          <table className="grid">
            <thead>
              <tr className="months">
                <th className="corner" rowSpan={2}>
                  {year}
                </th>
                {months.map((m) => (
                  <th key={m.name} colSpan={m.span} className="month m-start">
                    <span>{m.name}</span>
                  </th>
                ))}
              </tr>
              <tr className="days">
                {days.map((d) => (
                  <th key={d.iso} className={dayClass(d, today)}>
                    <span className="day-chip">
                      <span className="wd">{d.weekday}</span>
                      <span className="dn">{d.date}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([section, habits]) => (
                <SectionRows key={section} section={section}>
                  {habits.map((h) => (
                    <GridRow key={h.id} habit={h} days={days} today={today} data={data} onPick={setPick} />
                  ))}
                </SectionRows>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CellSheet target={pick} onClose={() => setPick(null)} />
    </div>
  )
}

function SectionRows({ section, children }: { section: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="sec-row">
        <th className="habit-name sec" scope="rowgroup">
          {section}
        </th>
        <td className="sec-fill" colSpan={366} />
      </tr>
      {children}
    </>
  )
}

function dayClass(d: Day, today: string) {
  return [d.iso === today ? 'is-today' : '', d.weekend ? 'weekend' : '', d.monthStart ? 'm-start' : ''].filter(Boolean).join(' ')
}

const GridRow = memo(function GridRow({
  habit,
  days,
  today,
  data,
  onPick,
}: {
  habit: Habit
  days: Day[]
  today: string
  data: HabitsData
  onPick: (t: PickTarget) => void
}) {
  const valueOf = (iso: string): CellValue | undefined => data.entries[iso]?.[habit.id]
  return (
    <tr className={`hrow ${habit.type}`}>
      <th className="habit-name" scope="row" title={habit.name}>
        {habit.name}
        {habit.unit && habit.type !== 'status' && <span className="unit">{habit.unit}</span>}
      </th>
      {days.map((d) => {
        const cls = dayClass(d, today)
        if (habit.type === 'delta') {
          const v = delta(data, habit, d.iso)
          return (
            <td key={d.iso} className={`${cls} num ${v === null ? '' : v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>
              {v === null ? '' : fmtDelta(v)}
            </td>
          )
        }
        const v = valueOf(d.iso)
        if (habit.type === 'number') {
          return (
            <td key={d.iso} className={`${cls} num`} onClick={() => onPick({ date: d.iso, habit, value: v })}>
              {typeof v === 'number' ? fmtHabit(v, habit) : ''}
            </td>
          )
        }
        // Join neighbouring cells with the same status into one continuous bar (streaks)
        const joinL = v !== undefined && !d.monthStart && valueOf(addDays(d.iso, -1)) === v
        const joinR = v !== undefined && parse(addDays(d.iso, 1)).getDate() !== 1 && valueOf(addDays(d.iso, 1)) === v
        const past = d.iso < today
        return (
          <td key={d.iso} className={cls} onClick={() => onPick({ date: d.iso, habit, value: v })}>
            <span
              className={`dot ${typeof v === 'string' ? v : past ? 'empty past' : 'empty'} ${past ? 'past' : ''} ${joinL ? 'jl' : ''} ${joinR ? 'jr' : ''}`}
            >
              {v === 'iso' ? 'i' : ''}
            </span>
          </td>
        )
      })}
    </tr>
  )
})
