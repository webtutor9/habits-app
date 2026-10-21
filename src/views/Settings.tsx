import { useState } from 'react'
import type { Habit, HabitsData, SyncConfig } from '../types'
import { replaceData, setConfig, setHabits, syncNow, useStore } from '../store'
import { testConnection } from '../github'
import { STATUS, STATUS_ORDER } from '../status'
import { daysOfYear } from '../dates'
import { delta } from '../calc'
import { Legend } from '../components'

export function Settings({ data }: { data: HabitsData }) {
  return (
    <div className="settings">
      <SyncSettings />
      <HabitEditor data={data} />
      <DataSettings data={data} />
      <section className="card">
        <h2>Legende</h2>
        <Legend />
      </section>
    </div>
  )
}

export function SyncSettings() {
  const { config, sync } = useStore()
  const [form, setForm] = useState<SyncConfig>(
    config ?? { owner: '', repo: 'habits-data', branch: 'main', path: 'habits.json', token: '' },
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const f = (k: keyof SyncConfig) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value.trim() }),
  })

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const r = await testConnection(form)
      setConfig(form)
      setMsg(r.private ? 'Verbunden.' : 'Verbunden – Achtung: dieses Repo ist öffentlich!')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Synchronisierung über GitHub</h2>
      {config ? (
        <>
          <p>
            Daten in <b>{config.owner}/{config.repo}</b> → <code>{config.path}</code>
          </p>
          <p className="muted small">
            Status:{' '}
            {sync.state === 'idle'
              ? 'synchron'
              : sync.state === 'syncing'
                ? 'synchronisiere …'
                : sync.state === 'pending'
                  ? 'Änderungen warten'
                  : sync.state === 'error'
                    ? sync.message
                    : 'aus'}
          </p>
          <div className="btn-row">
            <button className="btn" onClick={() => syncNow()}>
              Jetzt synchronisieren
            </button>
            <button
              className="btn danger"
              onClick={() => confirm('Verbindung auf diesem Gerät trennen? Die Daten in GitHub bleiben erhalten.') && setConfig(null)}
            >
              Trennen
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={connect} className="form">
          <p className="muted small">
            Lege ein <b>privates</b> Repo an (z.B. <code>habits-data</code>) und erstelle einen Fine-grained Token mit
            Zugriff nur auf dieses Repo und der Berechtigung <i>Contents: Read and write</i>. Der Token bleibt nur auf
            diesem Gerät gespeichert.
          </p>
          <label>
            GitHub-Benutzer
            <input {...f('owner')} required autoCapitalize="off" autoCorrect="off" />
          </label>
          <label>
            Daten-Repo
            <input {...f('repo')} required autoCapitalize="off" autoCorrect="off" />
          </label>
          <div className="two">
            <label>
              Branch
              <input {...f('branch')} required autoCapitalize="off" />
            </label>
            <label>
              Datei
              <input {...f('path')} required autoCapitalize="off" />
            </label>
          </div>
          <label>
            Token
            <input {...f('token')} required type="password" autoComplete="off" />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Prüfe …' : 'Verbinden'}
          </button>
        </form>
      )}
      {msg && <p className="msg">{msg}</p>}
    </section>
  )
}

