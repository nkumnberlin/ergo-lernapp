import { useEffect, useMemo, useState } from 'react'
import { loadAll, createCategory, renameCategory, deleteCategory, setLink, demo } from './db.js'
import { isMC, scoreQuestion, totalPercent, hasAnswer } from './model.js'
import { QuestionView, CatPanel } from './Question.jsx'
import { Manage } from './Manage.jsx'

const EXAM_MINUTES = 180
const SESSION_KEY = 'ergo-sitzung'
const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export default function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [session, setSession] = useState(loadSession)
  const [review, setReview] = useState(null) // nummer der Frage, die aus der Auswertung geöffnet ist
  const [manage, setManage] = useState(false)

  useEffect(() => {
    loadAll().then(setData, (e) => setLoadError(e.message))
  }, [])
  useEffect(() => {
    try {
      session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY)
    } catch {}
  }, [session])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [session?.idx, session?.finished, review, manage])

  const catsByQ = useMemo(() => {
    const m = new Map()
    for (const l of data?.links ?? []) m.set(l.nummer, (m.get(l.nummer) ?? new Set()).add(l.category_id))
    return m
  }, [data])
  const catsOf = (n) => catsByQ.get(n) ?? new Set()

  if (loadError) return <Shell><p className="error">Fragen konnten nicht geladen werden: {loadError}</p></Shell>
  if (!data) return <Shell><p className="hint">Fragen werden geladen …</p></Shell>

  const byNr = new Map(data.questions.map((q) => [q.nummer, q]))

  const toggle = async (nummer, id) => {
    const on = !catsOf(nummer).has(id)
    const flip = (links) => (on ? [...links, { nummer, category_id: id }] : links.filter((l) => !(l.nummer === nummer && l.category_id === id)))
    setData((d) => ({ ...d, links: flip(d.links) }))
    try {
      await setLink(nummer, id, on)
      setSaveError(null)
    } catch (e) {
      setData((d) => ({ ...d, links: on ? d.links.filter((l) => !(l.nummer === nummer && l.category_id === id)) : [...d.links, { nummer, category_id: id }] }))
      setSaveError(`Kategorie konnte nicht gespeichert werden: ${e.message}`)
    }
  }
  const create = async (name, nummer) => {
    try {
      const cat = await createCategory(name)
      setData((d) => ({ ...d, categories: [...d.categories, cat].sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
      if (nummer != null) await toggle(nummer, cat.id)
    } catch (e) {
      setSaveError(`Kategorie konnte nicht angelegt werden: ${e.message}`)
    }
  }
  const sortByName = (cats) => [...cats].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const rename = async (id, name) => {
    try {
      await renameCategory(id, name)
      setData((d) => ({ ...d, categories: sortByName(d.categories.map((c) => (c.id === id ? { ...c, name } : c))) }))
    } catch (e) {
      setSaveError(`Umbenennen fehlgeschlagen: ${e.message}`)
    }
  }
  const remove = async (id) => {
    try {
      await deleteCategory(id)
      setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id), links: d.links.filter((l) => l.category_id !== id) }))
    } catch (e) {
      setSaveError(`Löschen fehlgeschlagen: ${e.message}`)
    }
  }
  const catPanel = (q) => (
    <CatPanel key={q.nummer} nummer={q.nummer} mine={catsOf(q.nummer)} categories={data.categories} toggle={toggle} create={create} />
  )

  const setAnswer = (nummer) => (patch) =>
    setSession((s) => ({ ...s, answers: { ...s.answers, [nummer]: { ...s.answers[nummer], ...patch } } }))
  const finish = () => setSession((s) => ({ ...s, finished: true, endedAt: Date.now() }))
  const start = (mode, ids) =>
    setSession({ mode, ids, idx: 0, answers: {}, startedAt: Date.now(), endsAt: mode === 'exam' ? Date.now() + EXAM_MINUTES * 60e3 : null })

  const ctx = { data, byNr, catsOf, catPanel, setAnswer, session, setSession, finish }
  let body
  if (manage) body = <Manage data={data} catsOf={catsOf} toggle={toggle} create={create} rename={rename} remove={remove} back={() => setManage(false)} />
  else if (!session) body = <Start data={data} catsOf={catsOf} onStart={start} onManage={() => setManage(true)} />
  else if (!session.finished) body = session.mode === 'exam' ? <Exam {...ctx} /> : <Learn {...ctx} />
  else if (review != null) body = <Review {...ctx} nummer={review} open={setReview} back={() => setReview(null)} />
  else body = <Result {...ctx} open={setReview} onStart={start} reset={() => setSession(null)} />

  return (
    <>
      {demo && <div className="demo">Demo-Modus: Kategorien werden nur in diesem Browser gespeichert.</div>}
      {saveError && <div className="error" role="alert">{saveError} <button className="linkbtn" onClick={() => setSaveError(null)}>schließen</button></div>}
      {body}
    </>
  )
}

