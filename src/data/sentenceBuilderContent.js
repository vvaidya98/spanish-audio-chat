// SAC-097 Phase 1: curated, hand-authored sentence content for the
// Sentence Builder activity — static, bundled with the app (no runtime API
// call to fetch it), keeping this feature's ongoing operating cost at zero
// beyond this one-time authoring effort.
//
// Every sentence's Spanish grammar (conjugation, gender/number agreement,
// adjective placement) was manually verified word-by-word before being
// added here, following the Colombian Spanish standard already
// established elsewhere in this app (tú, not vos; "carro" not "coche";
// the same es-CO-preferred voice this app already uses in speechUtils.js).
// Disclosed rather than assumed: this is AI-authored Spanish content, the
// same as every story this app has ever generated at runtime — verified
// carefully by direct conjugation/agreement review, but (like all of this
// app's generated Spanish) would still benefit from a native-speaker spot
// check before being treated as unquestionably authoritative.
//
// Design choice, not an oversight: each sentence has AT MOST ONE slot per
// category (never two verb slots, two adjective slots, etc.), even where
// the English/Spanish sentence technically contains more than one word of
// that category (e.g. "gets up" is reflexive "se levanta" but only
// "levanta" is quizzed; "the red car is expensive" only quizzes "caro",
// leaving "rojo" fixed). This keeps the fixed pronoun -> verb -> noun ->
// adjective -> preposition answer order completely unambiguous — never
// needing a documented tie-break for "which adjective comes first" — and
// keeps each sentence's teaching focus on one clear grammar point per
// category rather than diluting it across duplicates. A category simply
// being absent from a sentence (skipped in the answer order, per Part 2)
// is different from a category appearing twice (not modeled at all in
// Phase 1) — both are deliberate scope choices, not gaps.
//
// `sentencePosition` indexes directly into `spanish.split(' ')` — every
// slot's correctAnswer is verified to exactly equal the word at that index
// in the full `spanish` string, so assembling from slot positions and
// reading `spanish` directly always agree (SentenceBuilderView asserts
// this in dev rather than trusting it silently).
export const SENTENCE_BUILDER_CONTENT = [
  // ---- Beginner ----
  {
    id: 'beg-1',
    difficulty: 'Beginner',
    english: 'I need a coffee',
    spanish: 'Necesito un café',
    slots: [
      {
        category: 'verb',
        englishWord: 'need',
        correctAnswer: 'Necesito',
        sentencePosition: 0,
        options: ['Necesito', 'Necesitas', 'Necesita', 'Necesitamos'],
        hint: '"Necesito" is the "I" form of necesitar — it ends in -o, like most "yo" verbs.',
      },
      {
        category: 'noun',
        englishWord: 'coffee',
        correctAnswer: 'café',
        sentencePosition: 2,
        options: ['café', 'leche', 'agua', 'té'],
        hint: '"Café" is coffee — the other options are milk, water, and tea.',
      },
    ],
  },
  {
    id: 'beg-2',
    difficulty: 'Beginner',
    english: 'You are very tired',
    spanish: 'Estás muy cansado',
    slots: [
      {
        category: 'verb',
        englishWord: 'are',
        correctAnswer: 'Estás',
        sentencePosition: 0,
        options: ['Estoy', 'Estás', 'Está', 'Estamos'],
        hint: '"Estás" is the "you" (tú) form of estar.',
      },
      {
        category: 'adjective',
        englishWord: 'tired',
        correctAnswer: 'cansado',
        sentencePosition: 2,
        options: ['cansado', 'cansada', 'cansados', 'cansadas'],
        hint: 'Here "tired" describes one masculine person — no "a" or "s" ending needed.',
      },
    ],
  },
  {
    id: 'beg-3',
    difficulty: 'Beginner',
    english: 'We eat rice',
    spanish: 'Comemos arroz',
    slots: [
      {
        category: 'verb',
        englishWord: 'eat',
        correctAnswer: 'Comemos',
        sentencePosition: 0,
        options: ['Como', 'Comes', 'Come', 'Comemos'],
        hint: '"Comemos" is the "we" form of comer — it ends in -mos.',
      },
      {
        category: 'noun',
        englishWord: 'rice',
        correctAnswer: 'arroz',
        sentencePosition: 1,
        options: ['arroz', 'pan', 'queso', 'pollo'],
        hint: '"Arroz" is rice — the others are bread, cheese, and chicken.',
      },
    ],
  },
  {
    id: 'beg-4',
    difficulty: 'Beginner',
    english: 'She has a big house',
    spanish: 'Ella tiene una casa grande',
    slots: [
      {
        category: 'pronoun',
        englishWord: 'She',
        correctAnswer: 'Ella',
        sentencePosition: 0,
        options: ['Ella', 'Él', 'Ellos', 'Ellas'],
        hint: '"Ella" is "she" — "Él" is "he".',
      },
      {
        category: 'verb',
        englishWord: 'has',
        correctAnswer: 'tiene',
        sentencePosition: 1,
        options: ['Tengo', 'Tienes', 'tiene', 'Tenemos'],
        hint: '"Tiene" is the "she/he/you(formal)" form of tener.',
      },
      {
        category: 'noun',
        englishWord: 'house',
        correctAnswer: 'casa',
        sentencePosition: 3,
        options: ['casa', 'casas', 'cosa', 'mesa'],
        hint: '"Casa" is house — watch out, "cosa" (thing) looks similar but means something else.',
      },
      {
        category: 'adjective',
        englishWord: 'big',
        correctAnswer: 'grande',
        sentencePosition: 4,
        options: ['grande', 'grandes', 'pequeña', 'bonita'],
        hint: 'In Spanish, descriptive adjectives usually come AFTER the noun — "casa grande", not "grande casa".',
      },
    ],
  },
  {
    id: 'beg-5',
    difficulty: 'Beginner',
    english: 'The children are happy',
    spanish: 'Los niños están felices',
    slots: [
      {
        category: 'verb',
        englishWord: 'are',
        correctAnswer: 'están',
        sentencePosition: 2,
        options: ['Estoy', 'Estás', 'están', 'Estamos'],
        hint: '"Están" is the "they" form of estar.',
      },
      {
        category: 'noun',
        englishWord: 'children',
        correctAnswer: 'niños',
        sentencePosition: 1,
        options: ['niños', 'niñas', 'niño', 'hombres'],
        hint: '"Niños" is children (or boys) — "niñas" would be girls.',
      },
      {
        category: 'adjective',
        englishWord: 'happy',
        correctAnswer: 'felices',
        sentencePosition: 3,
        options: ['felices', 'feliz', 'tristes', 'cansados'],
        hint: 'Since "niños" is plural, "feliz" needs its plural form: "felices".',
      },
    ],
  },
  {
    id: 'beg-6',
    difficulty: 'Beginner',
    english: 'I want to go to the beach',
    spanish: 'Quiero ir a la playa',
    slots: [
      {
        category: 'verb',
        englishWord: 'want',
        correctAnswer: 'Quiero',
        sentencePosition: 0,
        options: ['Quiero', 'Quieres', 'Quiere', 'Queremos'],
        hint: '"Quiero" is the "I" form of querer — notice the e changes to ie.',
      },
      {
        category: 'noun',
        englishWord: 'beach',
        correctAnswer: 'playa',
        sentencePosition: 4,
        options: ['playa', 'montaña', 'ciudad', 'piscina'],
        hint: '"Playa" is beach — the others are mountain, city, and pool.',
      },
      // No preposition slot here on purpose: "to" appears twice in the
      // English gloss ("want TO go TO the beach"), which would make a
      // plain substring-based highlight match ambiguous between the two.
      // Preposition coverage lives in int-5/int-6/adv-4 instead, where the
      // English word is unambiguous.
    ],
  },

  // ---- Intermediate ----
  {
    id: 'int-1',
    difficulty: 'Intermediate',
    english: 'He gets up early every day',
    spanish: 'Él se levanta temprano todos los días',
    slots: [
      {
        category: 'pronoun',
        englishWord: 'He',
        correctAnswer: 'Él',
        sentencePosition: 0,
        options: ['Él', 'Ella', 'Ellos', 'Usted'],
        hint: '"Él" is "he".',
      },
      {
        category: 'verb',
        englishWord: 'gets up',
        correctAnswer: 'levanta',
        sentencePosition: 2,
        options: ['levanto', 'levantas', 'levanta', 'levantamos'],
        hint: 'This is a reflexive verb (levantarse) — "se levanta" is the "he" form, "gets himself up".',
      },
    ],
  },
  {
    id: 'int-2',
    difficulty: 'Intermediate',
    english: 'The red car is expensive',
    spanish: 'El carro rojo es caro',
    slots: [
      {
        category: 'verb',
        englishWord: 'is',
        correctAnswer: 'es',
        sentencePosition: 3,
        options: ['Soy', 'Eres', 'es', 'Somos'],
        hint: '"Es" is the "it" form of ser — used here because expensive is a lasting characteristic, not a temporary state.',
      },
      {
        category: 'noun',
        englishWord: 'car',
        correctAnswer: 'carro',
        sentencePosition: 1,
        options: ['carro', 'carros', 'carta', 'casa'],
        hint: '"Carro" is car (the Latin American word — "coche" is more common in Spain).',
      },
      {
        category: 'adjective',
        englishWord: 'expensive',
        correctAnswer: 'caro',
        sentencePosition: 4,
        options: ['caro', 'cara', 'caros', 'barato'],
        hint: '"Carro" is masculine singular, so the adjective needs to match: "caro", not "cara".',
      },
    ],
  },
  {
    id: 'int-3',
    difficulty: 'Intermediate',
    english: "I don't have money",
    spanish: 'No tengo dinero',
    slots: [
      {
        category: 'verb',
        englishWord: 'have',
        correctAnswer: 'tengo',
        sentencePosition: 1,
        options: ['tengo', 'tienes', 'tiene', 'tenemos'],
        hint: '"Tengo" is the "I" form of tener.',
      },
      {
        category: 'noun',
        englishWord: 'money',
        correctAnswer: 'dinero',
        sentencePosition: 2,
        options: ['dinero', 'tiempo', 'trabajo', 'hambre'],
        hint: '"Dinero" is money — the others are time, work, and hunger.',
      },
    ],
  },
  {
    id: 'int-4',
    difficulty: 'Intermediate',
    english: 'They are studying Spanish',
    spanish: 'Ellos están estudiando español',
    slots: [
      {
        category: 'pronoun',
        englishWord: 'They',
        correctAnswer: 'Ellos',
        sentencePosition: 0,
        options: ['Ellos', 'Ellas', 'Nosotros', 'Ustedes'],
        hint: '"Ellos" is "they".',
      },
      {
        category: 'verb',
        englishWord: 'are studying',
        correctAnswer: 'están',
        sentencePosition: 1,
        options: ['Estoy', 'Estás', 'está', 'están'],
        hint: '"Están" + "estudiando" makes the "they are studying" progressive form.',
      },
      {
        category: 'noun',
        englishWord: 'Spanish',
        correctAnswer: 'español',
        sentencePosition: 3,
        options: ['español', 'inglés', 'francés', 'alemán'],
        hint: '"Español" is Spanish — the others are English, French, and German.',
      },
    ],
  },
  {
    id: 'int-5',
    difficulty: 'Intermediate',
    english: 'We are going to the party tonight',
    spanish: 'Vamos a la fiesta esta noche',
    slots: [
      {
        category: 'verb',
        englishWord: 'are going',
        correctAnswer: 'Vamos',
        sentencePosition: 0,
        options: ['Voy', 'Vas', 'Va', 'Vamos'],
        hint: '"Vamos" is the "we" form of the irregular verb ir.',
      },
      {
        category: 'noun',
        englishWord: 'party',
        correctAnswer: 'fiesta',
        sentencePosition: 3,
        options: ['fiesta', 'reunión', 'boda', 'cena'],
        hint: '"Fiesta" is party — the others are meeting, wedding, and dinner.',
      },
      {
        category: 'preposition',
        englishWord: 'to',
        correctAnswer: 'a',
        sentencePosition: 1,
        options: ['a', 'en', 'de', 'con'],
        hint: '"A" means "to" before a destination.',
      },
    ],
  },
  {
    id: 'int-6',
    difficulty: 'Intermediate',
    english: 'The blue house is on the corner',
    spanish: 'La casa azul está en la esquina',
    slots: [
      {
        category: 'verb',
        englishWord: 'is',
        correctAnswer: 'está',
        sentencePosition: 3,
        options: ['Estoy', 'Estás', 'está', 'Estamos'],
        hint: '"Está" (estar) is used here because location is a temporary/positional fact, not a defining characteristic.',
      },
      {
        category: 'noun',
        englishWord: 'house',
        correctAnswer: 'casa',
        sentencePosition: 1,
        options: ['casa', 'casas', 'cosa', 'mesa'],
        hint: '"Casa" is house.',
      },
      {
        category: 'adjective',
        englishWord: 'blue',
        correctAnswer: 'azul',
        sentencePosition: 2,
        options: ['azul', 'azules', 'roja', 'verde'],
        hint: '"Azul" doesn’t change for gender, but it does for number — this house is singular, so no "-es".',
      },
      {
        category: 'preposition',
        englishWord: 'on',
        correctAnswer: 'en',
        sentencePosition: 4,
        options: ['en', 'a', 'de', 'con'],
        hint: '"En la esquina" is the standard way to say "on/at the corner".',
      },
    ],
  },

  // ---- Advanced ----
  {
    id: 'adv-1',
    difficulty: 'Advanced',
    english: 'I hope that you arrive on time',
    spanish: 'Espero que llegues a tiempo',
    slots: [
      {
        category: 'verb',
        englishWord: 'arrive',
        correctAnswer: 'llegues',
        sentencePosition: 2,
        options: ['llegues', 'llega', 'llegue', 'lleguemos'],
        hint: '"Espero que" triggers the subjunctive — "llegues" is the subjunctive "you" form of llegar.',
      },
      {
        category: 'preposition',
        englishWord: 'on',
        correctAnswer: 'a',
        sentencePosition: 3,
        options: ['a', 'en', 'de', 'con'],
        hint: '"A tiempo" is the fixed phrase for "on time".',
      },
    ],
  },
  {
    id: 'adv-2',
    difficulty: 'Advanced',
    english: 'It is important that we study every day',
    spanish: 'Es importante que estudiemos todos los días',
    slots: [
      {
        category: 'verb',
        englishWord: 'study',
        correctAnswer: 'estudiemos',
        sentencePosition: 3,
        options: ['estudie', 'estudies', 'estudiamos', 'estudiemos'],
        hint: '"Es importante que" triggers the subjunctive — "estudiemos" is the subjunctive "we" form of estudiar.',
      },
      {
        category: 'adjective',
        englishWord: 'important',
        correctAnswer: 'importante',
        sentencePosition: 1,
        options: ['importante', 'importantes', 'necesario', 'urgente'],
        hint: '"Importante" doesn’t change for gender, and stays singular here since it describes the whole idea, not a plural noun.',
      },
    ],
  },
  {
    id: 'adv-3',
    difficulty: 'Advanced',
    english: 'If I had more time, I would travel',
    spanish: 'Si tuviera más tiempo viajaría',
    slots: [
      {
        category: 'verb',
        englishWord: 'had',
        correctAnswer: 'tuviera',
        sentencePosition: 1,
        options: ['tuviera', 'tuvieras', 'tuviéramos', 'tenía'],
        hint: 'This "if" clause needs the imperfect subjunctive of tener — "tuviera" is the "I" form.',
      },
      {
        category: 'noun',
        englishWord: 'time',
        correctAnswer: 'tiempo',
        sentencePosition: 3,
        options: ['tiempo', 'dinero', 'trabajo', 'espacio'],
        hint: '"Tiempo" is time — the others are money, work, and space.',
      },
    ],
  },
  {
    id: 'adv-4',
    difficulty: 'Advanced',
    english: 'The letter that I wrote is on the table',
    spanish: 'La carta que escribí está en la mesa',
    slots: [
      {
        category: 'verb',
        englishWord: 'wrote',
        correctAnswer: 'escribí',
        sentencePosition: 3,
        options: ['escribí', 'escribiste', 'escribió', 'escribimos'],
        hint: '"Escribí" is the "I" past-tense (preterite) form of escribir.',
      },
      {
        category: 'noun',
        englishWord: 'letter',
        correctAnswer: 'carta',
        sentencePosition: 1,
        options: ['carta', 'carro', 'cartas', 'nota'],
        hint: '"Carta" is letter — don’t confuse it with "carro" (car).',
      },
      {
        category: 'preposition',
        englishWord: 'on',
        correctAnswer: 'en',
        sentencePosition: 5,
        options: ['en', 'a', 'de', 'con'],
        hint: '"En la mesa" is the standard way to say "on the table".',
      },
    ],
  },
  {
    id: 'adv-5',
    difficulty: 'Advanced',
    english: 'You should eat more vegetables',
    spanish: 'Deberías comer más verduras',
    slots: [
      {
        category: 'verb',
        englishWord: 'should',
        correctAnswer: 'Deberías',
        sentencePosition: 0,
        options: ['Deberías', 'Debería', 'Deberíamos', 'Debes'],
        hint: '"Deberías" is the conditional "you" form of deber — "you should/ought to".',
      },
      {
        category: 'noun',
        englishWord: 'vegetables',
        correctAnswer: 'verduras',
        sentencePosition: 3,
        options: ['verduras', 'frutas', 'verdura', 'carnes'],
        hint: '"Verduras" is vegetables (plural) — "frutas" would be fruits.',
      },
    ],
  },
  {
    id: 'adv-6',
    difficulty: 'Advanced',
    english: 'Although it is raining, we are going out',
    spanish: 'Aunque está lloviendo, vamos a salir',
    slots: [
      {
        category: 'verb',
        englishWord: 'is raining',
        correctAnswer: 'está',
        sentencePosition: 1,
        options: ['Estoy', 'Estás', 'está', 'Estamos'],
        hint: '"Está lloviendo" is the standard way to say "it is raining" — weather verbs use the "it" form.',
      },
      // No preposition slot here: unlike beg-6, this "a" (the ir a +
      // infinitive marker in "vamos a salir") has no literal standalone
      // "to" in the English gloss "we are going out" to highlight at all —
      // forcing one in would mean inventing English text that isn't
      // actually there, rather than teaching a real English<->Spanish
      // mapping. Preposition coverage lives in int-5/int-6/adv-4.
    ],
  },
]

export const SENTENCE_BUILDER_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

// SAC-097 Part 2: the fixed category answer/highlight order — pronoun (if
// present) -> verb -> noun -> adjective -> preposition (if present).
// Categories absent from a given sentence are simply skipped, per Part 2's
// explicit rule; this is the single source of truth SentenceBuilderView
// sorts each sentence's slots by, rather than trusting the content file's
// own array order to already be correct.
export const CATEGORY_ORDER = ['pronoun', 'verb', 'noun', 'adjective', 'preposition']