function slug(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function HabitEditor({ data }: { data: HabitsData }) {
  const habits = data.habits
  const sectionNames = [...new Set(habits.map((h) => h.section))]
  const [name, setName] = useState('')
  const [section, setSection] = useState(sectionNames[0] ?? 'Morgen')
  const [type, setType] = useState<'status' | 'number'>('status')
  const [unit, setUnit] = useState('')

  const update = (id: string, patch: Partial<Habit>) => setHabits(habits.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= habits.length) return
    const next = [...habits]
    ;[next[i], next[j]] = [next[j], next[i]]
    setHabits(next)
  }
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    let id = slug(name) || 'habit'
    while (habits.some((h) => h.id === id)) id += '-2'
    const h: Habit = { id, name: name.trim(), section: section.trim() || 'Allgemein', type, ...(type === 'number' && unit ? { unit } : {}) }
    // insert after the last habit of the same section
    const last = habits.map((x) => x.section).lastIndexOf(h.section)
    const next = [...habits]
    next.splice(last === -1 ? next.length : last + 1, 0, h)
    setHabits(next)
    setName('')
    setUnit('')
  }

  return (
    <section className="card">
      <h2>Gewohnheiten</h2>
      <datalist id="sections">
        {sectionNames.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <ul className="habit-list">
        {habits.map((h, i) => (
          <li key={h.id} className={h.archived ? 'archived' : ''}>
            <div className="habit-fields">
              <input value={h.name} onChange={(e) => update(h.id, { name: e.target.value })} aria-label="Name" />
              <input
                value={h.section}
                list="sections"
                onChange={(e) => update(h.id, { section: e.target.value })}
                aria-label="Abschnitt"
                className="sec-input"
              />
            </div>
            <div className="habit-actions">
              <span className="muted small">{h.type === 'number' ? `Zahl${h.unit ? ` (${h.unit})` : ''}` : h.type === 'delta' ? 'berechnet' : 'Status'}</span>
              <button className="icon-btn sm" onClick={() => move(i, -1)} aria-label="Nach oben">
                ↑
              </button>
              <button className="icon-btn sm" onClick={() => move(i, 1)} aria-label="Nach unten">
                ↓
              </button>
              <button
                className="icon-btn sm"
                onClick={() => update(h.id, { archived: !h.archived })}
                title={h.archived ? 'Wieder anzeigen' : 'Ausblenden (Daten bleiben erhalten)'}
              >
                {h.archived ? '↺' : '⊘'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form className="form add-habit" onSubmit={add}>
        <h3>Neue Gewohnheit</h3>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="two">
          <input placeholder="Abschnitt" list="sections" value={section} onChange={(e) => setSection(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as 'status' | 'number')}>
            <option value="status">Status (abhaken)</option>
            <option value="number">Zahl (messen)</option>
          </select>
        </div>
        {type === 'number' && <input placeholder="Einheit, z.B. kg" value={unit} onChange={(e) => setUnit(e.target.value)} />}
        <button className="btn primary">Hinzufügen</button>
      </form>
    </section>
  )
}

function download(name: string, content: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Wide layout like the original Excel: one row per habit, one column per day, codes 1/x/y/f/i. */
export function toCsv(data: HabitsData, year: number) {
  const days = daysOfYear(year)
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lines = [['Abschnitt', 'Gewohnheit', ...days].join(';')]
  let lastSec = ''
  for (const h of data.habits) {
    const cells = days.map((d) => {
      if (h.type === 'delta') {
        const v = delta(data, h, d)
        return v === null ? '' : String(v).replace('.', ',')
      }
      const v = data.entries[d]?.[h.id]
      if (v === undefined) return h.type === 'number' ? '' : ''
      return typeof v === 'number' ? String(v).replace('.', ',') : STATUS[v].code
    })
    lines.push([esc(h.section === lastSec ? '' : h.section), esc(h.name), ...cells].join(';'))
    lastSec = h.section
  }
  return '﻿' + lines.join('\r\n')
}

function DataSettings({ data }: { data: HabitsData }) {
  const year = new Date().getFullYear()
  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as HabitsData
      if (!Array.isArray(parsed.habits) || typeof parsed.entries !== 'object') throw new Error('Unbekanntes Format')
      if (confirm(`${parsed.habits.length} Gewohnheiten und ${Object.keys(parsed.entries).length} Tage importieren? Bestehende Einträge an denselben Tagen werden überschrieben.`))
        replaceData({ ...parsed, version: 1 })
    } catch (e) {
      alert('Import fehlgeschlagen: ' + (e instanceof Error ? e.message : e))
    }
  }
  return (
    <section className="card">
      <h2>Daten</h2>
      <div className="btn-row">
        <button className="btn" onClick={() => download(`habits-${year}.csv`, toCsv(data, year), 'text/csv;charset=utf-8')}>
          Excel-Export (CSV) {year}
        </button>
        <button className="btn" onClick={() => download('habits.json', JSON.stringify(data, null, 1), 'application/json')}>
          Backup (JSON)
        </button>
        <label className="btn">
          Import (JSON)
          <input type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </label>
      </div>
      <p className="muted small">CSV-Codes wie im Excel: {STATUS_ORDER.map((s) => `${STATUS[s].code} = ${STATUS[s].label}`).join(', ')}.</p>
    </section>
  )
}
