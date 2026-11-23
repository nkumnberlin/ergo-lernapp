// Reine Logik ohne React/Vite, wird auch vom Import-Skript (Node) genutzt.

export const fromJson = (q) => ({
  nummer: q.nummer,
  frage: q.frage,
  optionen: q.antwortmoeglichkeiten ?? [],
  loesung: q.loesung,
  material: q.aufgabenmaterial ?? null,
})

export const isMC = (q) => q.optionen.length > 0
export const correctLetters = (q) => q.loesung.split(/[\s,;]+/).filter(Boolean)

// Material, in das man selbst etwas einträgt (statt eines großen Textfelds)
export const hasInputMaterial = (m) => !!(m && (m.zeilen || m.aussagen || m.bereiche))

// ponytail: Erkennung per Stichwort am Lösungsanfang. Lösung korrigieren = Hinweis verschwindet.
const UNSICHER = /wahrscheinlich|naheliegend|plausib|vermutlich|nicht (sicher|zuverlässig|eindeutig|belastbar)/i
export const isUnsicher = (q) => UNSICHER.test(q.loesung.slice(0, 150))

export function validate(r) {
  if (!Number.isInteger(r.nummer)) return `"nummer" fehlt oder ist keine Zahl: ${JSON.stringify(r).slice(0, 80)}`
  if (typeof r.frage !== 'string' || !r.frage.trim()) return `Nr. ${r.nummer}: "frage" fehlt`
  if (typeof r.loesung !== 'string' || !r.loesung.trim()) return `Nr. ${r.nummer}: "loesung" fehlt`
  if (isMC(r)) {
    const letters = r.optionen.map((o) => o.buchstabe)
    const bad = correctLetters(r).filter((x) => !letters.includes(x))
    if (bad.length) return `Nr. ${r.nummer}: Lösung "${bad.join(', ')}" ist keine Antwortmöglichkeit`
  }
  return null
}

// {points, max} oder null, solange eine schriftliche Frage nicht eingestuft ist
export function scoreQuestion(q, a = {}) {
  if (isMC(q)) {
    const right = correctLetters(q)
    const picked = a.picked ?? []
    const r = picked.filter((x) => right.includes(x)).length
    return { points: Math.max(0, r - (picked.length - r)), max: right.length }
  }
  return a.rating == null ? null : { points: a.rating, max: 1 }
}

// Jede Frage zählt gleich viel: Mittelwert von Punkte/Max, in Prozent
export function totalPercent(scores) {
  const s = scores.filter(Boolean)
  if (!s.length) return 0
  return Math.round((100 * s.reduce((t, x) => t + x.points / x.max, 0)) / s.length)
}

export const hasAnswer = (a = {}) =>
  !!(a.picked?.length || a.text?.trim() || Object.values(a.cells ?? {}).some(Boolean))

// Musterantwort in Zeilen; Aufzählungen ("1.", "-", "•") werden abhakbare Punkte
export const solutionLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ text: l, point: /^(\d+\.|[-•])\s/.test(l) }))
