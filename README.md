# Ergo Klausurtrainer

Lern- und Klausur-App für die Ergotherapie-Ausbildung. React + Vite, Daten in Supabase, Hosting auf Vercel. Beides kostenlos.

**Live:** https://ergo-lernapp.vercel.app/

## Funktionen
- **Lernmodus:** Frage für Frage, Auflösung sofort danach, Prozentwert am Ende.
- **Klausurmodus:** 180 Minuten Countdown, freie Navigation, Fragen als „unsicher“ markieren, Auswertung erst am Ende.
- **Fragetypen:** x aus 5, Wahr/Falsch, schriftliche Antworten (Selbsteinstufung mit Checkliste der Musterantwort), Tabellen zum Ankreuzen oder Ausfüllen.
- **Kategorien:** Nach der Auflösung einer Frage zuordnen (mehrere möglich). Auf der Startseite Themen auswählen oder alle mischen.
- **Kategorien verwalten** (Button oben rechts auf der Startseite): Kategorien anlegen, umbenennen und löschen. Alle Fragen durchsuchen, nach Kategorie filtern, neu zuordnen oder aus einer Kategorie entfernen.
- Hinweis „Lösung unsicher“ bei Musterlösungen, die nicht eindeutig belegt sind.

## Lokal starten

```bash
pnpm i
pnpm dev
```

Mit `.env` arbeitet die lokale App auf der **echten** Supabase-Datenbank. Ohne `.env` läuft sie im **Demo-Modus**: Fragen aus `data/fragen.json`, Kategorien nur im eigenen Browser. Demo-Modus trotz `.env`:

```bash
VITE_SUPABASE_URL= pnpm dev
```

## Einrichtung (einmalig)

### 1. Supabase
1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen (Region: Frankfurt).
2. **SQL Editor** → Inhalt von `supabase/schema.sql` einfügen → **Run**.
3. **Project Settings → API Keys**: Project URL, *Publishable key* und *Secret key* kopieren.
4. `.env.example` nach `.env` kopieren und die Werte eintragen.
5. Fragen hochladen:
   ```bash
   pnpm import-fragen
   ```

> **Bestehendes Projekt** (vor der Kategorien-Verwaltung angelegt): einmal `supabase/02-kategorien-verwalten.sql` im SQL Editor ausführen. Sonst schlagen Umbenennen und Löschen mit „Keine Berechtigung“ fehl.

### 2. Vercel
1. Auf [vercel.com](https://vercel.com) → **Add New → Project** → GitHub-Repo importieren (Vite und pnpm werden erkannt).
2. Unter **Environment Variables** nur diese zwei eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY` (der *Publishable* Key)
3. **Deploy**. Den Secret Key **nie** bei Vercel eintragen.

Jeder Push auf `main` wird automatisch neu deployt. Werden die Variablen geändert: **Redeploy**, weil `VITE_`-Variablen beim Build eingebaut werden.

## Pflege (ohne neu bauen)

| Was | Wie |
|---|---|
| Neue/geänderte Fragen | JSON-Datei ergänzen → `pnpm import-fragen pfad/zur/datei.json`. Gleiche `nummer` = Aktualisierung. Fehlerhafte Dateien werden komplett abgelehnt. |
| Kategorien anlegen, umbenennen, löschen, zuordnen | In der App: Startseite → **Kategorien verwalten** |
| Erklärung zu einer Frage | Supabase → Table Editor → `questions` → Spalte `erklaerung` |
| „Lösung unsicher“-Hinweis entfernen | Musterlösung korrigieren (Wörter wie „wahrscheinlich“, „plausibel“ am Anfang entfernen) und neu importieren |

### Optionale Felder in `aufgabenmaterial`
- `"ankreuzen": true/false`: Tabelle mit Kästchen statt Eingabefeldern. Standard: Kästchen, wenn „kreuz“ in der Frage steht.
- `"textspalte": 1`: In welcher Spalte der vorgegebene Zeilentext steht (Standard `0`, also die erste).

## Hinweise
- Ein kostenloses Supabase-Projekt pausiert nach 7 Tagen ohne Nutzung. Im Supabase-Dashboard mit einem Klick wieder aktivieren.
- Ohne Anmeldung kann jeder mit dem Link Kategorien anlegen, umbenennen, löschen und zuordnen. Fragen ändern geht nur mit dem Secret Key.
- Lernfortschritt und laufende Klausur liegen im `localStorage` des Browsers.
- Wertung: x aus 5 = max(0, richtige − falsche Kreuze) / Anzahl richtiger Antworten. Schriftlich: Selbsteinstufung 1 / 0,5 / 0. Jede Frage zählt gleich viel.

```bash
pnpm test   # Wertungslogik prüfen
```
