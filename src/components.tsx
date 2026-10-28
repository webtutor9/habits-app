import { fmtHabit } from './format'
import { useEffect, useState } from 'react'
import type { CellValue, Habit, Status } from './types'
import { STATUS_ORDER, statusLabel } from './status'
import { formatLong, todayIso } from './dates'
import { setCell } from './store'

export function Swatch({ value, size = 'md' }: { value: CellValue | undefined; size?: 'sm' | 'md' }) {
  if (typeof value === 'number') return <span className={`swatch num ${size}`}>{value}</span>
  return <span className={`swatch ${size} ${value ?? 'empty'}`}>{value === 'iso' ? 'i' : ''}</span>
}

export function Legend({ compact }: { compact?: boolean }) {
  return (
    <div className={`legend ${compact ? 'compact' : ''}`}>
      {STATUS_ORDER.map((s) => (
        <span key={s} className="legend-item">
          <Swatch value={s} size="sm" />
          {s === 'planned' ? 'Geplant / Ausgelassen' : s === 'urgent' ? 'Dringend / Unglücklich ausgelassen' : statusLabel(s, false)}
        </span>
      ))}
    </div>
  )
}

export interface PickTarget {
  date: string
  habit: Habit
  value: CellValue | undefined
}

export function CellSheet({ target, onClose }: { target: PickTarget | null; onClose: () => void }) {
  const [num, setNum] = useState('')
  useEffect(() => {
    if (target) setNum(typeof target.value === 'number' ? fmtHabit(target.value, target.habit) : '')
  }, [target])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!target) return null
  const { date, habit, value } = target
  const isPast = date < todayIso()
  const pick = (v: Status | null) => {
    setCell(date, habit.id, v)
    onClose()
  }
  const saveNum = () => {
    const n = parseFloat(num.replace(',', '.'))
    setCell(date, habit.id, Number.isFinite(n) ? n : null)
    onClose()
  }
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={habit.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <div className="sheet-title">{habit.name}</div>
            <div className="muted">{formatLong(date)}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Schliessen">
            ✕
          </button>
        </div>
        {habit.type === 'number' ? (
          <form
            className="num-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveNum()
            }}
          >
            <input
              autoFocus
              inputMode="decimal"
              value={num}
              placeholder="leer = nicht gemessen"
              onChange={(e) => setNum(e.target.value)}
            />
            {habit.unit && <span className="muted">{habit.unit}</span>}
            <button className="btn primary" type="submit">
              Speichern
            </button>
          </form>
        ) : (
          <div className="pick-list">
            {STATUS_ORDER.map((s) => (
              <button key={s} className={`pick ${value === s ? 'active' : ''}`} onClick={() => pick(s)}>
                <Swatch value={s} />
                {statusLabel(s, isPast)}
              </button>
            ))}
            <button className={`pick ${value === undefined ? 'active' : ''}`} onClick={() => pick(null)}>
              <Swatch value={undefined} />
              Leer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
