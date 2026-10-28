import { fmtDelta, fmtHabit } from '../format'
import { useState } from 'react'
import type { HabitsData } from '../types'
import { addDays, formatLong, todayIso } from '../dates'
import { delta, sections, streak } from '../calc'
import { isDone, statusLabel } from '../status'
import { setCell } from '../store'
import { CellSheet, Swatch, type PickTarget } from '../components'

export function Today({ data }: { data: HabitsData }) {
  const today = todayIso()
  const [date, setDate] = useState(today)
  const [pick, setPick] = useState<PickTarget | null>(null)
  const day = data.entries[date] ?? {}
  const isPast = date < today
  const statusHabits = data.habits.filter((h) => h.type === 'status' && !h.archived)
  const doneCount = statusHabits.filter((h) => isDone(day[h.id])).length

  return (
    <div className="today">
      <div className="day-nav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Vortag">
          ‹
        </button>
        <div className="day-title">
          <div>{date === today ? 'Heute' : formatLong(date)}</div>
          <div className="muted small">
            {date === today ? formatLong(date) + ' · ' : ''}
            {doneCount} von {statusHabits.length} erledigt
          </div>
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Nächster Tag">
          ›
        </button>
      </div>
      {date !== today && (
        <button className="link-btn" onClick={() => setDate(today)}>
          Zurück zu heute
        </button>
      )}

      {sections(data.habits).map(([section, habits]) => (
        <section key={section} className="card">
          <h2>{section}</h2>
          {habits.map((h) => {
            const v = day[h.id]
            if (h.type === 'delta') {
              const d = delta(data, h, date)
              return (
                <div key={h.id} className="row static">
                  <span className="row-name">{h.name}</span>
                  <span className={`delta ${d === null ? '' : d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>
                    {d === null ? '–' : `${fmtDelta(d)} ${h.unit ?? ''}`}
                  </span>
                </div>
              )
            }
            if (h.type === 'number') {
              return (
                <button key={h.id} className="row" onClick={() => setPick({ date, habit: h, value: v })}>
                  <span className="row-name">{h.name}</span>
                  <span className="row-value">
                    {typeof v === 'number' ? (
                      <>
                        {fmtHabit(v, h)} <span className="muted">{h.unit}</span>
                      </>
                    ) : (
                      <span className="muted">eintragen</span>
                    )}
                  </span>
                </button>
              )
            }
            const s = streak(data, h.id, today)
            return (
              <div key={h.id} className="row">
                <button
                  className="row-main"
                  onClick={() => setCell(date, h.id, isDone(v) ? null : 'done')}
                  aria-label={`${h.name}: ${isDone(v) ? 'erledigt, antippen zum Zurücksetzen' : 'als erledigt markieren'}`}
                >
                  <Swatch value={v} />
                  <span className="row-name">
                    {h.name}
                    {v && typeof v === 'string' && v !== 'done' && (
                      <span className={`tag ${v}`}>{statusLabel(v, isPast)}</span>
                    )}
                  </span>
                  {date === today && s >= 3 && <span className="streak" title="Serie">{s}🔥</span>}
                </button>
                <button className="more-btn" onClick={() => setPick({ date, habit: h, value: v })} aria-label="Status wählen">
                  ⋯
                </button>
              </div>
            )
          })}
        </section>
      ))}
      <p className="hint muted small">Antippen = erledigt. ⋯ für Planen, Erholungstag oder Isometrisch.</p>
      <CellSheet target={pick} onClose={() => setPick(null)} />
    </div>
  )
}
