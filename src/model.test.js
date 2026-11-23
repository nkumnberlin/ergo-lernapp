import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuestion, totalPercent, validate, isUnsicher, solutionLines, fromJson } from './model.js'

const mc = { nummer: 1, frage: 'x', loesung: 'B, D', optionen: 'ABCDE'.split('').map((b) => ({ buchstabe: b, text: b })) }
const ft = { nummer: 2, frage: 'y', loesung: '1. a\n- b\nText', optionen: [] }

test('x aus 5: +1 richtig, −1 falsch, nie unter 0', () => {
  assert.deepEqual(scoreQuestion(mc, { picked: ['B', 'D'] }), { points: 2, max: 2 })
  assert.deepEqual(scoreQuestion(mc, { picked: ['B'] }), { points: 1, max: 2 })
  assert.deepEqual(scoreQuestion(mc, { picked: ['B', 'C'] }), { points: 0, max: 2 })
  assert.deepEqual(scoreQuestion(mc, { picked: ['A', 'C', 'E', 'B'] }), { points: 0, max: 2 })
  assert.deepEqual(scoreQuestion(mc, {}), { points: 0, max: 2 })
})

test('Freitext: Selbsteinstufung, ohne Einstufung nicht gewertet', () => {
  assert.equal(scoreQuestion(ft, {}), null)
  assert.deepEqual(scoreQuestion(ft, { rating: 0.5 }), { points: 0.5, max: 1 })
})

test('Gesamt: jede Frage gleich gewichtet', () => {
  assert.equal(totalPercent([{ points: 1, max: 2 }, { points: 1, max: 1 }, null]), 75)
  assert.equal(totalPercent([]), 0)
})

test('Import-Prüfung', () => {
  assert.equal(validate(mc), null)
  assert.match(validate({ ...mc, loesung: 'B, F' }), /F/)
  assert.match(validate(fromJson({ nummer: 3, frage: '', loesung: 'A' })), /frage/)
})

test('Unsicher-Erkennung und Checkliste', () => {
  assert.equal(isUnsicher({ loesung: 'Zuordnung (wahrscheinlich):\n1. x' }), true)
  assert.equal(isUnsicher(ft), false)
  assert.deepEqual(solutionLines(ft.loesung).map((l) => l.point), [true, true, false])
})