const Shell = ({ meta, children }) => (
  <div className="wrap">
    <header className="app"><span className="brand">Ergo Klausurtrainer</span><span className="meta">{meta}</span></header>
    {children}
  </div>
)

const Empty = ({ finish }) => (
  <Shell>
    <p className="hint">Die Fragen dieser Sitzung gibt es nicht mehr.</p>
    <button className="btn" onClick={finish}>Zur Auswertung</button>
  </Shell>
)

function shuffle(a) {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Start ----------
function Start({ data, catsOf, onStart, onManage }) {
  const [mode, setMode] = useState('learn')
  const [sel, setSel] = useState(new Set(['alle']))
  const [count, setCount] = useState('alle')
  const [shuffled, setShuffled] = useState(true)

  const topics = [
    ...data.categories.map((c) => ({ id: c.id, name: c.name, match: (q) => catsOf(q.nummer).has(c.id) })),
    { id: 'ohne', name: 'Ohne Kategorie', match: (q) => catsOf(q.nummer).size === 0 },
  ]
  const all = sel.has('alle')
  const chosen = data.questions.filter((q) => all || topics.some((t) => sel.has(t.id) && t.match(q)))
  const flip = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.delete('alle')
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const go = () => {
    const ids = (shuffled ? shuffle(chosen) : chosen).map((q) => q.nummer)
    onStart(mode, count === 'alle' ? ids : ids.slice(0, +count))
  }

  return (
    <Shell meta={<>{data.questions.length} Fragen · {data.categories.length} Themen <button className="btn small ghost" onClick={onManage}>Kategorien verwalten</button></>}>
      <div className="col">
        <h1>Was möchtest du üben?</h1>
        <p className="hint">Dein Fortschritt bleibt in diesem Browser gespeichert.</p>
        <div className="modes" role="radiogroup" aria-label="Modus">
          {[
            ['learn', 'Lernmodus', 'Frage für Frage, Auflösung sofort danach.'],
            ['exam', 'Klausurmodus', `${EXAM_MINUTES} Minuten Countdown, Auswertung erst am Ende.`],
          ].map(([id, t, d]) => (
            <button key={id} className="mode" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}>
              <b>{t}</b>
              <span>{d}</span>
            </button>
          ))}
        </div>
        <h3>Themen</h3>
        <div className="topics">
          <label className="topic">
            <span><input type="checkbox" checked={all} onChange={() => setSel(new Set(all ? [] : ['alle']))} /> <b>Alle mischen</b></span>
            <span className="n">{data.questions.length}</span>
          </label>
          {topics.map((t) => (
            <label key={t.id} className="topic">
              <span><input type="checkbox" checked={!all && sel.has(t.id)} onChange={() => flip(t.id)} /> {t.name}</span>
              <span className="n">{data.questions.filter(t.match).length}</span>
            </label>
          ))}
        </div>
        {data.categories.length > 0 && <p className="hint">Eine Frage kann in mehreren Themen stehen. Ausgewählt kommt sie trotzdem nur einmal dran.</p>}
        <div className="row">
          <label htmlFor="anzahl">Anzahl Fragen</label>
          <select id="anzahl" value={count} onChange={(e) => setCount(e.target.value)}>
            <option value="alle">alle ({chosen.length})</option>
            {[20, 40, 60].filter((n) => n < chosen.length).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="inline"><input type="checkbox" id="zufall" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} /> Zufällige Reihenfolge</label>
        </div>
        <hr className="divider" />
        <button className="btn primary" disabled={!chosen.length} onClick={go}>Start</button>
      </div>
    </Shell>
  )
}

const kind = (q) => (isMC(q) ? (q.optionen.length === 5 ? 'x aus 5' : 'Ankreuzen') : 'schriftlich')
const scoresOf = (session, byNr, onlyRevealed) =>
  session.ids.filter((n) => byNr.has(n)).map((n) => {
    const a = session.answers[n] ?? {}
    return onlyRevealed && !a.revealed ? null : scoreQuestion(byNr.get(n), a)
  })

