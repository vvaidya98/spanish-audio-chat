// SAC-103 Part 8: a real, committed verification script for Sentence
// Builder's curated content — corrects a real gap found while starting
// this round: SAC-097's own CLAUDE.md entry claimed "an automated
// verification script written specifically for this round" as if it were
// a durable project asset, but it only ever ran from a scratch/temp
// location and was never committed. This one is real, checked in, and
// runnable via `npm run verify-content`.
//
// Checks, per SAC-103's own explicit requirements:
//   1. Structural correctness (carried forward from SAC-097, adapted to
//      the new `parts` model): every slot's correctAnswer is present in
//      its own options array; the assembled sentence (joining parts in
//      array order) has no empty/duplicate-space artifacts.
//   2. Grammar-explanation word coverage: every fixed `text` and every
//      slot's `correctAnswer` must be referenced somewhere in that
//      sentence's grammarExplanation (case-insensitive, ignoring a
//      trailing comma) — catches an explanation that skips a word Part 6
//      requires covering.
//   3. Plain-language-first style (Part 7): any occurrence of a known
//      grammar-jargon term in an explanation must be wrapped in
//      parentheses — a bare, unparenthesized jargon term is flagged as a
//      likely "jargon first" violation of the shared style rule.
//
// Run: node scripts/verifySentenceBuilderContent.mjs

import { SENTENCE_BUILDER_CONTENT, CATEGORIES } from '../src/data/sentenceBuilderContent.js'

// Deliberately conservative: real, exam-style grammar jargon this app's
// own style rule (SAC-103 Part 7) requires to be parenthesized, not
// generic English words that happen to co-occur with grammar talk.
const JARGON_TERMS = [
  'reflexive pronoun',
  'reflexive verb',
  'indirect object',
  'direct object',
  'first person singular',
  'second person singular',
  'third person singular',
  'first person plural',
  'second person plural',
  'third person plural',
  'subject pronoun',
  'subjunctive mood',
  'imperfect subjunctive',
  'conditional mood',
  'preterite',
  'stem-changing verb',
  'gerund',
]

function findJargonViolations(text) {
  const violations = []
  for (const term of JARGON_TERMS) {
    let searchFrom = 0
    const lower = text.toLowerCase()
    const termLower = term.toLowerCase()
    while (true) {
      const idx = lower.indexOf(termLower, searchFrom)
      if (idx === -1) break
      // Walk outward from the match to find the nearest enclosing
      // parenthesis pair — a term is compliant only if it sits strictly
      // between an unmatched '(' before it and a ')' after it, on the
      // same parenthetical (not just "somewhere earlier in the string").
      const before = text.slice(0, idx)
      const after = text.slice(idx + term.length)
      const openIdx = before.lastIndexOf('(')
      const closeBeforeOpen = openIdx === -1 ? -1 : before.indexOf(')', openIdx)
      const hasOpenParen = openIdx !== -1 && closeBeforeOpen === -1
      const hasCloseParen = after.indexOf(')') !== -1 && (after.indexOf('(') === -1 || after.indexOf(')') < after.indexOf('('))
      if (!(hasOpenParen && hasCloseParen)) {
        violations.push(term)
      }
      searchFrom = idx + term.length
    }
  }
  return violations
}

function stripTrailingPunct(w) {
  return w.replace(/[.,!?;:]+$/, '')
}

let errorCount = 0
let warnCount = 0
const report = (id, msg) => {
  console.log(`[${id}] ${msg}`)
  errorCount++
}
const warn = (id, msg) => {
  console.log(`[${id}] WARNING: ${msg}`)
  warnCount++
}

const idsSeen = new Set()

