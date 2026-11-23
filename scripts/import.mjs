// Fragen aus einer JSON-Datei in Supabase übernehmen (neue anlegen, vorhandene per "nummer" aktualisieren).
// Aufruf: npm run import -- data/fragen.json
// Kategorien und Erklärungen bleiben unberührt.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fromJson, validate } from '../src/model.js'

const file = process.argv[2] ?? 'data/fragen.json'
const raw = JSON.parse(readFileSync(file, 'utf8'))
const rows = (raw.fragen ?? raw).map(fromJson)

const errors = rows.map(validate).filter(Boolean)
const dupes = rows.map((r) => r.nummer).filter((n, i, a) => a.indexOf(n) !== i)
if (dupes.length) errors.push(`Doppelte Nummern: ${[...new Set(dupes)].join(', ')}`)
if (errors.length) {
  console.error(`Nichts importiert, ${errors.length} Fehler:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_URL und SUPABASE_SECRET_KEY fehlen in .env (siehe .env.example).')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
const { error } = await sb.from('questions').upsert(rows, { onConflict: 'nummer' })
if (error) {
  console.error('Supabase-Fehler:', error.message)
  process.exit(1)
}
console.log(`${rows.length} Fragen importiert bzw. aktualisiert.`)