// ---------- Lernmodus ----------
function Learn({ byNr, catsOf, data, catPanel, setAnswer, session, setSession, finish }) {
  const ids = session.ids.filter((n) => byNr.has(n))
  const q = byNr.get(ids[session.idx])
  if (!q) return <Empty finish={finish} />
  const a = session.answers[q.nummer] ?? {}
  const last = session.idx >= ids.length - 1
  const next = () => (last ? finish() : setSession((s) => ({ ...s, idx: s.idx + 1 })))
  const names = data.categories.filter((c) => catsOf(q.nummer).has(c.id))
  const pct = totalPercent(scoresOf(session, byNr, true))

  return (
    <Shell meta={<>Lernmodus · bisher {pct} % <button className="btn small ghost" onClick={finish}>Beenden</button></>}>
      <div className="col">
        <div className="qhead">
          <span>Frage {session.idx + 1} von {ids.length} · Nr. {q.nummer} · {kind(q)}</span>
          <span className="qcats">{names.length ? names.map((c) => <span key={c.id} className="chip">{c.name}</span>) : <span className="chip none">ohne Kategorie</span>}</span>
        </div>
        <div className="bar"><span style={{ width: `${(100 * session.idx) / ids.length}%` }} /></div>
        <QuestionView q={q} a={a} set={setAnswer(q.nummer)} reveal={!!a.revealed} catPanel={catPanel(q)} />
        <div className="row between">
          {a.revealed ? <span /> : <button className="btn ghost" onClick={next}>Überspringen</button>}
          {a.revealed ? (
            <button className="btn primary" onClick={next}>{last ? 'Zur Auswertung' : 'Nächste Frage'}</button>
          ) : (
            <button className="btn primary" onClick={() => setAnswer(q.nummer)({ revealed: true })}>{isMC(q) ? 'Prüfen' : 'Auflösung zeigen'}</button>
          )}
        </div>
      </div>
    </Shell>
  )
}

// ---------- Klausurmodus ----------
function Exam({ byNr, setAnswer, session, setSession, finish }) {
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState(false)
  const left = session.endsAt - now
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (left <= 0) finish()
  }, [left <= 0])

  const ids = session.ids.filter((n) => byNr.has(n))
  const q = byNr.get(ids[session.idx])
  if (!q) return <Empty finish={finish} />
  const a = session.answers[q.nummer] ?? {}
  const go =(i) => setSession((s) => ({ ...s, idx: i }))
  const done = ids.filter((n) => hasAnswer(session.answers[n])).length
  const flagged = ids.filter((n) => session.answers[n]?.flagged).length
  const sec = Math.max(0, Math.floor(left / 1000))
  const clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

  return (
    <Shell
      meta={
        <>
          <span>verbleibend</span>
          <span className={`timer ${sec < 600 ? 'low' : ''}`} role="timer">{clock}</span>
          <button className={`btn small ${confirm ? 'primary' : ''}`} onClick={() => (confirm ? finish() : setConfirm(true))} onBlur={() => setConfirm(false)}>
            {confirm ? 'Wirklich abgeben?' : 'Abgeben'}
          </button>
        </>
      }
    >
      <div className="exam">
        <div>
          <div className="qhead">
            <span>Frage {session.idx + 1} von {ids.length} · {kind(q)}</span>
            <button className="btn small ghost" aria-pressed={!!a.flagged} onClick={() => setAnswer(q.nummer)({ flagged: !a.flagged })}>
              {a.flagged ? '⚑ Markiert als unsicher' : '⚐ Als unsicher markieren'}
            </button>
          </div>
          <QuestionView key={q.nummer} q={q} a={a} set={setAnswer(q.nummer)} reveal={false} />
          <div className="row between">
            <button className="btn" disabled={session.idx === 0} onClick={() => go(session.idx - 1)}>← Zurück</button>
            <button className="btn primary" disabled={session.idx >= ids.length - 1} onClick={() => go(session.idx + 1)}>Weiter →</button>
          </div>
        </div>
        <aside>
          <h3>Fragen</h3>
          <div className="grid">
            {ids.map((n, i) => {
              const an = session.answers[n]
              const cls = [hasAnswer(an) && 'done', i === session.idx && 'cur', an?.flagged && 'flag'].filter(Boolean).join(' ')
              return <button key={n} className={cls} aria-label={`Frage ${i + 1}`} aria-current={i === session.idx} onClick={() => go(i)}>{i + 1}</button>
            })}
          </div>
          <div className="legend">
            <span><i className="l-done" />beantwortet</span>
            <span><i />offen</span>
            <span><i className="l-flag" />markiert (unsicher)</span>
          </div>
          <p className="hint">{done} beantwortet · {ids.length - done} offen · {flagged} markiert</p>
        </aside>
      </div>
    </Shell>
  )
}

