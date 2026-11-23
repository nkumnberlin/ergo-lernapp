import { useState } from 'react'

const SHORT = 160

export function Manage({ data, catsOf, toggle, create, rename, remove, back }) {
  const [sel, setSel] = useState('alle') // 'alle' | 'ohne' | category id
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const cat = data.categories.find((c) => c.id === sel)

  const inSel = (q) => (sel === 'alle' ? true : sel === 'ohne' ? catsOf(q.nummer).size === 0 : catsOf(q.nummer).has(sel))
  const s = search.trim().toLowerCase()
  const list = data.questions.filter((q) => inSel(q) && (!s || String(q.nummer) === s || q.frage.toLowerCase().includes(s)))
  const count = (id) => data.links.filter((l) => l.category_id === id).length
  const nameOf = new Map(data.categories.map((c) => [c.id, c.name]))

  const add = async (e) => {
    e.preventDefault()
    const n = newName.trim()
    if (!n || data.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) return
    await create(n)
    setNewName('')
  }

  const side = [
    { id: 'alle', name: 'Alle Fragen', n: data.questions.length },
    ...data.categories.map((c) => ({ id: c.id, name: c.name, n: count(c.id) })),
    { id: 'ohne', name: 'Ohne Kategorie', n: data.questions.filter((q) => catsOf(q.nummer).size === 0).length },
  ]

  return (
    <div className="wrap">
      <header className="app">
        <span className="brand">Kategorien verwalten</span>
        <span className="meta"><button className="btn small ghost" onClick={back}>← Zur Startseite</button></span>
      </header>
      <div className="manage">
        <aside>
          <nav className="catlist" aria-label="Kategorien">
            {side.map((t) => (
              <button key={t.id} aria-current={sel === t.id} onClick={() => setSel(t.id)}>
                <span>{t.name}</span><span className="n">{t.n}</span>
              </button>
            ))}
          </nav>
          <form className="catrow" onSubmit={add}>
            <input type="text" id="neu-verwalten" maxLength={60} placeholder="Neue Kategorie" aria-label="Neue Kategorie" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn small" disabled={!newName.trim()}>Anlegen</button>
          </form>
        </aside>

        <section>
          {cat ? <CatHeader key={cat.id} cat={cat} n={count(cat.id)} rename={rename} remove={(id) => { setSel('alle'); remove(id) }} /> : <h1>{side.find((t) => t.id === sel).name}</h1>}
          <input type="search" id="suche" className="search" placeholder="Fragen durchsuchen (Text oder Nummer)" aria-label="Fragen durchsuchen" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="hint">{list.length} {list.length === 1 ? 'Frage' : 'Fragen'}</p>
          <ul className="qlist">
            {list.map((q) => {
              const mine = catsOf(q.nummer)
              const free = data.categories.filter((c) => !mine.has(c.id))
              return (
                <li key={q.nummer}>
                  <span className="num">{q.nummer}</span>
                  <div>
                    {q.frage.length > SHORT ? (
                      <details>
                        <summary>{q.frage.slice(0, SHORT)} …</summary>
                        <p className="pre">{q.frage}</p>
                      </details>
                    ) : (
                      <p className="pre">{q.frage}</p>
                    )}
                    <div className="qcats">
                      {[...mine].map((id) => (
                        <span key={id} className="chip">
                          {nameOf.get(id)}
                          <button className="x" aria-label={`${nameOf.get(id)} entfernen`} onClick={() => toggle(q.nummer, id)}>×</button>
                        </span>
                      ))}
                      {free.length > 0 && (
                        <select aria-label={`Kategorie zu Frage ${q.nummer} hinzufügen`} value="" onChange={(e) => toggle(q.nummer, +e.target.value)}>
                          <option value="">+ Kategorie …</option>
                          {free.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

function CatHeader({ cat, n, rename, remove }) {
  const [name, setName] = useState(cat.name)
  const [confirm, setConfirm] = useState(false)
  const changed = name.trim() && name.trim() !== cat.name
  return (
    <div className="cathead">
      <form className="catrow" onSubmit={(e) => { e.preventDefault(); if (changed) rename(cat.id, name.trim()) }}>
        <input type="text" id="umbenennen" maxLength={60} aria-label="Kategoriename" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn small" disabled={!changed}>Umbenennen</button>
      </form>
      {confirm ? (
        <div className="confirm">
          <span>Kategorie löschen? {n} {n === 1 ? 'Frage verliert' : 'Fragen verlieren'} diese Zuordnung. Die Fragen selbst bleiben erhalten.</span>
          <button className="btn small danger" onClick={() => remove(cat.id)}>Ja, löschen</button>
          <button className="btn small ghost" onClick={() => setConfirm(false)}>Abbrechen</button>
        </div>
      ) : (
        <button className="btn small ghost" onClick={() => setConfirm(true)}>Kategorie löschen</button>
      )}
    </div>
  )
}
