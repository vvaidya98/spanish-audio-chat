// SAC-103: full rewrite of SAC-097's data model. Each sentence is now an
// ordered `parts` array where ARRAY ORDER IS SPANISH SENTENCE ORDER — this
// replaces the old slots+sentencePosition model entirely and eliminates
// the old answer-order/sentence-order distinction (SAC-097's category-
// priority quiz order genuinely differed from actual Spanish word order
// for several sentences, e.g. quizzing "es" before "carro" in "El carro
// rojo es caro" even though "carro" appears first — that's fixed here by
// construction, not by patching the old sort). Assembling the Spanish
// sentence is now just joining every part's `text` (fixed) or
// `correctAnswer` (slot) in array order; quizzing walks the slot-type
// parts in that same order.
//
// SAC-104: two changes to the data model itself. (1) `english` (a plain
// string) is replaced by `englishTokens` (an authored array of English
// words) — the display string is simply `englishTokens.join(' ')`, but
// having it pre-tokenized lets each slot carry an unambiguous
// `englishSpan: [startIdx, endIdxInclusive]` word-index range into that
// array, driving Part 1's synced highlight WITHOUT any runtime substring
// search — deliberately avoiding a repeat of SAC-097's original "to"
// substring-matching bug (a short word matching in the wrong place, or
// twice, or not at all). A `fixed` part never has an englishSpan — fixed
// words are never highlighted, since there's no decision being quizzed
// there for Part 1's highlight to track. Two idiomatic cases (reflexive
// constructions that don't decompose 1:1, e.g. "me llamo" = "my name is")
// intentionally give two adjacent slots the SAME span, since neither word
// maps to a single distinct English word on its own — both legitimately
// represent the same English phrase. Two other cases (a definite/
// indefinite article before a generic/uncountable noun that has no
// separate English article at all, e.g. "el café" for plain "coffee")
// share their noun slot's span for the same honest reason: there is no
// separate English word for the article to point at.
// (2) `englishWord` (the old per-slot restated-word string, used only by
// the caption) is gone — SAC-104 Part 1 replaces the caption's restated
// text with the highlight itself, so repeating it in a separate string
// would be redundant.
//
// SAC-104 Part 4 also re-authored fixed-vs-slot status under a clearer
// rule: a word becomes a slot if a learner could plausibly choose a real,
// wrong alternative in that exact context; a word stays fixed only when
// there's no meaningful alternative to weigh (conjunctions, negation,
// prepositions with only one sensible choice). Scoped explicitly to what
// the round named — articles ('article' category), infinitives directly
// following a modal/helper verb ('infinitive' category), and prepositions
// with a genuine fork (por/para, personal "a" — already handled via the
// existing 'preposition' category). Deliberately NOT expanded to other
// word classes that round (some conjugated "trigger" verbs like "Es"/
// "Dudo"/"Siento"/"Espero"/"Prefiero", the fixed idiom "tienes razón",
// certain adjectives/possessives/nouns like "rojo"/"mis"/"mesa") even
// where the same general rule would arguably support converting them too
// — that broader an expansion was never named in SAC-104's explicit
// scope. Flagged in CLAUDE.md as a disclosed scope boundary, not a silent
// gap — still true after this round, unchanged.
//
// SAC-105 Part 1: 'gerund' added as a category, covering the present
// participle (-ando/-iendo) in progressive constructions (estar + gerund)
// — the second instance of a general pattern this round names explicitly:
// any secondary verb form following a helper/auxiliary verb is a real
// decision point and deserves its own slot, the same reasoning SAC-104
// applied to modal+infinitive. Audited all 45 sentences for both this
// estar+gerund pattern and haber+past-participle (present perfect,
// e.g. "he estudiado") — found and converted exactly 2 instances of the
// former (int-4's "estudiando", adv-6's "lloviendo,", both previously
// fixed text), and confirmed ZERO instances of the latter anywhere in the
// current 45-sentence set (no sentence here uses present perfect at all)
// — so no 'participle' category was added this round; there was nothing
// real to convert it against, and inventing a haber+participle sentence
// just to justify an unused category would have been fabricated scope
// beyond "audit and convert what's found."
//
// Every sentence's Spanish grammar (conjugation, gender/number agreement,
// adjective placement, object-pronoun role, article gender/number,
// infinitive-after-modal and gerund-after-estar correctness) was manually
// re-verified word-by-word after each re-authoring pass — Colombian
// Spanish standard (tú not vos; "carro" not "coche"). Disclosed rather
// than assumed: this is AI-authored Spanish content, verified carefully
// by direct review, but (like every other generated Spanish in this app)
// would still benefit from a native-speaker spot check. Double-object-
// pronoun constructions (se lo, se la, etc.) remain deliberately avoided,
// per SAC-103.
//
// SAC-105 Part 2: `grammarExplanation` changed from one flowing prose
// string per sentence into an ARRAY of `{ spanish, note }` entries, one
// per word/phrase in Spanish-sentence order — rendered as a bold Spanish
// term followed by its own explanation, one entry per line, rather than
// one long inline paragraph. This is a deliberate, disclosed adaptation
// of the round's own literal example (a bare "**word** (gloss)" format,
// matching Translate/Listening's terser wordBreakdown style) rather than a
// literal copy of it: Sentence Builder's per-word notes have always
// carried real grammatical reasoning (verb endings, agreement, why a verb
// is subjunctive, etc.), not just a bare English gloss — collapsing that
// down to "word (gloss)" the way Translate/Listening's shared format does
// would have destroyed the actual pedagogical content Part 6 (SAC-103)
// was built to deliver. The array shape still satisfies Part 2's real
// goal (each Spanish term reads as its own bold, scannable line instead
// of running together in one paragraph) without losing any of the
// explanatory prose — see SentenceBuilderView.jsx's rendering and
// CLAUDE.md's Decisions Log for the full reasoning. Every entry's `note`
// still follows the shared style rule (plain language first, technical
// term in parentheses after) and every part of the sentence is still
// covered — both checked mechanically by
// scripts/verifySentenceBuilderContent.mjs against the new array shape.
export const CATEGORIES = [
  'pronoun',
  'object-pronoun',
  'verb',
  'noun',
  'adjective',
  'preposition',
  'adverb',
  'article',
  'infinitive',
  'gerund',
]