// ---------- Auswertung ----------
function Result({ byNr, session, open, onStart, reset }) {
  const exam = session.mode === 'exam'
  const rows = session.ids.filter((n) => byNr.has(n)).map((n) => {
    const q = byNr.get(n)
    const a = session.answers[n] ?? {}
    return { q, a, s: !exam && !a.revealed ? null : scoreQuestion(q, a), seen: exam || a.revealed }
  })
  const pending = rows.filter((r) => r.seen && !isMC(r.q) && r.s == null)
  const counted = rows.filter((r) => r.s)
  const pct = totalPercent(counted.map((r) => r.s))
  const sum = (list) => list.reduce((t, r) => t + r.s.points, 0)
  const mc = counted.filter((r) => isMC(r.q))
  const ft = counted.filter((r) => !isMC(r.q))
  const weak = rows.filter((r) => r.seen && (!r.s || r.s.points < r.s.max))
  const fmt = (x) => String(x).replace('.', ',')
  const mins = Math.round(((session.endedAt ?? Date.now()) - session.startedAt) / 60e3)

  return (
    <Shell meta={`${exam ? 'Klausur' : 'Lernmodus'} · ${mins} Min.`}>
      <div className="col">
        {pending.length > 0 && (
          <div className="panel todo">
            <b>{pending.length} schriftliche {pending.length === 1 ? 'Frage' : 'Fragen'} noch einstufen</b>
            <p>Vergleiche deine Antwort mit der Musterantwort und stufe dich ein. Danach steht der endgültige Prozentwert.</p>
            <button className="btn" onClick={() => open(pending[0].q.nummer)}>Jetzt einstufen</button>
          </div>
        )}
        <div className="res">
          <div className="big">{pct} %</div>
          <div className="kv">
            <span>x aus 5</span><span>{fmt(sum(mc))} / {mc.reduce((t, r) => t + r.s.max, 0)} Punkte</span>
            <span>Schriftlich</span><span>{fmt(sum(ft))} / {ft.length} {pending.length ? '(vorläufig)' : ''}</span>
            <span>Gewertet</span><span>{counted.length} von {rows.length} Fragen</span>
          </div>
        </div>
        <p className="hint">Jede Frage zählt gleich viel. Nicht bearbeitete Fragen im Lernmodus zählen nicht mit.</p>
        {weak.length > 0 && (
          <>
            <h3>Nicht voll richtig ({weak.length})</h3>
            <div className="tbl">
              <table>
                <thead><tr><th>Nr.</th><th>Frage</th><th>Punkte</th><th /></tr></thead>
                <tbody>
                  {weak.map(({ q, a, s }) => (
                    <tr key={q.nummer}>
                      <td className="num">{q.nummer}</td>
                      <td>
                        {q.frage.length > 140 ? q.frage.slice(0, 140) + ' …' : q.frage}{' '}
                        {a.flagged && <span className="badge miss">⚑ markiert</span>}
                        {exam && !hasAnswer(a) && <span className="badge bad">nicht beantwortet</span>}
                      </td>
                      <td className="num">{s ? `${fmt(s.points)} / ${s.max}` : 'offen'}</td>
                      <td><button className="btn small ghost" onClick={() => open(q.nummer)}>Ansehen</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <hr className="divider" />
        <div className="row">
          {weak.length > 0 && <button className="btn primary" onClick={() => onStart('learn', weak.map((r) => r.q.nummer))}>Diese Fragen im Lernmodus üben</button>}
          <button className="btn ghost" onClick={reset}>Zur Startseite</button>
        </div>
      </div>
    </Shell>
  )
}

function Review({ byNr, session, nummer, open, back, setAnswer, catPanel }) {
  const q = byNr.get(nummer)
  const a = session.answers[nummer] ?? {}
  const unrated = (n) => !isMC(byNr.get(n)) && session.answers[n]?.rating == null && (session.mode === 'exam' || session.answers[n]?.revealed)
  const nextPending = session.ids.find((n) => n !== nummer && byNr.has(n) && unrated(n))
  return (
    <Shell meta={<button className="btn small ghost" onClick={back}>← Zurück zur Auswertung</button>}>
      <div className="col">
        <div className="qhead"><span>Nr. {q.nummer} · {kind(q)}</span></div>
        <QuestionView key={nummer} q={q} a={a} set={setAnswer(nummer)} reveal catPanel={catPanel(q)} />
        <div className="row between">
          <button className="btn ghost" onClick={back}>Zur Auswertung</button>
          {nextPending != null && <button className="btn primary" onClick={() => open(nextPending)}>Nächste einstufen</button>}
        </div>
      </div>
    </Shell>
  )
}
