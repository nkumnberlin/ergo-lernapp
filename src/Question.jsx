import { useState } from 'react'
import { isMC, correctLetters, hasInputMaterial, isUnsicher, scoreQuestion, solutionLines } from './model.js'

// **fett** aus den Lösungstexten
const Md = ({ text }) => text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))

export function QuestionView({ q, a, set, reveal, catPanel }) {
  const inputMaterial = hasInputMaterial(q.material)
  return (
    <>
      <h2 className="frage">{q.frage}</h2>
      {inputMaterial && <Material q={q} a={a} set={set} locked={reveal} />}
      {isMC(q) && <Options q={q} a={a} set={set} reveal={reveal} />}
      {!isMC(q) && !inputMaterial && !reveal && (
        <textarea
          id={`antwort-${q.nummer}`}
          className="answer"
          aria-label="Deine Antwort"
          placeholder="Deine Antwort …"
          value={a.text ?? ''}
          onChange={(e) => set({ text: e.target.value })}
        />
      )}
      {reveal && <Resolution q={q} a={a} set={set} inputMaterial={inputMaterial} />}
      {reveal && catPanel}
    </>
  )
}

function Options({ q, a, set, reveal }) {
  const right = correctLetters(q)
  const picked = a.picked ?? []
  const toggle = (b) => set({ picked: picked.includes(b) ? picked.filter((x) => x !== b) : [...picked, b] })
  return (
    <div className="opts">
      {q.optionen.map((o) => {
        const p = picked.includes(o.buchstabe)
        const r = right.includes(o.buchstabe)
        const cls = !reveal ? '' : p && r ? 'ok' : p ? 'bad' : r ? 'miss' : 'dim'
        return (
          <label key={o.buchstabe} className={`opt ${cls}`}>
            <span className="L">{o.buchstabe}</span>
            <input type="checkbox" checked={p} disabled={reveal} onChange={() => toggle(o.buchstabe)} />
            <span>{o.text}</span>
            <span className="tag">{{ ok: '✓ richtig, +1', bad: '✗ falsch, −1', miss: 'vergessen' }[cls]}</span>
          </label>
        )
      })}
    </div>
  )
}

