import { useEffect, useState } from 'react'
import { emptyData, replaceData, syncNow, useStore } from './store'
import type { Habit, HabitsData } from './types'
import { Today } from './views/Today'
import { Grid } from './views/Grid'
import { Stats } from './views/Stats'
import { Settings, SyncSettings } from './views/Settings'

type Tab = 'today' | 'grid' | 'stats' | 'settings'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'grid', label: 'Jahr', icon: '▦' },
  { id: 'today', label: 'Heute', icon: '✓' },
  { id: 'stats', label: 'Auswertung', icon: '↗' },
  { id: 'settings', label: 'Einstellungen', icon: '⚙' },
]

export default function App() {
  const { data, sync } = useStore()
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'grid')
  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
  }, [tab])
  useEffect(() => {
    syncNow()
  }, [])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>●</span> HabitsApp
        </div>
        <nav className="tabs desktop">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <SyncDot sync={sync} onClick={() => syncNow()} />
      </header>
      <main className={`view view-${tab}`}>
        {!data ? (
          <Onboarding />
        ) : tab === 'today' ? (
          <Today data={data} />
        ) : tab === 'grid' ? (
          <Grid data={data} />
        ) : tab === 'stats' ? (
          <Stats data={data} />
        ) : (
          <Settings data={data} />
        )}
      </main>
      {data && (
        <nav className="tabs mobile">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

function SyncDot({ sync, onClick }: { sync: ReturnType<typeof useStore>['sync']; onClick: () => void }) {
  const label =
    sync.state === 'off'
      ? 'Nur lokal gespeichert'
      : sync.state === 'idle'
        ? 'Synchronisiert'
        : sync.state === 'syncing'
          ? 'Synchronisiere …'
          : sync.state === 'pending'
            ? 'Änderungen warten auf Sync'
            : sync.message
  return (
    <button className={`sync-dot ${sync.state}`} onClick={onClick} title={label} aria-label={label}>
      <span />
      <span className="sync-label">{sync.state === 'error' ? 'Sync-Fehler' : sync.state === 'off' ? 'lokal' : ''}</span>
    </button>
  )
}

const EXAMPLE: Habit[] = [
  { id: 'gewicht', name: 'Gewicht', section: 'Morgen', type: 'number', unit: 'kg' },
  { id: 'delta-vortag', name: 'Delta Vortag', section: 'Morgen', type: 'delta', source: 'gewicht', unit: 'kg' },
  { id: 'wasser', name: 'Glas Wasser trinken', section: 'Morgen', type: 'status' },
  { id: 'mobilitaet', name: 'Mobilität', section: 'Morgen', type: 'status' },
  { id: 'cardio', name: 'Cardio (30+ min)', section: 'Sport', type: 'status' },
  { id: 'kraft', name: 'Kraft', section: 'Sport', type: 'status' },
  { id: 'kein-alkohol', name: 'Kein Alkohol', section: 'Abend', type: 'status' },
  { id: 'dehnen', name: 'Dehnen', section: 'Abend', type: 'status' },
]

function Onboarding() {
  const { sync } = useStore()
  const importFile = async (file: File) => {
    try {
      const d = JSON.parse(await file.text()) as HabitsData
      if (!Array.isArray(d.habits)) throw new Error('Unbekanntes Format')
      replaceData({ ...d, version: 1 })
    } catch (e) {
      alert('Import fehlgeschlagen: ' + (e instanceof Error ? e.message : e))
    }
  }
  return (
    <div className="onboarding">
      <h1>Willkommen</h1>
      <p className="muted">Verbinde dein privates Daten-Repo, damit Handy und Desktop dieselben Daten sehen.</p>
      {sync.state === 'syncing' && <p>Lade Daten …</p>}
      <SyncSettings />
      <section className="card">
        <h2>Ohne GitHub starten</h2>
        <div className="btn-row">
          <label className="btn">
            Backup-Datei (JSON) laden
            <input type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </label>
          <button className="btn" onClick={() => replaceData(emptyData(EXAMPLE))}>
            Mit Beispiel-Gewohnheiten starten
          </button>
        </div>
      </section>
    </div>
  )
}
