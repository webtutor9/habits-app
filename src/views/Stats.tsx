import { useMemo, useState } from 'react'
import type { HabitsData } from '../types'
import { MONTHS, addDays, parse, todayIso } from '../dates'
import { monthStats, numberSeries, sections, streak } from '../calc'

const RANGES = [
  { label: '30 T', days: 30 },
  { label: '90 T', days: 90 },
  { label: '1 J', days: 365 },
]

export function Stats({ data }: { data: HabitsData }) {
  const today = todayIso()
  const year = new Date().getFullYear()
  const numberHabits = data.habits.filter((h) => h.type === 'number' && !h.archived)
  const [metric, setMetric] = useState(numberHabits.find((h) => h.id === 'gewicht')?.id ?? numberHabits[0]?.id)
  const [range, setRange] = useState(90)
  const habit = numberHabits.find((h) => h.id === metric)
  const pts = useMemo(
    () => (metric ? numberSeries(data, metric, addDays(today, -range + 1), today) : []),
    [data, metric, range, today],
  )
  const monthCount = parse(today).getFullYear() === year ? parse(today).getMonth() + 1 : 12

  return (
    <div className="stats">
      {habit && (
        <section className="card">
          <div className="card-head">
            <select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Messwert">
              {numberHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <div className="seg">
              {RANGES.map((r) => (
                <button key={r.days} className={range === r.days ? 'on' : ''} onClick={() => setRange(r.days)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <LineChart pts={pts} from={addDays(today, -range + 1)} to={today} unit={habit.unit ?? ''} />
        </section>
      )}

      <section className="card">
        <h2>Erfüllung {year}</h2>
        <p className="muted small">Erledigt ÷ (erledigt + ausgelassen). Erholungstage und leere Tage zählen nicht.</p>
        <div className="table-scroll">
          <table className="rates">
            <thead>
              <tr>
                <th />
                <th title="Aktuelle Serie">Serie</th>
                {MONTHS.slice(0, monthCount).map((m) => (
                  <th key={m}>{m.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections(data.habits).map(([section, habits]) => (
                <SectionRows key={section} section={section} cols={monthCount + 2}>
                  {habits
                    .filter((h) => h.type === 'status')
                    .map((h) => {
                      const ms = monthStats(data, h.id, year, today)
                      return (
                        <tr key={h.id}>
                          <th scope="row">{h.name}</th>
                          <td className="streak-cell">{streak(data, h.id, today) || ''}</td>
                          {ms.slice(0, monthCount).map((s, i) => (
                            <td
                              key={i}
                              className="rate"
                              style={{ ['--r' as string]: s.rate ?? 0 }}
                              title={`${s.done} erledigt, ${s.missed} ausgelassen`}
                              data-empty={s.rate === null}
                            >
                              {s.rate === null ? '' : Math.round(s.rate * 100)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                </SectionRows>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SectionRows({ section, cols, children }: { section: string; cols: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="sec">
        <th colSpan={cols}>{section}</th>
      </tr>
      {children}
    </>
  )
}

function LineChart({ pts, from, to, unit }: { pts: { date: string; value: number }[]; from: string; to: string; unit: string }) {
  if (pts.length < 2) return <p className="muted empty-chart">Zu wenige Messwerte in diesem Zeitraum.</p>
  const W = 640, H = 220, L = 40, R = 12, T = 14, B = 26
  const t0 = parse(from).getTime(), t1 = parse(to).getTime()
  const vals = pts.map((p) => p.value)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = Math.max((hi - lo) * 0.15, 0.5)
  lo -= pad
  hi += pad
  const x = (d: string) => L + ((parse(d).getTime() - t0) / (t1 - t0 || 1)) * (W - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  // 7-day trailing average over measured points
  const avg = pts.map((p, i) => {
    const win = pts.filter((q, j) => j <= i && parse(p.date).getTime() - parse(q.date).getTime() < 7 * 864e5)
    return { date: p.date, value: win.reduce((a, b) => a + b.value, 0) / win.length }
  })
  const path = (arr: typeof pts) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const ticks = niceTicks(lo, hi, 4)
  const first = pts[0].value, last = pts[pts.length - 1].value
  const change = Math.round((last - first) * 10) / 10
  const monthTicks: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) if (parse(d).getDate() === 1) monthTicks.push(d)

  return (
    <div>
      <div className="kpis">
        <div>
          <div className="kpi">{last.toFixed(1)}</div>
          <div className="muted small">aktuell {unit}</div>
        </div>
        <div>
          <div className={`kpi ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}</div>
          <div className="muted small">Veränderung</div>
        </div>
        <div>
          <div className="kpi">{Math.min(...vals).toFixed(1)}–{Math.max(...vals).toFixed(1)}</div>
          <div className="muted small">Spanne</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Verlauf">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" className="tick">
              {t % 1 ? t.toFixed(1) : t}
            </text>
          </g>
        ))}
        {monthTicks.map((d) => (
          <text key={d} x={x(d)} y={H - 6} className="tick" textAnchor="middle">
            {MONTHS[parse(d).getMonth()].slice(0, 3)}
          </text>
        ))}
        <path d={path(pts)} className="line-raw" />
        <path d={path(avg)} className="line-avg" />
        {pts.length <= 60 && pts.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} className="dot" />)}
      </svg>
      <div className="chart-legend muted small">
        <span><i className="lg raw" /> Messwert</span>
        <span><i className="lg avg" /> 7-Tage-Schnitt</span>
      </div>
    </div>
  )
}

function niceTicks(lo: number, hi: number, n: number) {
  const step0 = (hi - lo) / n
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Math.round(v * 100) / 100)
  return out
}
