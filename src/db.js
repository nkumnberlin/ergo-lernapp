import { createClient } from '@supabase/supabase-js'
import { fromJson } from './model.js'

const url = import.meta.env.VITE_SUPABASE_URL
const sb = url ? createClient(url, import.meta.env.VITE_SUPABASE_KEY) : null

// Ohne Supabase-Zugangsdaten: Demo mit data/fragen.json, Kategorien nur in diesem Browser.
export const demo = !sb
const DEMO_KEY = 'ergo-demo-kategorien'
const demoGet = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY)) ?? { categories: [], links: [] }
  } catch {
    return { categories: [], links: [] }
  }
}
const demoSet = (fn) => {
  const d = fn(demoGet())
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(d))
  } catch {}
  return d
}

const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

export async function loadAll() {
  if (demo) {
    const { default: raw } = await import('../data/fragen.json')
    return { questions: raw.fragen.map(fromJson), ...demoGet() }
  }
  // ponytail: Supabase liefert max. 1000 Zeilen pro Abfrage; ab ~1000 Zuordnungen paginieren
  const [questions, categories, links] = await Promise.all([
    sb.from('questions').select('*').order('nummer').then(check),
    sb.from('categories').select('*').order('name').then(check),
    sb.from('question_categories').select('*').then(check),
  ])
  return { questions, categories, links }
}

export async function createCategory(name) {
  if (demo) {
    const cat = { id: Date.now(), name }
    demoSet((d) => ({ ...d, categories: [...d.categories, cat] }))
    return cat
  }
  return check(await sb.from('categories').insert({ name }).select().single())
}

export async function setLink(nummer, category_id, on) {
  if (demo) {
    demoSet((d) => ({
      ...d,
      links: on
        ? [...d.links, { nummer, category_id }]
        : d.links.filter((l) => !(l.nummer === nummer && l.category_id === category_id)),
    }))
    return
  }
  const t = sb.from('question_categories')
  check(await (on ? t.insert({ nummer, category_id }) : t.delete().match({ nummer, category_id })))
}