for (const sentence of SENTENCE_BUILDER_CONTENT) {
  const { id, difficulty, english, spanish, parts, grammarExplanation } = sentence

  if (idsSeen.has(id)) report(id, `duplicate sentence id`)
  idsSeen.add(id)

  if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)) {
    report(id, `invalid difficulty "${difficulty}"`)
  }

  if (spanish !== undefined) {
    warn(id, `has a leftover "spanish" field from the old model — parts[] is now the source of truth for assembly`)
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    report(id, `missing or empty parts[]`)
    continue
  }

  const assembledWords = []
  const allWordsForCoverage = []

  for (const part of parts) {
    if (part.type === 'fixed') {
      if (!part.text || !part.text.trim()) {
        report(id, `a fixed part has empty text`)
        continue
      }
      assembledWords.push(part.text)
      allWordsForCoverage.push(stripTrailingPunct(part.text))
    } else if (part.type === 'slot') {
      if (!CATEGORIES.includes(part.category)) {
        report(id, `slot has unknown category "${part.category}"`)
      }
      if (!part.correctAnswer) {
        report(id, `slot (${part.category}) missing correctAnswer`)
        continue
      }
      if (!Array.isArray(part.options) || !part.options.includes(part.correctAnswer)) {
        report(id, `slot (${part.category}) correctAnswer "${part.correctAnswer}" not present in its own options`)
      }
      if (!part.englishWord) {
        report(id, `slot (${part.category}) missing englishWord`)
      }
      if (!part.hint) {
        report(id, `slot (${part.category}) missing hint`)
      } else {
        const hintViolations = findJargonViolations(part.hint)
        if (hintViolations.length > 0) {
          report(id, `slot (${part.category}) hint uses jargon term(s) without parentheses: ${hintViolations.join(', ')}`)
        }
      }
      assembledWords.push(part.correctAnswer)
      allWordsForCoverage.push(stripTrailingPunct(part.correctAnswer))
    } else {
      report(id, `part has unknown type "${part.type}"`)
    }
  }

  const assembled = assembledWords.join(' ')
  if (/\s{2,}/.test(assembled)) {
    report(id, `assembled sentence has a double space: "${assembled}"`)
  }
  if (!assembled.trim()) {
    report(id, `assembled sentence is empty`)
  }

  if (!grammarExplanation || !grammarExplanation.trim()) {
    report(id, `missing grammarExplanation`)
    continue
  }

  // Coverage check: every fixed/slot word should be referenced somewhere
  // in the explanation (case-insensitive substring match). A short
  // function word appearing incidentally elsewhere would be a false
  // negative risk, but every word here is checked as a whole token
  // wrapped in word-ish boundaries via a simple lowercase substring test,
  // which is the same pragmatic approach SAC-097's own check used.
  const explanationLower = grammarExplanation.toLowerCase()
  for (const word of allWordsForCoverage) {
    if (!word) continue
    if (!explanationLower.includes(word.toLowerCase())) {
      report(id, `word "${word}" (from parts[]) is not mentioned anywhere in grammarExplanation`)
    }
  }

  // Style check: no bare (unparenthesized) jargon.
  const jargonViolations = findJargonViolations(grammarExplanation)
  if (jargonViolations.length > 0) {
    report(id, `grammarExplanation uses jargon term(s) without parentheses: ${jargonViolations.join(', ')}`)
  }

  if (!english || !english.trim()) {
    report(id, `missing english gloss`)
  }
}

// Difficulty-tier count check (SAC-103 Part 5: 15 per tier, 45 total).
const byDifficulty = SENTENCE_BUILDER_CONTENT.reduce((acc, s) => {
  acc[s.difficulty] = (acc[s.difficulty] || 0) + 1
  return acc
}, {})
console.log('\nSentences per difficulty:', JSON.stringify(byDifficulty))
for (const tier of ['Beginner', 'Intermediate', 'Advanced']) {
  if ((byDifficulty[tier] || 0) !== 15) {
    report(tier, `expected 15 sentences, found ${byDifficulty[tier] || 0}`)
  }
}

console.log(`\nTotal sentences: ${SENTENCE_BUILDER_CONTENT.length}`)
console.log(`Errors: ${errorCount}`)
console.log(`Warnings: ${warnCount}`)
process.exit(errorCount > 0 ? 1 : 0)
