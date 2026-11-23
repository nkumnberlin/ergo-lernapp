# Ergo Klausurtrainer

Lern- und Klausur-App für die Ergotherapie-Ausbildung. React + Vite, Daten in Supabase, Hosting auf Vercel. Beides kostenlos.

## Lokal starten

```bash
npm install
npm run dev
```

Ohne `.env` läuft die App im **Demo-Modus**: Fragen aus `data/fragen.json`, Kategorien nur im eigenen Browser.

## Einrichtung (einmalig)

### 1. Supabase
1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen (Region: Frankfurt).
2. **SQL Editor** → Inhalt von `supabase/schema.sql` einfügen → **Run**.
3. **Project Settings → API Keys**: Project URL, *Publishable key* und *Secret key* kopieren.
4. `.env.example` nach `.env` kopieren und die Werte eintragen.
5. Fragen hochladen:
   ```bash
   npm run import
   ```

### 2. Vercel
1. Projekt auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) → **Add New → Project** → Repo importieren (Framework wird als Vite erkannt).
3. Unter **Environment Variables** nur diese zwei eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY` (der *Publishable* Key)
4. **Deploy**. Den Secret Key **nie** bei Vercel eintragen.

## Pflege (ohne neu bauen)

| Was | Wie |
|---|---|
| Neue/geänderte Fragen | JSON-Datei ergänzen → `npm run import -- pfad/zur/datei.json`. Gleiche `nummer` = Aktualisierung. Fehlerhafte Dateien werden komplett abgelehnt. |
| Erklärung zu einer Frage | Supabase → Table Editor → `questions` → Spalte `erklaerung` |
| Kategorie umbenennen/löschen | Supabase → Table Editor → `categories` |
| „Lösung unsicher“-Hinweis entfernen | Musterlösung korrigieren (Wörter wie „wahrscheinlich“, „plausibel“ am Anfang entfernen) und neu importieren |

### Optionale Felder in `aufgabenmaterial`
- `"ankreuzen": true/false`: Tabelle mit Kästchen statt Eingabefeldern. Standard: Kästchen, wenn „kreuz“ in der Frage steht.
- `"textspalte": 1`: In welcher Spalte der vorgegebene Zeilentext steht (Standard `0`, also die erste).

## Hinweise
- Ein kostenloses Supabase-Projekt pausiert nach 7 Tagen ohne Nutzung. Im Supabase-Dashboard mit einem Klick wieder aktivieren.
- Ohne Anmeldung kann jeder mit dem Link Kategorien anlegen und zuordnen. Fragen ändern geht nur mit dem Secret Key.
- Lernfortschritt und laufende Klausur liegen im `localStorage` des Browsers.
- Wertung: x aus 5 = max(0, richtige − falsche Kreuze) / Anzahl richtiger Antworten. Schriftlich: Selbsteinstufung 1 / 0,5 / 0. Jede Frage zählt gleich viel.

```bash
npm test   # Wertungslogik prüfen
```
