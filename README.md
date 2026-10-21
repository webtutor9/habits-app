# HabitsApp

App: https://webtutor9.github.io/habits-app/

Tägliches Gewohnheits-Tracking im Format der bisherigen Excel-Tabelle – als installierbare Web-App für Handy und Desktop.

## Ansichten
- **Heute** – schnelle Tageserfassung. Antippen = erledigt, `⋯` für Planen, Erholungstag, Isometrisch.
- **Jahr** – das Raster wie im Excel (Tage als Spalten, Abschnitte Morgen/Sport/Abend).
- **Auswertung** – Verlauf der Messwerte (z.B. Gewicht mit 7-Tage-Schnitt), Erfüllungsquote pro Monat, Serien.
- **Einstellungen** – Gewohnheiten pflegen, GitHub-Sync, Export (CSV im Excel-Format, JSON-Backup).

## Codes (wie im Excel)
| Code | Farbe | Zukunft | Vergangenheit |
|---|---|---|---|
| `1` | grün | – | erledigt |
| `x` | gelb | geplant | ausgelassen |
| `y` | rot | dringend geplant | besonders unglücklich ausgelassen |
| `f` | hellgrün | Erholungstag | Erholungstag |
| `i` | grün mit „i“ | isometrisches Training | isometrisches Training |

Erfüllungsquote = erledigt ÷ (erledigt + ausgelassen); Erholungstage und leere Tage zählen nicht.

## Daten & Datenschutz
Dieses Repo enthält **nur den Code**, keine persönlichen Daten. Die Daten liegen als `habits.json` in einem
separaten **privaten** Repo (z.B. `habits-data`). Die App liest und schreibt sie über die GitHub-API mit einem
Fine-grained Personal Access Token, der nur auf dem jeweiligen Gerät gespeichert wird.

### Einrichtung
1. Privates Repo `habits-data` anlegen.
2. GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*
   - Repository access: *Only select repositories* → `habits-data`
   - Permissions: *Contents: Read and write*
3. App öffnen → Einstellungen → Benutzer, Repo und Token eintragen. Auf jedem Gerät einmal.
4. Am Handy: im Browser „Zum Home-Bildschirm“ hinzufügen.

Änderungen werden lokal sofort gespeichert und nach ~1,5 s synchronisiert (offline-fähig; bei Konflikten
gewinnt pro Zelle die letzte Änderung).

## Entwicklung
```bash
npm install
npm run dev      # lokal
npm run build    # Produktion nach dist/
```
Deployment auf GitHub Pages läuft automatisch bei jedem Push auf `main` (`.github/workflows/deploy.yml`).
In den Repo-Settings unter *Pages* als Source „GitHub Actions“ wählen.

## Excel-Import
`tools/convert.py` wandelt die bisherige Excel-Datei in `habits.json` um:
```bash
python3 tools/convert.py "Daily habits.xlsx" habits.json
```