function Material({ q, a, set, locked }) {
  const m = q.material
  const cells = a.cells ?? {}
  const setCell = (k, v) => set({ cells: { ...cells, [k]: v } })
  const field = (k, label) => (
    <textarea rows={2} aria-label={label} value={cells[k] ?? ''} readOnly={locked} onChange={(e) => setCell(k, e.target.value)} />
  )

  if (m.aussagen)
    return (
      <div className="mat">
        <table>
          <thead>
            <tr><th>Aussage</th><th className="c">wahr</th><th className="c">falsch</th></tr>
          </thead>
          <tbody>
            {m.aussagen.map((s, r) => (
              <tr key={r}>
                <td>{s}</td>
                {['wahr', 'falsch'].map((v) => (
                  <td key={v} className="c">
                    <input type="radio" name={`q${q.nummer}-${r}`} aria-label={`${v}: ${s}`} checked={cells[r] === v} disabled={locked} onChange={() => setCell(r, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  if (m.bereiche)
    return (
      <div className="bereiche">
        {m.hinweis && <p className="hint">{m.hinweis}</p>}
        {m.bereiche.map((b, i) => (
          <label key={i}>
            <b>{b}</b>
            {field(i, b)}
          </label>
        ))}
      </div>
    )

  const kreuz = m.ankreuzen ?? /kreuz/i.test(q.frage)
  const ts = m.textspalte ?? 0
  return (
    <>
      {m.begriffe && (
        <p className="begriffe">
          <span className="hint">Begriffe:</span> {m.begriffe.map((b) => <span key={b} className="chip">{b}</span>)}
        </p>
      )}
      <div className="mat">
        <table>
          <thead>
            <tr>{m.spalten.map((s, c) => <th key={c} className={kreuz && c !== ts ? 'c' : ''}>{s}</th>)}</tr>
          </thead>
          <tbody>
            {m.zeilen.map((z, r) => (
              <tr key={r}>
                {m.spalten.map((s, c) =>
                  c === ts ? (
                    <td key={c}>{z}</td>
                  ) : (
                    <td key={c} className={kreuz ? 'c' : 'in'}>
                      {kreuz ? (
                        <input type="checkbox" aria-label={`${z}: ${s}`} checked={!!cells[`${r}-${c}`]} disabled={locked} onChange={(e) => setCell(`${r}-${c}`, e.target.checked)} />
                      ) : (
                        field(`${r}-${c}`, `${z}: ${s}`)
                      )}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const RATINGS = [['richtig', 1, 'r1'], ['teilweise', 0.5, 'r2'], ['falsch', 0, 'r3']]

function Resolution({ q, a, set, inputMaterial }) {
  const s = scoreQuestion(q, a)
  const lines = solutionLines(q.loesung)
  const hasPoints = lines.some((l) => l.point)
  const checks = a.checks ?? []
  const model = (
    <div className="model">
      <h3>Musterantwort{hasPoints && ' · abhaken, was du hattest'}</h3>
      <ul className="check">
        {lines.map((l, i) => (
          <li key={i}>
            {l.point ? (
              <label>
                <input type="checkbox" checked={checks.includes(i)} onChange={() => set({ checks: checks.includes(i) ? checks.filter((x) => x !== i) : [...checks, i] })} />
                <span><Md text={l.text} /></span>
              </label>
            ) : (
              <p><Md text={l.text} /></p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <>
      {isUnsicher(q) && (
        <div className="warn"><b>Lösung unsicher.</b> Die Musterlösung ist nicht eindeutig belegt. Im Zweifel im Unterricht nachfragen.</div>
      )}
      {isMC(q) ? (
        <div className="panel score">
          <b>{s.points} / {s.max}</b>
          <span>Punkte für diese Frage</span>
          <small>+1 richtig, −1 falsch, nie unter 0. Richtig: {correctLetters(q).join(', ')}</small>
        </div>
      ) : (
        <>
          {inputMaterial ? model : (
            <div className="cmp">
              <div className="mine"><h3>Deine Antwort</h3><div className="pre">{a.text?.trim() || '(keine Antwort)'}</div></div>
              {model}
            </div>
          )}
          <div className="panel">
            <h3>Wie gut war deine Antwort insgesamt?</h3>
            <div className="rate" role="group" aria-label="Selbsteinstufung">
              {RATINGS.map(([label, v, cls]) => (
                <button key={v} className={cls} aria-pressed={a.rating === v} onClick={() => set({ rating: v })}>
                  {label} ({String(v).replace('.', ',')})
                </button>
              ))}
            </div>
            {hasPoints && <p className="hint">Die Checkliste ist nur eine Hilfe. Gewertet wird deine Einstufung.</p>}
          </div>
        </>
      )}
      <div className="panel">
        <h3>Erklärung</h3>
        {q.erklaerung ? <p className="pre">{q.erklaerung}</p> : <p className="empty">Für diese Frage ist noch keine Erklärung hinterlegt.</p>}
      </div>
    </>
  )
}

export function CatPanel({ nummer, mine, categories, toggle, create }) {
  const [open, setOpen] = useState(mine.size === 0) // ohne Kategorie: direkt offen, sonst nur Link
  const [name, setName] = useState('')
  if (!open)
    return <button className="linkbtn" onClick={() => setOpen(true)}>Kategorien bearbeiten</button>

  const add = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const existing = categories.find((c) => c.name.toLowerCase() === n.toLowerCase())
    if (existing) { if (!mine.has(existing.id)) toggle(nummer, existing.id) }
    else await create(n, nummer)
    setName('')
  }

  return (
    <div className="panel catpanel">
      <h3>Kategorien festlegen</h3>
      <p>{mine.size ? 'Klicke an, was passt (mehrere möglich).' : 'Diese Frage hat noch kein Thema. Klicke alle passenden an (mehrere möglich) oder lege ein neues an.'}</p>
      {categories.length > 0 && (
        <div className="chips" role="group" aria-label="Kategorien">
          {categories.map((c) => (
            <button key={c.id} aria-pressed={mine.has(c.id)} onClick={() => toggle(nummer, c.id)}>{c.name}</button>
          ))}
        </div>
      )}
      <form className="catrow" onSubmit={add}>
        <input type="text" id={`neu-${nummer}`} maxLength={60} placeholder="Neue Kategorie, z. B. Psychiatrie" aria-label="Neue Kategorie" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={!name.trim()}>Anlegen und zuordnen</button>
      </form>
      <p className="hint">Freiwillig. Weiter geht es auch ohne Auswahl.</p>
    </div>
  )
}
