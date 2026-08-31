// SAC-103 Part 8: a real, committed verification script for Sentence
// Builder's curated content — corrects a real gap found while starting
// that round: SAC-097's own CLAUDE.md entry claimed "an automated
// verification script written specifically for this round" as if it were
// a durable project asset, but it only ever ran from a scratch/temp
// location and was never committed. This one is real, checked in, and
// runnable via `npm run verify-content`.
//
// SAC-104 extended this script for the new `englishTokens`/`englishSpan`
// data model (replacing `english`/`englishWord`), the two new categories
// ('article', 'infinitive'), and a heuristic check for likely violations
// of the round's clearer fixed-vs-slot authoring rule (a fixed article, or
// a fixed infinitive immediately after a modal verb slot) — flagged as a
// WARNING for manual review, not a hard error, since the check is a
// heuristic and not every possible false positive is worth failing the
// build over.
//
// Checks:
//   1. Structural correctness: every slot's correctAnswer is present in
//      its own options array; the assembled sentence (joining parts in
//      array order) has no empty/duplicate-space artifacts; every slot has
//      a valid englishSpan (a 2-element [start, end] array with
//      0 <= start <= end < englishTokens.length); fixed parts never carry
//      an englishSpan (they're never highlighted).
//   2. Grammar-explanation word coverage: every fixed `text` and every
//      slot's `correctAnswer` must be referenced somewhere in that
//      sentence's grammarExplanation (case-insensitive, ignoring a
//      trailing comma) — catches an explanation that skips a word Part 6
//      requires covering.
//   3. Plain-language-first style: any occurrence of a known grammar-
//      jargon term in an explanation or hint must be wrapped in
//      parentheses — a bare, unparenthesized jargon term is flagged as a
//      likely "jargon first" violation of the shared style rule.
//   4. SAC-104 heuristic rule-violation flags (warnings): a fixed part
//      whose text is a common article word, or a fixed part ending in a
//      typical infinitive ending (-ar/-er/-ir) sitting immediately after a
//      slot of category 'verb' — both signal a word that plausibly should
//      have been converted to a real quiz slot under this round's clearer
//      authoring rule.
//
// Run: node scripts/verifySentenceBuilderContent.mjs

import { SENTENCE_BUILDER_CONTENT, CATEGORIES } from '../src/data/sentenceBuilderContent.js'

// Deliberately conservative: real, exam-style grammar jargon this app's
// own style rule requires to be parenthesized, not generic English words
// that happen to co-occur with grammar talk. SAC-104 added 'infinitive' —
// already used with the established plain-language-first-then-parens
// pattern in SAC-103's beg-6/beg-7 explanations ("an infinitive, the plain
// unconjugated form"), now applied consistently to every new infinitive
// slot this round adds.
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
  'infinitive',
]