export const SENTENCE_BUILDER_CONTENT = [
  // ================= BEGINNER =================
  {
    id: 'beg-1',
    difficulty: 'Beginner',
    englishTokens: ['I', 'need', 'a', 'coffee'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Necesito',
        options: ['Necesito', 'Necesitas', 'Necesita', 'Necesitamos'],
        hint: '"Necesito" ends in -o, the ending Spanish uses for "I" (first person singular).',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'un',
        options: ['un', 'una', 'unos', 'unas'],
        hint: '"Café" is masculine, so "a" is "un", not "una".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'café',
        options: ['café', 'leche', 'agua', 'té'],
        hint: '"Café" is coffee — the others are milk, water, and tea.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Necesito', note: 'means "I need" — the -o ending shows who\'s doing it, "I" (first person singular).' },
      { spanish: 'Un', note: 'means "a", matching the masculine word that comes after it.' },
      { spanish: 'Café', note: 'means "coffee".' },
    ],
  },
  {
    id: 'beg-2',
    difficulty: 'Beginner',
    englishTokens: ['You', 'are', 'very', 'tired'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Estás',
        options: ['Estoy', 'Estás', 'Está', 'Estamos'],
        hint: '"Estás" is the form of estar used for "you" (tú), talking to one person informally.',
      },
      { type: 'fixed', text: 'muy' },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [3, 3],
        correctAnswer: 'cansado',
        options: ['cansado', 'cansada', 'cansados', 'cansadas'],
        hint: 'Here "tired" describes one masculine person, so no extra "a" or "s" is added.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Estás',
        note: 'means "you are" — the -ás ending is the "you" (tú, second person singular) form of estar, used for how someone feels right now, not a permanent trait.',
      },
      { spanish: 'Muy', note: 'means "very".' },
      {
        spanish: 'Cansado',
        note: 'means "tired" — it ends in -o here because it\'s describing one male (or default masculine) person (masculine singular).',
      },
    ],
  },
  {
    id: 'beg-3',
    difficulty: 'Beginner',
    englishTokens: ['We', 'eat', 'rice'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Comemos',
        options: ['Como', 'Comes', 'Come', 'Comemos'],
        hint: '"Comemos" ends in -mos, the ending Spanish uses for "we" (first person plural).',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'arroz',
        options: ['arroz', 'pan', 'queso', 'pollo'],
        hint: '"Arroz" is rice — the others are bread, cheese, and chicken.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Comemos', note: 'means "we eat" — the -mos ending shows "we" (first person plural) are doing it.' },
      {
        spanish: 'Arroz',
        note: 'means "rice" — no word for "the" is needed here since we\'re talking about rice in general, not a specific batch of it.',
      },
    ],
  },
  {
    id: 'beg-4',
    difficulty: 'Beginner',
    englishTokens: ['She', 'has', 'a', 'big', 'house'],
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishSpan: [0, 0],
        correctAnswer: 'Ella',
        options: ['Ella', 'Él', 'Ellos', 'Ellas'],
        hint: '"Ella" means "she" — "Él" would be "he".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [1, 1],
        correctAnswer: 'tiene',
        options: ['Tengo', 'Tienes', 'tiene', 'Tenemos'],
        hint: '"Tiene" is the form of tener used for "she/he/you(formal)" (third person singular).',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'una',
        options: ['una', 'un', 'unos', 'unas'],
        hint: '"Casa" is feminine, so "a" is "una", not "un".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'casa',
        options: ['casa', 'casas', 'cosa', 'mesa'],
        hint: '"Casa" is house — watch out, "cosa" (thing) looks similar but means something else.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [3, 3],
        correctAnswer: 'grande',
        options: ['grande', 'grandes', 'pequeña', 'bonita'],
        hint: 'Descriptive adjectives usually come AFTER the noun in Spanish — "casa grande", not "grande casa".',
      },
    ],
    grammarExplanation: [
      { spanish: 'Ella', note: 'means "she" (a subject pronoun).' },
      {
        spanish: 'Tiene',
        note: 'means "has" — the -e ending is the "she/he/you formal" form (third person singular) of tener.',
      },
      { spanish: 'Una', note: 'means "a", matching the feminine word "casa".' },
      { spanish: 'Casa', note: 'means "house".' },
      {
        spanish: 'Grande',
        note: 'means "big" — notice it comes AFTER the noun it describes, the normal word order in Spanish (unlike English, which puts "big" before "house").',
      },
    ],
  },
  {
    id: 'beg-5',
    difficulty: 'Beginner',
    englishTokens: ['The', 'children', 'are', 'happy'],
    parts: [
      {
        type: 'slot',
        category: 'article',
        englishSpan: [0, 0],
        correctAnswer: 'Los',
        options: ['Los', 'Las', 'El', 'La'],
        hint: '"Niños" is masculine plural, so "the" is "Los".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [1, 1],
        correctAnswer: 'niños',
        options: ['niños', 'niñas', 'niño', 'hombres'],
        hint: '"Niños" is children (or boys) — "niñas" would be girls only.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [2, 2],
        correctAnswer: 'están',
        options: ['Estoy', 'Estás', 'está', 'están'],
        hint: '"Están" is the form of estar used for "they" (third person plural).',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [3, 3],
        correctAnswer: 'felices',
        options: ['felices', 'feliz', 'tristes', 'cansados'],
        hint: 'Since "niños" is plural, "feliz" needs its plural form: "felices".',
      },
    ],
    grammarExplanation: [
      { spanish: 'Los', note: 'means "the", matching the masculine plural word after it.' },
      { spanish: 'Niños', note: 'means "children".' },
      {
        spanish: 'Están',
        note: 'means "are" — this uses estar (not ser) because it\'s describing how the children currently feel, a state rather than a permanent trait.',
      },
      { spanish: 'Felices', note: 'means "happy" — it takes the plural ending -es to match "niños".' },
    ],
  },
  {
    id: 'beg-6',
    difficulty: 'Beginner',
    englishTokens: ['I', 'want', 'to', 'go', 'to', 'the', 'beach'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Quiero',
        options: ['Quiero', 'Quieres', 'Quiere', 'Queremos'],
        hint: '"Quiero" is the "I" form of querer — notice the e changes to ie.',
      },
      {
        type: 'slot',
        category: 'infinitive',
        englishSpan: [2, 3],
        correctAnswer: 'ir',
        options: ['ir', 'nadar', 'comer', 'descansar'],
        hint: '"Ir" means "to go" — a plain, unconjugated form (an infinitive) used right after "quiero".',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [4, 4],
        correctAnswer: 'a',
        options: ['a', 'en', 'de', 'con'],
        hint: '"A" means "to" when pointing toward a destination.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [5, 5],
        correctAnswer: 'la',
        options: ['la', 'el', 'los', 'las'],
        hint: '"Playa" is feminine, so "the" is "la".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [6, 6],
        correctAnswer: 'playa',
        options: ['playa', 'montaña', 'ciudad', 'piscina'],
        hint: '"Playa" is beach — the others are mountain, city, and pool.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Quiero',
        note: 'means "I want" — querer changes its e to ie for "I", "you", "he/she", and "they" (a stem-changing verb).',
      },
      { spanish: 'Ir', note: 'means "to go" (an infinitive, the plain unconjugated form, used here right after "quiero").' },
      { spanish: 'A', note: 'means "to", pointing toward the destination.' },
      { spanish: 'La', note: 'means "the", matching the feminine word "playa".' },
      { spanish: 'Playa', note: 'means "beach".' },
    ],
  },
  {
    id: 'beg-7',
    difficulty: 'Beginner',
    englishTokens: ['We', 'can', 'go', 'out', 'tonight'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Podemos',
        options: ['Puedo', 'Puedes', 'Puede', 'Podemos'],
        hint: '"Podemos" is the "we" form of poder — unlike "I/you/he/she", "we" keeps the plain o, no ue change.',
      },
      {
        type: 'slot',
        category: 'infinitive',
        englishSpan: [2, 3],
        correctAnswer: 'salir',
        options: ['salir', 'comer', 'dormir', 'estudiar'],
        hint: '"Salir" means "to go out" — a plain, unconjugated form (an infinitive) used right after "podemos".',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [4, 4],
        correctAnswer: 'esta noche',
        options: ['esta noche', 'mañana', 'hoy', 'ahora'],
        hint: '"Esta noche" is tonight — the others are tomorrow, today, and now.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Podemos',
        note: 'means "we can" — poder changes o to ue for "I/you/he-she/they", but "we" (nosotros) keeps the plain o.',
      },
      { spanish: 'Salir', note: 'means "to go out" (an infinitive right after "podemos").' },
      { spanish: 'Esta noche', note: 'means "tonight" — a fixed time phrase, literally "this night".' },
    ],
  },
  {
    id: 'beg-8',
    difficulty: 'Beginner',
    englishTokens: ['I', 'speak', 'Spanish'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Hablo',
        options: ['Hablo', 'Hablas', 'Habla', 'Hablamos'],
        hint: '"Hablo" ends in -o, the "I" ending for regular -ar verbs like hablar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'español',
        options: ['español', 'inglés', 'francés', 'alemán'],
        hint: '"Español" is Spanish — the others are English, French, and German.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Hablo',
        note: 'means "I speak" — the -o ending marks it as the "I" (first person singular) form of the regular -ar verb hablar.',
      },
      { spanish: 'Español', note: 'means "Spanish" (the language) — no word for "the" is needed here.' },
    ],
  },
  {
    id: 'beg-9',
    difficulty: 'Beginner',
    englishTokens: ['I', 'live', 'in', 'Bogotá'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Vivo',
        options: ['Vivo', 'Vives', 'Vive', 'Vivimos'],
        hint: '"Vivo" ends in -o, the "I" ending for regular -ir verbs like vivir.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [2, 2],
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En" means "in" when talking about a place you\'re located.',
      },
      { type: 'fixed', text: 'Bogotá' },
    ],
    grammarExplanation: [
      {
        spanish: 'Vivo',
        note: 'means "I live" — the -o ending marks it as the "I" (first person singular) form of the regular -ir verb vivir.',
      },
      { spanish: 'En', note: 'means "in", showing where.' },
      { spanish: 'Bogotá', note: 'is the name of the city — it doesn\'t change between English and Spanish.' },
    ],
  },
  {
    id: 'beg-10',
    difficulty: 'Beginner',
    englishTokens: ['I', 'work', 'a', 'lot'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Trabajo',
        options: ['Trabajo', 'Trabajas', 'Trabaja', 'Trabajamos'],
        hint: '"Trabajo" ends in -o, the "I" ending for regular -ar verbs like trabajar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [2, 3],
        correctAnswer: 'mucho',
        options: ['mucho', 'poco', 'bien', 'mal'],
        hint: '"Mucho" is "a lot" — the others are "a little", "well", and "badly".',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Trabajo',
        note: 'means "I work" — the -o ending marks the "I" (first person singular) form of the regular -ar verb trabajar.',
      },
      { spanish: 'Mucho', note: 'means "a lot", describing how much you work (an adverb of degree).' },
    ],
  },
  {
    id: 'beg-11',
    difficulty: 'Beginner',
    englishTokens: ['I', 'study', 'every', 'day'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Estudio',
        options: ['Estudio', 'Estudias', 'Estudia', 'Estudiamos'],
        hint: '"Estudio" ends in -o, the "I" ending for regular -ar verbs like estudiar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [2, 3],
        correctAnswer: 'todos los días',
        options: ['todos los días', 'todos los meses', 'cada semana', 'siempre'],
        hint: '"Todos los días" is "every day" — the others are "every month", "each week", and "always".',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Estudio',
        note: 'means "I study" — the -o ending marks the "I" (first person singular) form of the regular -ar verb estudiar.',
      },
      { spanish: 'Todos los días', note: 'means "every day", a fixed time phrase — literally "all the days".' },
    ],
  },
  {
    id: 'beg-12',
    difficulty: 'Beginner',
    englishTokens: ['I', 'read', 'an', 'interesting', 'book'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Leo',
        options: ['Leo', 'Lees', 'Lee', 'Leemos'],
        hint: '"Leo" ends in -o, the "I" ending for regular -er verbs like leer.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'un',
        options: ['un', 'una', 'unos', 'unas'],
        hint: '"Libro" is masculine, so "a" is "un", not "una".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'libro',
        options: ['libro', 'periódico', 'revista', 'cuento'],
        hint: '"Libro" is book — the others are newspaper, magazine, and story.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [3, 3],
        correctAnswer: 'interesante',
        options: ['interesante', 'aburrido', 'interesantes', 'largo'],
        hint: '"Interesante" doesn\'t change for gender — it stays the same for masculine or feminine.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Leo',
        note: 'means "I read" — the -o ending marks the "I" (first person singular) form of the regular -er verb leer.',
      },
      { spanish: 'Un', note: 'means "a", matching the masculine word "libro".' },
      { spanish: 'Libro', note: 'means "book".' },
      {
        spanish: 'Interesante',
        note: 'means "interesting" — it comes after the noun, and its -e ending doesn\'t change for masculine or feminine.',
      },
    ],
  },
  {
    id: 'beg-13',
    difficulty: 'Beginner',
    englishTokens: ['We', 'drink', 'cold', 'water'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Bebemos',
        options: ['Bebo', 'Bebes', 'Bebe', 'Bebemos'],
        hint: '"Bebemos" ends in -mos, the "we" ending for regular -er verbs like beber.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'agua',
        options: ['agua', 'jugo', 'leche', 'refresco'],
        hint: '"Agua" is water — the others are juice, milk, and soda.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [2, 2],
        correctAnswer: 'fría',
        options: ['fría', 'frío', 'frías', 'caliente'],
        hint: '"Agua" is a feminine word, so the adjective needs the feminine ending: "fría".',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Bebemos',
        note: 'means "we drink" — the -mos ending marks the "we" (first person plural) form of the regular -er verb beber.',
      },
      {
        spanish: 'Agua',
        note: 'means "water" (a feminine word, even though it uses "el" instead of "la" when a direct article is needed — a spelling quirk that doesn\'t apply here since there\'s no article).',
      },
      { spanish: 'Fría', note: 'means "cold" — it takes the feminine ending -a to agree with "agua".' },
    ],
  },
  {
    id: 'beg-14',
    difficulty: 'Beginner',
    englishTokens: ['I', 'listen', 'to', 'music'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'Escucho',
        options: ['Escucho', 'Escuchas', 'Escucha', 'Escuchamos'],
        hint: '"Escucho" ends in -o, the "I" ending for regular -ar verbs like escuchar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'música',
        options: ['música', 'radio', 'canción', 'podcast'],
        hint: '"Música" is music — "canción" would specifically mean "a song".',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Escucho',
        note: 'means "I listen to" — the -o ending marks the "I" (first person singular) form of the regular -ar verb escuchar. Notice Spanish doesn\'t need a separate word for "to" here, unlike English "listen TO".',
      },
      { spanish: 'Música', note: 'means "music".' },
    ],
  },
  {
    id: 'beg-15',
    difficulty: 'Beginner',
    englishTokens: ['My', 'name', 'is', 'Ana'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [0, 2],
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Se', 'Nos'],
        hint: '"Me" here means the action happens to yourself (a reflexive pronoun) — literally "I call myself".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'llamo',
        options: ['llamo', 'llamas', 'llama', 'llamamos'],
        hint: '"Llamo" is the "I" form of llamar(se) — "me llamo" together means "my name is", literally "I call myself".',
      },
      { type: 'fixed', text: 'Ana' },
    ],
    grammarExplanation: [
      {
        spanish: 'Me',
        note: 'here means the action happens to yourself (a reflexive pronoun) — you\'re not naming someone else, you\'re naming yourself.',
      },
      {
        spanish: 'Llamo',
        note: 'means "I call" — together, "me llamo" literally means "I call myself", which is how Spanish says "my name is".',
      },
      { spanish: 'Ana', note: 'is a name, so it doesn\'t change between languages.' },
    ],
  },

  // ================= INTERMEDIATE =================
  {
    id: 'int-1',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'like', 'coffee'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [0, 1],
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Le', 'Nos'],
        hint: '"Me" here means "to me" — who\'s affected by the thing being pleasing (an indirect object). Literally, coffee is pleasing TO ME.',
      },
      { type: 'fixed', text: 'gusta' },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'el',
        options: ['el', 'la', 'los', 'las'],
        hint: '"Café" is masculine, so "the" is "el", even though English doesn\'t need "the" here.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'café',
        options: ['café', 'té', 'chocolate', 'jugo'],
        hint: '"Café" is coffee — the others are tea, chocolate, and juice.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Me',
        note: 'here means "to me" — who\'s affected by the thing being pleasing (an indirect object), not the one doing an action.',
      },
      {
        spanish: 'Gusta',
        note: 'means "is pleasing" — it agrees with "el café" (singular), not with "me". Spanish literally says "coffee is pleasing to me" instead of English\'s "I like coffee".',
      },
      { spanish: 'El', note: 'means "the", matching the masculine word "café" — Spanish needs it here even though English doesn\'t.' },
      { spanish: 'Café', note: 'means "coffee".' },
    ],
  },
  {
    id: 'int-2',
    difficulty: 'Intermediate',
    englishTokens: ['The', 'red', 'car', 'is', 'expensive'],
    parts: [
      {
        type: 'slot',
        category: 'article',
        englishSpan: [0, 0],
        correctAnswer: 'El',
        options: ['El', 'La', 'Los', 'Las'],
        hint: '"Carro" is masculine, so "the" is "El".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'carro',
        options: ['carro', 'carros', 'carta', 'casa'],
        hint: '"Carro" is car (the word used in Latin America — Spain more often says "coche").',
      },
      { type: 'fixed', text: 'rojo' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [3, 3],
        correctAnswer: 'es',
        options: ['Soy', 'Eres', 'es', 'Somos'],
        hint: '"Es" (ser) is used here because being expensive is a lasting characteristic, not a temporary state.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [4, 4],
        correctAnswer: 'caro',
        options: ['caro', 'cara', 'caros', 'barato'],
        hint: '"Carro" is masculine singular, so the adjective needs to match: "caro", not "cara".',
      },
    ],
    grammarExplanation: [
      { spanish: 'El', note: 'means "the", matching masculine "carro".' },
      { spanish: 'Carro', note: 'means "car".' },
      { spanish: 'Rojo', note: 'means "red" — it comes right after the noun it describes, the normal Spanish word order.' },
      {
        spanish: 'Es',
        note: 'means "is" — this uses ser (not estar) because being expensive is a lasting trait of the car, not a temporary state.',
      },
      { spanish: 'Caro', note: 'means "expensive" — it matches masculine singular "carro".' },
    ],
  },
  {
    id: 'int-3',
    difficulty: 'Intermediate',
    englishTokens: ['I', "don't", 'have', 'money'],
    parts: [
      { type: 'fixed', text: 'No' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [2, 2],
        correctAnswer: 'tengo',
        options: ['tengo', 'tienes', 'tiene', 'tenemos'],
        hint: '"Tengo" is the "I" form of tener — Spanish just adds "no" before the verb to say "don\'t/doesn\'t".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'dinero',
        options: ['dinero', 'tiempo', 'trabajo', 'hambre'],
        hint: '"Dinero" is money — the others are time, work, and hunger.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'No',
        note: 'means "not/don\'t" — Spanish makes a verb negative just by putting "no" directly in front of it, with no extra helper word like English "do".',
      },
      { spanish: 'Tengo', note: 'means "I have" — the -o ending marks the "I" (first person singular) form of tener.' },
      { spanish: 'Dinero', note: 'means "money".' },
    ],
  },
  {
    id: 'int-4',
    difficulty: 'Intermediate',
    englishTokens: ['They', 'are', 'studying', 'Spanish'],
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishSpan: [0, 0],
        correctAnswer: 'Ellos',
        options: ['Ellos', 'Ellas', 'Nosotros', 'Ustedes'],
        hint: '"Ellos" means "they" (a group that includes at least one male, or a mixed/unknown group).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [1, 1],
        correctAnswer: 'están',
        options: ['Estoy', 'Estás', 'está', 'están'],
        hint: '"Están" + "estudiando" together mean "are studying" — "están" is the "they" form of estar.',
      },
      {
        type: 'slot',
        category: 'gerund',
        englishSpan: [2, 2],
        correctAnswer: 'estudiando',
        options: ['estudiando', 'estudiar', 'estudia', 'trabajando'],
        hint: '"Estudiando" means "studying" — the -ando form Spanish uses for an ongoing action (a gerund), paired with "están" — not the plain unconjugated form "estudiar" or a conjugated form like "estudia".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'español',
        options: ['español', 'inglés', 'francés', 'alemán'],
        hint: '"Español" is Spanish — the others are English, French, and German.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Ellos', note: 'means "they".' },
      {
        spanish: 'Están',
        note: 'means "are" — combined with "estudiando" (studying), it forms the "are studying" progressive tense, similar to English "-ing".',
      },
      {
        spanish: 'Estudiando',
        note: 'means "studying" — the form Spanish uses for an ongoing action (a gerund); it doesn\'t change based on who\'s doing it.',
      },
      { spanish: 'Español', note: 'means "Spanish" (the language).' },
    ],
  },
  {
    id: 'int-5',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'see', 'you', 'in', 'the', 'park'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'Te',
        options: ['Te', 'Me', 'Lo', 'Nos'],
        hint: '"Te" here means "you" as the person being seen — the one the action is done to (a direct object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'veo',
        options: ['veo', 'ves', 've', 'vemos'],
        hint: '"Veo" is the irregular "I" form of ver.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [3, 3],
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En" means "in" when describing a location.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [4, 4],
        correctAnswer: 'el',
        options: ['el', 'la', 'los', 'las'],
        hint: '"Parque" is masculine, so "the" is "el".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [5, 5],
        correctAnswer: 'parque',
        options: ['parque', 'jardín', 'centro', 'edificio'],
        hint: '"Parque" is park — the others are garden, downtown, and building.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Te',
        note: 'here means "you" as the person being seen — the one the action happens to directly (a direct object), placed before the verb in Spanish rather than after it like English.',
      },
      { spanish: 'Veo', note: 'means "I see" — an irregular "I" form of ver.' },
      { spanish: 'En', note: 'means "in".' },
      { spanish: 'El', note: 'means "the", matching masculine "parque".' },
      { spanish: 'Parque', note: 'means "park".' },
    ],
  },
  {
    id: 'int-6',
    difficulty: 'Intermediate',
    englishTokens: ['She', 'helps', 'us', 'a', 'lot'],
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishSpan: [0, 0],
        correctAnswer: 'Ella',
        options: ['Ella', 'Él', 'Ellos', 'Usted'],
        hint: '"Ella" means "she".',
      },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'nos',
        options: ['nos', 'me', 'te', 'les'],
        hint: '"Nos" here means "us" as the people being helped — the ones the action happens to directly (a direct object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [1, 1],
        correctAnswer: 'ayuda',
        options: ['ayudo', 'ayudas', 'ayuda', 'ayudamos'],
        hint: '"Ayuda" is the "she/he/you(formal)" form of ayudar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [3, 4],
        correctAnswer: 'mucho',
        options: ['mucho', 'poco', 'bien', 'siempre'],
        hint: '"Mucho" is "a lot" — the others are "a little", "well", and "always".',
      },
    ],
    grammarExplanation: [
      { spanish: 'Ella', note: 'means "she".' },
      {
        spanish: 'Nos',
        note: 'here means "us" as the people being helped directly (a direct object) — placed before the verb, unlike English which places "us" after "helps".',
      },
      {
        spanish: 'Ayuda',
        note: 'means "helps" — the -a ending is the "she/he/you formal" form (third person singular) of ayudar.',
      },
      { spanish: 'Mucho', note: 'means "a lot".' },
    ],
  },
  {
    id: 'int-7',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'wrote', 'him', 'a', 'letter'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who received the letter (an indirect object), not the letter itself.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'escribí',
        options: ['escribí', 'escribiste', 'escribió', 'escribimos'],
        hint: '"Escribí" is the "I" past-tense (preterite) form of escribir.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [3, 3],
        correctAnswer: 'una',
        options: ['una', 'un', 'unos', 'unas'],
        hint: '"Carta" is feminine, so "a" is "una".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'carta',
        options: ['carta', 'nota', 'postal', 'carro'],
        hint: '"Carta" is letter — don\'t confuse it with "carro" (car).',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Le',
        note: 'here means "to him" — who received the letter (an indirect object), separate from the letter itself, and it goes before the verb in Spanish.',
      },
      { spanish: 'Escribí', note: 'means "I wrote" — the past-tense (preterite) "I" form of escribir.' },
      { spanish: 'Una', note: 'means "a", matching feminine "carta".' },
      { spanish: 'Carta', note: 'means "letter".' },
    ],
  },
  {
    id: 'int-8',
    difficulty: 'Intermediate',
    englishTokens: ['We', 'get', 'up', 'early'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [0, 2],
        correctAnswer: 'Nos',
        options: ['Nos', 'Me', 'Te', 'Se'],
        hint: '"Nos" here means the action happens to yourselves as a group — literally "we get ourselves up" (a reflexive pronoun).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'levantamos',
        options: ['levanto', 'levantas', 'levanta', 'levantamos'],
        hint: '"Levantamos" is the "we" form of levantar(se).',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [3, 3],
        correctAnswer: 'temprano',
        options: ['temprano', 'tarde', 'pronto', 'ahora'],
        hint: '"Temprano" is early — the others are late, soon, and now.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Nos',
        note: 'here means the action happens to yourselves as a group (a reflexive pronoun) — literally "we get ourselves up".',
      },
      { spanish: 'Levantamos', note: 'means "get up" — the -mos ending is the "we" form of levantar(se).' },
      { spanish: 'Temprano', note: 'means "early".' },
    ],
  },
  {
    id: 'int-9',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'arrived', 'late'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Llegué',
        options: ['Llegué', 'Llegaste', 'Llegó', 'Llegamos'],
        hint: '"Llegué" is the past-tense (preterite) "I" form of llegar — notice the spelling change to "gué" to keep the hard g sound.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [2, 2],
        correctAnswer: 'tarde',
        options: ['tarde', 'temprano', 'pronto', 'ahora'],
        hint: '"Tarde" is late — the others are early, soon, and now.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Llegué',
        note: 'means "I arrived" — the past-tense (preterite) "I" form of llegar. It\'s spelled with "gué" instead of just "gé" to keep the hard g sound of llegar (a small, common spelling change in -gar verbs).',
      },
      { spanish: 'Tarde', note: 'means "late".' },
    ],
  },
  {
    id: 'int-10',
    difficulty: 'Intermediate',
    englishTokens: ['We', 'buy', 'gifts', 'for', 'them'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Compramos',
        options: ['Compro', 'Compras', 'Compra', 'Compramos'],
        hint: '"Compramos" is the "we" form of comprar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'regalos',
        options: ['regalos', 'flores', 'dulces', 'libros'],
        hint: '"Regalos" is gifts — the others are flowers, sweets, and books.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [3, 3],
        correctAnswer: 'para',
        options: ['para', 'por', 'de', 'con'],
        hint: '"Para" means "for" here — a common mix-up with "por", which also means "for" but in a different sense (like "because of").',
      },
      { type: 'fixed', text: 'ellos' },
    ],
    grammarExplanation: [
      { spanish: 'Compramos', note: 'means "we buy" — the -mos ending is the "we" form of comprar.' },
      { spanish: 'Regalos', note: 'means "gifts".' },
      {
        spanish: 'Para',
        note: 'means "for", showing who the gifts are intended for — different from "por", which also means "for" but in the sense of "because of" or "by".',
      },
      { spanish: 'Ellos', note: 'means "them".' },
    ],
  },
  {
    id: 'int-11',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'look', 'for', 'my', 'keys'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'Busco',
        options: ['Busco', 'Buscas', 'Busca', 'Buscamos'],
        hint: '"Busco" is the "I" form of buscar. Notice Spanish doesn\'t need a separate word for "for" — buscar already means "to look for".',
      },
      { type: 'fixed', text: 'mis' },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'llaves',
        options: ['llaves', 'gafas', 'zapatos', 'documentos'],
        hint: '"Llaves" is keys — the others are glasses, shoes, and documents.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Busco',
        note: 'means "I look for" — buscar already includes the idea of "for", so Spanish doesn\'t need an extra word for it.',
      },
      { spanish: 'Mis', note: 'means "my" (plural, matching "llaves").' },
      { spanish: 'Llaves', note: 'means "keys".' },
    ],
  },
  {
    id: 'int-12',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'find', 'the', 'solution'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Encuentro',
        options: ['Encuentro', 'Encuentras', 'Encuentra', 'Encontramos'],
        hint: '"Encuentro" is encontrar with its o changed to ue for "I" — but "we" (encontramos) keeps the plain o.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'la',
        options: ['la', 'el', 'los', 'las'],
        hint: '"Solución" is feminine, so "the" is "la".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'solución',
        options: ['solución', 'respuesta', 'idea', 'pregunta'],
        hint: '"Solución" is solution — the others are answer, idea, and question.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Encuentro',
        note: 'means "I find" — encontrar changes its o to ue for "I/you/he-she/they" (a stem-changing verb), but not for "we".',
      },
      { spanish: 'La', note: 'means "the", matching feminine "solución".' },
      { spanish: 'Solución', note: 'means "solution".' },
    ],
  },
  {
    id: 'int-13',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'show', 'him', 'the', 'photos'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who receives the showing (an indirect object), separate from the photos themselves.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'muestro',
        options: ['muestro', 'muestras', 'muestra', 'mostramos'],
        hint: '"Muestro" is mostrar with its o changed to ue for "I".',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [3, 3],
        correctAnswer: 'las',
        options: ['las', 'los', 'la', 'el'],
        hint: '"Fotos" is feminine plural, so "the" is "las".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'fotos',
        options: ['fotos', 'videos', 'dibujos', 'documentos'],
        hint: '"Fotos" is photos — the others are videos, drawings, and documents.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Le',
        note: 'here means "to him" — who receives the showing (an indirect object), separate from what\'s being shown, and it goes before the verb.',
      },
      {
        spanish: 'Muestro',
        note: 'means "I show" — mostrar changes its o to ue for "I/you/he-she/they" (a stem-changing verb).',
      },
      { spanish: 'Las', note: 'means "the" (feminine plural, matching "fotos").' },
      { spanish: 'Fotos', note: 'means "photos".' },
    ],
  },
  {
    id: 'int-14',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'ask', 'them', 'something'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'Les',
        options: ['Les', 'Le', 'Nos', 'Te'],
        hint: '"Les" here means "to them" (plural) — who\'s being asked (an indirect object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'pregunto',
        options: ['pregunto', 'preguntas', 'pregunta', 'preguntamos'],
        hint: '"Pregunto" is the "I" form of preguntar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'algo',
        options: ['algo', 'nada', 'todo', 'eso'],
        hint: '"Algo" is something — the others are nothing, everything, and that.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Les',
        note: 'here means "to them" (plural) — who\'s being asked (an indirect object), placed before the verb.',
      },
      { spanish: 'Pregunto', note: 'means "I ask" — the -o ending is the "I" (first person singular) form of preguntar.' },
      { spanish: 'Algo', note: 'means "something".' },
    ],
  },
  {
    id: 'int-15',
    difficulty: 'Intermediate',
    englishTokens: ['I', 'ask', 'for', 'help'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'Pido',
        options: ['Pido', 'Pides', 'Pide', 'Pedimos'],
        hint: '"Pido" is pedir with its e changed to i for "I" — pedir already means "to ask for", no extra word needed.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [3, 3],
        correctAnswer: 'ayuda',
        options: ['ayuda', 'consejo', 'perdón', 'permiso'],
        hint: '"Ayuda" is help — the others are advice, forgiveness, and permission.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Pido',
        note: 'means "I ask for" — pedir changes its e to i for "I/you/he-she/they" (a stem-changing verb), and already includes the idea of "for", so no extra word is needed.',
      },
      { spanish: 'Ayuda', note: 'means "help".' },
    ],
  },

  // ================= ADVANCED =================
  {
    id: 'adv-1',
    difficulty: 'Advanced',
    englishTokens: ['I', 'hope', 'that', 'you', 'arrive', 'on', 'time'],
    parts: [
      { type: 'fixed', text: 'Espero' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [3, 4],
        correctAnswer: 'llegues',
        options: ['llegues', 'llega', 'llegue', 'lleguemos'],
        hint: '"Espero que" makes what follows uncertain/hoped-for rather than a stated fact — this triggers a special verb mood (the subjunctive). "Llegues" is that mood\'s "you" form of llegar.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [5, 5],
        correctAnswer: 'a',
        options: ['a', 'en', 'de', 'con'],
        hint: '"A tiempo" is the fixed phrase for "on time".',
      },
      { type: 'fixed', text: 'tiempo' },
    ],
    grammarExplanation: [
      { spanish: 'Espero', note: 'means "I hope".' },
      { spanish: 'Que', note: 'means "that", introducing what\'s hoped for.' },
      {
        spanish: 'Llegues',
        note: 'means "(you) arrive" — because it follows "espero que" (something hoped for, not a stated fact), the verb switches to a special mood for uncertain/hoped-for actions (the subjunctive) — its "you" form.',
      },
      { spanish: 'A', note: 'means "on" here, as part of the fixed phrase "a tiempo" ("on time").' },
      { spanish: 'Tiempo', note: 'means "time".' },
    ],
  },
  {
    id: 'adv-2',
    difficulty: 'Advanced',
    englishTokens: ['It', 'is', 'important', 'that', 'we', 'study', 'every', 'day'],
    parts: [
      { type: 'fixed', text: 'Es' },
      {
        type: 'slot',
        category: 'adjective',
        englishSpan: [2, 2],
        correctAnswer: 'importante',
        options: ['importante', 'importantes', 'necesario', 'urgente'],
        hint: '"Importante" doesn\'t change for gender, and stays singular here since it describes the whole idea, not a plural noun.',
      },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [4, 5],
        correctAnswer: 'estudiemos',
        options: ['estudie', 'estudies', 'estudiamos', 'estudiemos'],
        hint: '"Es importante que" makes what follows a recommendation, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Estudiemos" is that form\'s "we" form of estudiar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [6, 7],
        correctAnswer: 'todos los días',
        options: ['todos los días', 'todos los meses', 'cada semana', 'siempre'],
        hint: '"Todos los días" is "every day".',
      },
    ],
    grammarExplanation: [
      { spanish: 'Es', note: 'means "is".' },
      {
        spanish: 'Importante',
        note: 'means "important" — it doesn\'t change for gender, and here it describes the whole idea of studying, not one specific noun.',
      },
      { spanish: 'Que', note: 'means "that".' },
      {
        spanish: 'Estudiemos',
        note: 'means "(we) study" — because it follows "es importante que" (a recommendation, not a stated fact), the verb switches to a special form used for recommended or hoped-for actions (the subjunctive mood), here in its "we" form.',
      },
      { spanish: 'Todos los días', note: 'means "every day".' },
    ],
  },
  {
    id: 'adv-3',
    difficulty: 'Advanced',
    englishTokens: ['If', 'I', 'had', 'more', 'time', 'I', 'would', 'travel'],
    parts: [
      { type: 'fixed', text: 'Si' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [1, 2],
        correctAnswer: 'tuviera',
        options: ['tuviera', 'tuvieras', 'tuviéramos', 'tenía'],
        hint: 'Spanish needs a special past-tense verb form for that (the imperfect subjunctive) here, of tener — "tuviera" is its "I" form.',
      },
      { type: 'fixed', text: 'más' },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'tiempo',
        options: ['tiempo', 'dinero', 'trabajo', 'espacio'],
        hint: '"Tiempo" is time — the others are money, work, and space.',
      },
      { type: 'fixed', text: 'viajaría' },
    ],
    grammarExplanation: [
      { spanish: 'Si', note: 'means "if".' },
      {
        spanish: 'Tuviera',
        note: 'means "(I) had" — since this "if" describes something not actually true right now (a hypothetical), Spanish uses a special past-tense form for that (the imperfect subjunctive mood), here the "I" form of tener.',
      },
      { spanish: 'Más', note: 'means "more".' },
      { spanish: 'Tiempo', note: 'means "time".' },
      {
        spanish: 'Viajaría',
        note: 'means "I would travel" — the -ía ending marks a special form used for "would" actions (the conditional mood).',
      },
    ],
  },
  {
    id: 'adv-4',
    difficulty: 'Advanced',
    englishTokens: ['The', 'letter', 'that', 'I', 'wrote', 'to', 'him', 'is', 'on', 'the', 'table'],
    parts: [
      {
        type: 'slot',
        category: 'article',
        englishSpan: [0, 0],
        correctAnswer: 'La',
        options: ['La', 'El', 'Los', 'Las'],
        hint: '"Carta" is feminine, so "the" is "La".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [1, 1],
        correctAnswer: 'carta',
        options: ['carta', 'nota', 'postal', 'carro'],
        hint: '"Carta" is letter — don\'t confuse it with "carro" (car).',
      },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [5, 6],
        correctAnswer: 'le',
        options: ['le', 'te', 'nos', 'les'],
        hint: '"Le" here means "to him" — who received the letter (an indirect object), and it comes right before the verb.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [3, 4],
        correctAnswer: 'escribí',
        options: ['escribí', 'escribiste', 'escribió', 'escribimos'],
        hint: '"Escribí" is the past-tense (preterite) "I" form of escribir.',
      },
      { type: 'fixed', text: 'está' },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [8, 8],
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En la mesa" is the standard way to say "on the table".',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [9, 9],
        correctAnswer: 'la',
        options: ['la', 'el', 'los', 'las'],
        hint: '"Mesa" is feminine, so "the" is "la".',
      },
      { type: 'fixed', text: 'mesa' },
    ],
    grammarExplanation: [
      { spanish: 'La', note: 'means "the", matching feminine "carta".' },
      { spanish: 'Carta', note: 'means "letter".' },
      { spanish: 'Que', note: 'means "that/which", introducing more detail about the letter.' },
      {
        spanish: 'Le',
        note: 'means "to him" — who received the letter (an indirect object), placed right before the verb.',
      },
      { spanish: 'Escribí', note: 'means "I wrote" — the past-tense (preterite) "I" form of escribir.' },
      { spanish: 'Está', note: 'means "is" (location, using estar).' },
      { spanish: 'En', note: 'means "on".' },
      { spanish: 'La', note: 'means "the", matching feminine "mesa".' },
      { spanish: 'Mesa', note: 'means "table".' },
    ],
  },
  {
    id: 'adv-5',
    difficulty: 'Advanced',
    englishTokens: ['You', 'should', 'eat', 'more', 'vegetables'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Deberías',
        options: ['Deberías', 'Debería', 'Deberíamos', 'Debes'],
        hint: '"Deberías" is the "should/would" form of deber (the conditional mood) — its "you" form.',
      },
      {
        type: 'slot',
        category: 'infinitive',
        englishSpan: [2, 2],
        correctAnswer: 'comer',
        options: ['comer', 'beber', 'dormir', 'descansar'],
        hint: '"Comer" means "to eat" — a plain, unconjugated form (an infinitive) used right after "deberías".',
      },
      { type: 'fixed', text: 'más' },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'verduras',
        options: ['verduras', 'frutas', 'verdura', 'carnes'],
        hint: '"Verduras" is vegetables (plural) — "frutas" would be fruits.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Deberías',
        note: 'means "you should" — the -ías ending marks a special form used for "should/would" actions (the conditional mood) in its "you" form.',
      },
      { spanish: 'Comer', note: 'means "to eat" (an infinitive, the plain unconjugated form, right after "deberías").' },
      { spanish: 'Más', note: 'means "more".' },
      { spanish: 'Verduras', note: 'means "vegetables".' },
    ],
  },
  {
    id: 'adv-6',
    difficulty: 'Advanced',
    englishTokens: ['Although', 'it', 'is', 'raining,', 'we', 'are', 'going', 'to', 'go', 'out'],
    parts: [
      { type: 'fixed', text: 'Aunque' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [1, 2],
        correctAnswer: 'está',
        options: ['Estoy', 'Estás', 'está', 'Estamos'],
        hint: '"Está lloviendo" is the standard way to say "it is raining" — weather verbs use the "it" (third person singular) form.',
      },
      {
        type: 'slot',
        category: 'gerund',
        englishSpan: [3, 3],
        correctAnswer: 'lloviendo,',
        options: ['lloviendo,', 'llover', 'llueve', 'nevando'],
        hint: '"Lloviendo" means "raining" — the -iendo form Spanish uses for an ongoing action (a gerund), paired with "está" — not the plain unconjugated form "llover" or a conjugated form like "llueve".',
      },
      { type: 'fixed', text: 'vamos' },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [7, 7],
        correctAnswer: 'a',
        options: ['a', 'de', 'en', 'con'],
        hint: '"Vamos a salir" ("we\'re going to go out") uses "ir a" plus a plain, unconjugated verb form (an infinitive) — a very common way to talk about near-future plans.',
      },
      {
        type: 'slot',
        category: 'infinitive',
        englishSpan: [8, 9],
        correctAnswer: 'salir',
        options: ['salir', 'comer', 'descansar', 'trabajar'],
        hint: '"Salir" means "to go out" — a plain, unconjugated form (an infinitive) used right after "vamos a", a common way to talk about near-future plans.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Aunque', note: 'means "although".' },
      {
        spanish: 'Está',
        note: 'means "is" — combined with "lloviendo" (raining), it forms "is raining"; weather verbs like this use the "it" (third person singular) form.',
      },
      {
        spanish: 'Lloviendo',
        note: 'means "raining" — the form Spanish uses for an ongoing action (a gerund), equivalent to English "-ing".',
      },
      { spanish: 'Vamos', note: 'means "we are going".' },
      {
        spanish: 'A',
        note: 'here is part of "ir a" plus a plain, unconjugated verb form (an infinitive), a common way to talk about near-future plans — "going to do something".',
      },
      { spanish: 'Salir', note: 'means "to go out" (an infinitive, the plain unconjugated form).' },
    ],
  },
  {
    id: 'adv-7',
    difficulty: 'Advanced',
    englishTokens: ['I', 'doubt', 'that', 'he', 'is', 'coming'],
    parts: [
      { type: 'fixed', text: 'Dudo' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'pronoun',
        englishSpan: [3, 3],
        correctAnswer: 'él',
        options: ['él', 'ella', 'ellos', 'usted'],
        hint: '"Él" means "he".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [4, 5],
        correctAnswer: 'venga',
        options: ['venga', 'vengas', 'viene', 'vengamos'],
        hint: '"Dudo que" makes what follows doubted, not a stated fact — this triggers a special verb form for that (the subjunctive mood). "Venga" is that form\'s "he/she/you(formal)" form of venir.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Dudo', note: 'means "I doubt".' },
      { spanish: 'Que', note: 'means "that".' },
      { spanish: 'Él', note: 'means "he".' },
      {
        spanish: 'Venga',
        note: 'means "(he) is coming/will come" — because it follows "dudo que" (something doubted, not a stated fact), the verb switches to a special form used for doubted or uncertain actions (the subjunctive mood), here in its "he/she/you formal" form of venir.',
      },
    ],
  },
  {
    id: 'adv-8',
    difficulty: 'Advanced',
    englishTokens: ["I'm", 'sorry', 'that', "you're", 'leaving'],
    parts: [
      { type: 'fixed', text: 'Siento' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [3, 4],
        correctAnswer: 'te',
        options: ['te', 'me', 'nos', 'se'],
        hint: '"Te" here means the action happens to yourself (a reflexive pronoun) — irse ("to leave/go away") is built around that kind of self-directed action (a reflexive verb).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [3, 4],
        correctAnswer: 'vayas',
        options: ['vayas', 'vaya', 'vayamos', 'vas'],
        hint: '"Siento que" makes what follows an emotional reaction, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Vayas" is that form\'s "you" form of irse.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Siento', note: 'means "I feel/I\'m sorry".' },
      { spanish: 'Que', note: 'means "that".' },
      {
        spanish: 'Te',
        note: 'here means the action happens to yourself (a reflexive pronoun) — irse ("to leave") is a verb built around that kind of self-directed action (a reflexive verb).',
      },
      {
        spanish: 'Vayas',
        note: 'means "(you) leave/are leaving" — because it follows "siento que" (an emotional reaction, not a stated fact), the verb switches to a special form used for emotional reactions (the subjunctive mood), here in its "you" form of irse.',
      },
    ],
  },
  {
    id: 'adv-9',
    difficulty: 'Advanced',
    englishTokens: ['I', 'prefer', 'that', 'we', 'speak', 'in', 'Spanish'],
    parts: [
      { type: 'fixed', text: 'Prefiero' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [3, 4],
        correctAnswer: 'hablemos',
        options: ['hable', 'hables', 'hablamos', 'hablemos'],
        hint: '"Prefiero que" makes what follows a preference, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Hablemos" is that form\'s "we" form of hablar.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishSpan: [5, 5],
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En español" means "in Spanish".',
      },
      { type: 'fixed', text: 'español' },
    ],
    grammarExplanation: [
      { spanish: 'Prefiero', note: 'means "I prefer".' },
      { spanish: 'Que', note: 'means "that".' },
      {
        spanish: 'Hablemos',
        note: 'means "(we) speak" — because it follows "prefiero que" (a preference, not a stated fact), the verb switches to a special form used for preferred or wished-for actions (the subjunctive mood), here in its "we" form of hablar.',
      },
      { spanish: 'En', note: 'means "in".' },
      { spanish: 'Español', note: 'means "Spanish".' },
    ],
  },
  {
    id: 'adv-10',
    difficulty: 'Advanced',
    englishTokens: ['We', 'could', 'go', 'out', 'tonight'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Podríamos',
        options: ['Podría', 'Podrías', 'Podríamos', 'Puedo'],
        hint: '"Podríamos" is the "could/would" form of poder (the conditional mood) — its "we" form.',
      },
      {
        type: 'slot',
        category: 'infinitive',
        englishSpan: [2, 3],
        correctAnswer: 'salir',
        options: ['salir', 'comer', 'descansar', 'trabajar'],
        hint: '"Salir" means "to go out" — a plain, unconjugated form (an infinitive) used right after "podríamos".',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [4, 4],
        correctAnswer: 'esta noche',
        options: ['esta noche', 'mañana', 'hoy', 'ahora'],
        hint: '"Esta noche" is tonight.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Podríamos',
        note: 'means "we could" — the -íamos ending marks a special form used for "could/would" actions (the conditional mood) in its "we" form of poder.',
      },
      { spanish: 'Salir', note: 'means "to go out" (an infinitive, the plain unconjugated form, right after "podríamos").' },
      { spanish: 'Esta noche', note: 'means "tonight".' },
    ],
  },
  {
    id: 'adv-11',
    difficulty: 'Advanced',
    englishTokens: ['I', 'tell', 'him', 'the', 'truth'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [2, 2],
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who\'s told the truth (an indirect object), placed before the verb.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'digo',
        options: ['digo', 'dices', 'dice', 'decimos'],
        hint: '"Digo" is the irregular "I" form of decir.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [3, 3],
        correctAnswer: 'la',
        options: ['la', 'el', 'los', 'las'],
        hint: '"Verdad" is feminine, so "the" is "la".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [4, 4],
        correctAnswer: 'verdad',
        options: ['verdad', 'razón', 'historia', 'idea'],
        hint: '"Verdad" is truth — the others are reason, story, and idea.',
      },
    ],
    grammarExplanation: [
      {
        spanish: 'Le',
        note: 'here means "to him" — who\'s told the truth (an indirect object), separate from the truth itself, and it goes before the verb.',
      },
      { spanish: 'Digo', note: 'means "I tell/say" — an irregular "I" form of decir.' },
      { spanish: 'La', note: 'means "the", matching feminine "verdad".' },
      { spanish: 'Verdad', note: 'means "truth".' },
    ],
  },
  {
    id: 'adv-12',
    difficulty: 'Advanced',
    englishTokens: ['I', 'bring', 'dessert', 'tomorrow'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Traigo',
        options: ['Traigo', 'Traes', 'Trae', 'Traemos'],
        hint: '"Traigo" is the irregular "I" form of traer.',
      },
      {
        type: 'slot',
        category: 'article',
        englishSpan: [2, 2],
        correctAnswer: 'el',
        options: ['el', 'la', 'los', 'las'],
        hint: '"Postre" is masculine, so "the" is "el", even though English doesn\'t need "the" here.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishSpan: [2, 2],
        correctAnswer: 'postre',
        options: ['postre', 'plato', 'pan', 'vino'],
        hint: '"Postre" is dessert — the others are dish, bread, and wine.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [3, 3],
        correctAnswer: 'mañana',
        options: ['mañana', 'hoy', 'ayer', 'ahora'],
        hint: '"Mañana" is tomorrow — the others are today, yesterday, and now.',
      },
    ],
    grammarExplanation: [
      { spanish: 'Traigo', note: 'means "I bring" — an irregular "I" form of traer.' },
      { spanish: 'El', note: 'means "the", matching masculine "postre" — Spanish needs it here even though English doesn\'t.' },
      { spanish: 'Postre', note: 'means "dessert".' },
      { spanish: 'Mañana', note: 'means "tomorrow".' },
    ],
  },
  {
    id: 'adv-13',
    difficulty: 'Advanced',
    englishTokens: ['I', 'usually', 'leave', 'early'],
    parts: [
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [1, 1],
        correctAnswer: 'Generalmente',
        options: ['Generalmente', 'Rápidamente', 'Fácilmente', 'Finalmente'],
        hint: '"Generalmente" is "generally/usually" — the others are "quickly", "easily", and "finally".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 2],
        correctAnswer: 'salgo',
        options: ['salgo', 'sales', 'sale', 'salimos'],
        hint: '"Salgo" is the irregular "I" form of salir.',
      },
      { type: 'fixed', text: 'temprano' },
    ],
    grammarExplanation: [
      {
        spanish: 'Generalmente',
        note: 'means "generally/usually" — placed at the start of the sentence here, unlike English "usually" which more often sits closer to the verb.',
      },
      { spanish: 'Salgo', note: 'means "I leave" — an irregular "I" form of salir.' },
      { spanish: 'Temprano', note: 'means "early".' },
    ],
  },
  {
    id: 'adv-14',
    difficulty: 'Advanced',
    englishTokens: ['I', 'think', 'that', "you're", 'right'],
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'Pienso',
        options: ['Pienso', 'Piensas', 'Piensa', 'Pensamos'],
        hint: '"Pienso" is pensar with its e changed to ie for "I".',
      },
      { type: 'fixed', text: 'que' },
      { type: 'fixed', text: 'tienes' },
      { type: 'fixed', text: 'razón' },
    ],
    grammarExplanation: [
      { spanish: 'Pienso', note: 'means "I think" — pensar changes its e to ie for "I/you/he-she/they" (a stem-changing verb).' },
      { spanish: 'Que', note: 'means "that".' },
      { spanish: 'Tienes razón', note: 'is a fixed phrase meaning "you\'re right" — literally "you have reason".' },
    ],
  },
  {
    id: 'adv-15',
    difficulty: 'Advanced',
    englishTokens: ['I', 'feel', 'good', 'today'],
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishSpan: [0, 1],
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Se', 'Nos'],
        hint: '"Me" here means the action happens to yourself (a reflexive pronoun) — sentirse ("to feel") is built around that kind of self-directed action (a reflexive verb).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishSpan: [0, 1],
        correctAnswer: 'siento',
        options: ['siento', 'sientes', 'siente', 'sentimos'],
        hint: '"Siento" is sentir(se) with its e changed to ie for "I".',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishSpan: [2, 2],
        correctAnswer: 'bien',
        options: ['bien', 'mal', 'raro', 'cansado'],
        hint: '"Bien" is "well/good" — the others are "badly", "strange", and "tired".',
      },
      { type: 'fixed', text: 'hoy' },
    ],
    grammarExplanation: [
      {
        spanish: 'Me',
        note: 'here means the action happens to yourself (a reflexive pronoun) — sentirse ("to feel") is a verb built around that kind of self-directed action (a reflexive verb).',
      },
      { spanish: 'Siento', note: 'means "I feel" — sentir(se) changes its e to ie for "I/you/he-she/they" (a stem-changing verb).' },
      { spanish: 'Bien', note: 'means "well/good".' },
      { spanish: 'Hoy', note: 'means "today".' },
    ],
  },
]

export const SENTENCE_BUILDER_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