const ARTICLE_WORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'])

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
  const { id, difficulty, english, englishTokens, parts, grammarExplanation } = sentence

  if (idsSeen.has(id)) report(id, `duplicate sentence id`)
  idsSeen.add(id)

  if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty)) {
    report(id, `invalid difficulty "${difficulty}"`)
  }

  if (english !== undefined) {
    warn(id, `has a leftover "english" field from the pre-SAC-104 model — englishTokens[] is now the source of truth for display and highlighting`)
  }

  if (!Array.isArray(englishTokens) || englishTokens.length === 0) {
    report(id, `missing or empty englishTokens[]`)
    continue
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    report(id, `missing or empty parts[]`)
    continue
  }

  const assembledWords = []
  const allWordsForCoverage = []

  parts.forEach((part, partIdx) => {
    if (part.type === 'fixed') {
      if (!part.text || !part.text.trim()) {
        report(id, `a fixed part has empty text`)
        return
      }
      if (part.englishSpan !== undefined) {
        report(id, `fixed part "${part.text}" has an englishSpan — fixed parts are never highlighted, only slots are`)
      }
      assembledWords.push(part.text)
      allWordsForCoverage.push(stripTrailingPunct(part.text))

      // SAC-104 Part 4 heuristic: flag likely rule violations for manual
      // review rather than silently passing them.
      const bareLower = part.text.toLowerCase()
      if (ARTICLE_WORDS.has(bareLower)) {
        warn(id, `fixed part "${part.text}" is a common article word — review whether this should be an 'article' slot under the clearer authoring rule`)
      }
      if (/^[a-zà-ÿ]*(ar|er|ir)$/i.test(part.text)) {
        const prevPart = parts[partIdx - 1]
        if (prevPart && prevPart.type === 'slot' && prevPart.category === 'verb') {
          warn(id, `fixed part "${part.text}" ends in a typical infinitive ending and directly follows a verb slot — review whether this should be an 'infinitive' slot`)
        }
      }
    } else if (part.type === 'slot') {
      if (!CATEGORIES.includes(part.category)) {
        report(id, `slot has unknown category "${part.category}"`)
      }
      if (!part.correctAnswer) {
        report(id, `slot (${part.category}) missing correctAnswer`)
        return
      }
      if (!Array.isArray(part.options) || !part.options.includes(part.correctAnswer)) {
        report(id, `slot (${part.category}) correctAnswer "${part.correctAnswer}" not present in its own options`)
      }
      if (
        !Array.isArray(part.englishSpan) ||
        part.englishSpan.length !== 2 ||
        !Number.isInteger(part.englishSpan[0]) ||
        !Number.isInteger(part.englishSpan[1])
      ) {
        report(id, `slot (${part.category}) "${part.correctAnswer}" missing or malformed englishSpan`)
      } else {
        const [start, end] = part.englishSpan
        if (start < 0 || end < start || end >= englishTokens.length) {
          report(
            id,
            `slot (${part.category}) "${part.correctAnswer}" englishSpan [${start}, ${end}] out of bounds for englishTokens (length ${englishTokens.length})`
          )
        }
      }
      if (!part.hint) {
        report(id, `slot (${part.category}) missing hint`)
      } else {
        const hintViolations = findJargonViolations(part.hint)
        if (hintViolations.length > 0) {
          report(id, `slot (${part.category}) hint uses jargon term(s) without parentheses: ${hintViolations.join(', ')}`)
        }
      }

      // SAC-104: same-type distractor checks for the two new categories.
      if (part.category === 'article' && Array.isArray(part.options)) {
        const nonArticle = part.options.filter((o) => !ARTICLE_WORDS.has(o.toLowerCase()))
        if (nonArticle.length > 0) {
          report(id, `article slot "${part.correctAnswer}" has non-article option(s): ${nonArticle.join(', ')}`)
        }
      }
      if (part.category === 'infinitive' && Array.isArray(part.options)) {
        const nonInfinitive = part.options.filter((o) => !/^[a-zà-ÿ]*(ar|er|ir)$/i.test(o))
        if (nonInfinitive.length > 0) {
          report(id, `infinitive slot "${part.correctAnswer}" has non-infinitive-looking option(s): ${nonInfinitive.join(', ')}`)
        }
      }

      assembledWords.push(part.correctAnswer)
      allWordsForCoverage.push(stripTrailingPunct(part.correctAnswer))
    } else {
      report(id, `part has unknown type "${part.type}"`)
    }
  })

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
  // in the explanation (case-insensitive substring match).
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
}

// Difficulty-tier count check (15 per tier, 45 total).
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

// SAC-104: coverage sanity check for the two new categories — not a hard
// requirement of any specific count, just confirms both actually appear
// somewhere in the re-authored content rather than being defined but
// unused.
const categoryCounts = SENTENCE_BUILDER_CONTENT.reduce((acc, s) => {
  for (const part of s.parts) {
    if (part.type === 'slot') acc[part.category] = (acc[part.category] || 0) + 1
  }
  return acc
}, {})
console.log('Slot counts by category:', JSON.stringify(categoryCounts))
for (const newCategory of ['article', 'infinitive']) {
  if (!categoryCounts[newCategory]) {
    report(newCategory, `no slots of this new category appear anywhere in the content`)
  }
}

console.log(`\nTotal sentences: ${SENTENCE_BUILDER_CONTENT.length}`)
console.log(`Errors: ${errorCount}`)
console.log(`Warnings: ${warnCount}`)
process.exit(errorCount > 0 ? 1 : 0)
