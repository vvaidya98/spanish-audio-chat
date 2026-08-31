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
// Every sentence's Spanish grammar (conjugation, gender/number agreement,
// adjective placement, object-pronoun role) was manually verified
// word-by-word before being added — Colombian Spanish standard (tú not
// vos; "carro" not "coche"). Disclosed rather than assumed: this is
// AI-authored Spanish content, verified carefully by direct review, but
// (like every other generated Spanish in this app) would still benefit
// from a native-speaker spot check. Double-object-pronoun constructions
// (se lo, se la, etc.) were deliberately avoided this round — the le/les
// -> se transformation rule is easy to get subtly wrong without a live
// grammar-checking tool, and Part 4's actual requirement (me/te/le/nos/les
// across reflexive/direct/indirect/gustar-type roles) is fully covered
// without needing that added risk.
//
// `grammarExplanation` is baked in per SAC-103 Part 6 — no live API call,
// shown automatically once a sentence is assembled. It follows Part 7's
// shared style rule (plain language first, technical term in parentheses
// after, jargon never appears unparenthesized) and is written to mention
// every part of the sentence, fixed words included — both requirements
// checked mechanically by scripts/verifySentenceBuilderContent.mjs, not
// just by eye.
export const CATEGORIES = ['pronoun', 'object-pronoun', 'verb', 'noun', 'adjective', 'preposition', 'adverb']

export const SENTENCE_BUILDER_CONTENT = [
  // ================= BEGINNER =================
  {
    id: 'beg-1',
    difficulty: 'Beginner',
    english: 'I need a coffee',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I need',
        correctAnswer: 'Necesito',
        options: ['Necesito', 'Necesitas', 'Necesita', 'Necesitamos'],
        hint: '"Necesito" ends in -o, the ending Spanish uses for "I" (first person singular).',
      },
      { type: 'fixed', text: 'un' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'coffee',
        correctAnswer: 'café',
        options: ['café', 'leche', 'agua', 'té'],
        hint: '"Café" is coffee — the others are milk, water, and tea.',
      },
    ],
    grammarExplanation:
      '"Necesito" means "I need" — the -o ending shows who\'s doing it, "I" (first person singular). "Un" means "a", matching the masculine word that comes after it. "Café" means "coffee".',
  },
  {
    id: 'beg-2',
    difficulty: 'Beginner',
    english: 'You are very tired',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'you are',
        correctAnswer: 'Estás',
        options: ['Estoy', 'Estás', 'Está', 'Estamos'],
        hint: '"Estás" is the form of estar used for "you" (tú), talking to one person informally.',
      },
      { type: 'fixed', text: 'muy' },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'tired',
        correctAnswer: 'cansado',
        options: ['cansado', 'cansada', 'cansados', 'cansadas'],
        hint: 'Here "tired" describes one masculine person, so no extra "a" or "s" is added.',
      },
    ],
    grammarExplanation:
      '"Estás" means "you are" — the -ás ending is the "you" (tú, second person singular) form of estar, used for how someone feels right now, not a permanent trait. "Muy" means "very". "Cansado" means "tired" — it ends in -o here because it\'s describing one male (or default masculine) person (masculine singular).',
  },
  {
    id: 'beg-3',
    difficulty: 'Beginner',
    english: 'We eat rice',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we eat',
        correctAnswer: 'Comemos',
        options: ['Como', 'Comes', 'Come', 'Comemos'],
        hint: '"Comemos" ends in -mos, the ending Spanish uses for "we" (first person plural).',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'rice',
        correctAnswer: 'arroz',
        options: ['arroz', 'pan', 'queso', 'pollo'],
        hint: '"Arroz" is rice — the others are bread, cheese, and chicken.',
      },
    ],
    grammarExplanation:
      '"Comemos" means "we eat" — the -mos ending shows "we" (first person plural) are doing it. "Arroz" means "rice" — no word for "the" is needed here since we\'re talking about rice in general, not a specific batch of it.',
  },
  {
    id: 'beg-4',
    difficulty: 'Beginner',
    english: 'She has a big house',
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishWord: 'She',
        correctAnswer: 'Ella',
        options: ['Ella', 'Él', 'Ellos', 'Ellas'],
        hint: '"Ella" means "she" — "Él" would be "he".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'has',
        correctAnswer: 'tiene',
        options: ['Tengo', 'Tienes', 'tiene', 'Tenemos'],
        hint: '"Tiene" is the form of tener used for "she/he/you(formal)" (third person singular).',
      },
      { type: 'fixed', text: 'una' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'house',
        correctAnswer: 'casa',
        options: ['casa', 'casas', 'cosa', 'mesa'],
        hint: '"Casa" is house — watch out, "cosa" (thing) looks similar but means something else.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'big',
        correctAnswer: 'grande',
        options: ['grande', 'grandes', 'pequeña', 'bonita'],
        hint: 'Descriptive adjectives usually come AFTER the noun in Spanish — "casa grande", not "grande casa".',
      },
    ],
    grammarExplanation:
      '"Ella" means "she" (a subject pronoun). "Tiene" means "has" — the -e ending is the "she/he/you formal" form (third person singular) of tener. "Una" means "a", matching the feminine word "casa". "Casa" means "house". "Grande" means "big" — notice it comes AFTER the noun it describes, the normal word order in Spanish (unlike English, which puts "big" before "house").',
  },
  {
    id: 'beg-5',
    difficulty: 'Beginner',
    english: 'The children are happy',
    parts: [
      { type: 'fixed', text: 'Los' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'children',
        correctAnswer: 'niños',
        options: ['niños', 'niñas', 'niño', 'hombres'],
        hint: '"Niños" is children (or boys) — "niñas" would be girls only.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'are',
        correctAnswer: 'están',
        options: ['Estoy', 'Estás', 'está', 'están'],
        hint: '"Están" is the form of estar used for "they" (third person plural).',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'happy',
        correctAnswer: 'felices',
        options: ['felices', 'feliz', 'tristes', 'cansados'],
        hint: 'Since "niños" is plural, "feliz" needs its plural form: "felices".',
      },
    ],
    grammarExplanation:
      '"Los" means "the", matching the masculine plural word after it. "Niños" means "children". "Están" means "are" — this uses estar (not ser) because it\'s describing how the children currently feel, a state rather than a permanent trait. "Felices" means "happy" — it takes the plural ending -es to match "niños".',
  },
  {
    id: 'beg-6',
    difficulty: 'Beginner',
    english: 'I want to go to the beach',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I want',
        correctAnswer: 'Quiero',
        options: ['Quiero', 'Quieres', 'Quiere', 'Queremos'],
        hint: '"Quiero" is the "I" form of querer — notice the e changes to ie.',
      },
      { type: 'fixed', text: 'ir' },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'to',
        correctAnswer: 'a',
        options: ['a', 'en', 'de', 'con'],
        hint: '"A" means "to" when pointing toward a destination.',
      },
      { type: 'fixed', text: 'la' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'beach',
        correctAnswer: 'playa',
        options: ['playa', 'montaña', 'ciudad', 'piscina'],
        hint: '"Playa" is beach — the others are mountain, city, and pool.',
      },
    ],
    grammarExplanation:
      '"Quiero" means "I want" — querer changes its e to ie for "I", "you", "he/she", and "they" (a stem-changing verb). "Ir" means "to go" (an infinitive, the plain unconjugated form, used here right after "quiero"). "A" means "to", pointing toward the destination. "La" means "the", matching the feminine word "playa". "Playa" means "beach".',
  },
  {
    id: 'beg-7',
    difficulty: 'Beginner',
    english: 'We can go out tonight',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we can',
        correctAnswer: 'Podemos',
        options: ['Puedo', 'Puedes', 'Puede', 'Podemos'],
        hint: '"Podemos" is the "we" form of poder — unlike "I/you/he/she", "we" keeps the plain o, no ue change.',
      },
      { type: 'fixed', text: 'salir' },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'tonight',
        correctAnswer: 'esta noche',
        options: ['esta noche', 'mañana', 'hoy', 'ahora'],
        hint: '"Esta noche" is tonight — the others are tomorrow, today, and now.',
      },
    ],
    grammarExplanation:
      '"Podemos" means "we can" — poder changes o to ue for "I/you/he-she/they", but "we" (nosotros) keeps the plain o. "Salir" means "to go out" (an infinitive right after "podemos"). "Esta noche" means "tonight" — a fixed time phrase, literally "this night".',
  },
  {
    id: 'beg-8',
    difficulty: 'Beginner',
    english: 'I speak Spanish',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I speak',
        correctAnswer: 'Hablo',
        options: ['Hablo', 'Hablas', 'Habla', 'Hablamos'],
        hint: '"Hablo" ends in -o, the "I" ending for regular -ar verbs like hablar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'Spanish',
        correctAnswer: 'español',
        options: ['español', 'inglés', 'francés', 'alemán'],
        hint: '"Español" is Spanish — the others are English, French, and German.',
      },
    ],
    grammarExplanation:
      '"Hablo" means "I speak" — the -o ending marks it as the "I" (first person singular) form of the regular -ar verb hablar. "Español" means "Spanish" (the language) — no word for "the" is needed here.',
  },
  {
    id: 'beg-9',
    difficulty: 'Beginner',
    english: 'I live in Bogotá',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I live',
        correctAnswer: 'Vivo',
        options: ['Vivo', 'Vives', 'Vive', 'Vivimos'],
        hint: '"Vivo" ends in -o, the "I" ending for regular -ir verbs like vivir.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'in',
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En" means "in" when talking about a place you\'re located.',
      },
      { type: 'fixed', text: 'Bogotá' },
    ],
    grammarExplanation:
      '"Vivo" means "I live" — the -o ending marks it as the "I" (first person singular) form of the regular -ir verb vivir. "En" means "in", showing where. "Bogotá" is the name of the city — it doesn\'t change between English and Spanish.',
  },
  {
    id: 'beg-10',
    difficulty: 'Beginner',
    english: 'I work a lot',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I work',
        correctAnswer: 'Trabajo',
        options: ['Trabajo', 'Trabajas', 'Trabaja', 'Trabajamos'],
        hint: '"Trabajo" ends in -o, the "I" ending for regular -ar verbs like trabajar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'a lot',
        correctAnswer: 'mucho',
        options: ['mucho', 'poco', 'bien', 'mal'],
        hint: '"Mucho" is "a lot" — the others are "a little", "well", and "badly".',
      },
    ],
    grammarExplanation:
      '"Trabajo" means "I work" — the -o ending marks the "I" (first person singular) form of the regular -ar verb trabajar. "Mucho" means "a lot", describing how much you work (an adverb of degree).',
  },
  {
    id: 'beg-11',
    difficulty: 'Beginner',
    english: 'I study every day',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I study',
        correctAnswer: 'Estudio',
        options: ['Estudio', 'Estudias', 'Estudia', 'Estudiamos'],
        hint: '"Estudio" ends in -o, the "I" ending for regular -ar verbs like estudiar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'every day',
        correctAnswer: 'todos los días',
        options: ['todos los días', 'todos los meses', 'cada semana', 'siempre'],
        hint: '"Todos los días" is "every day" — the others are "every month", "each week", and "always".',
      },
    ],
    grammarExplanation:
      '"Estudio" means "I study" — the -o ending marks the "I" (first person singular) form of the regular -ar verb estudiar. "Todos los días" means "every day", a fixed time phrase — literally "all the days".',
  },
  {
    id: 'beg-12',
    difficulty: 'Beginner',
    english: 'I read an interesting book',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I read',
        correctAnswer: 'Leo',
        options: ['Leo', 'Lees', 'Lee', 'Leemos'],
        hint: '"Leo" ends in -o, the "I" ending for regular -er verbs like leer.',
      },
      { type: 'fixed', text: 'un' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'book',
        correctAnswer: 'libro',
        options: ['libro', 'periódico', 'revista', 'cuento'],
        hint: '"Libro" is book — the others are newspaper, magazine, and story.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'interesting',
        correctAnswer: 'interesante',
        options: ['interesante', 'aburrido', 'interesantes', 'largo'],
        hint: '"Interesante" doesn\'t change for gender — it stays the same for masculine or feminine.',
      },
    ],
    grammarExplanation:
      '"Leo" means "I read" — the -o ending marks the "I" (first person singular) form of the regular -er verb leer. "Un" means "a", matching the masculine word "libro". "Libro" means "book". "Interesante" means "interesting" — it comes after the noun, and its -e ending doesn\'t change for masculine or feminine.',
  },
  {
    id: 'beg-13',
    difficulty: 'Beginner',
    english: 'We drink cold water',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we drink',
        correctAnswer: 'Bebemos',
        options: ['Bebo', 'Bebes', 'Bebe', 'Bebemos'],
        hint: '"Bebemos" ends in -mos, the "we" ending for regular -er verbs like beber.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'water',
        correctAnswer: 'agua',
        options: ['agua', 'jugo', 'leche', 'refresco'],
        hint: '"Agua" is water — the others are juice, milk, and soda.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'cold',
        correctAnswer: 'fría',
        options: ['fría', 'frío', 'frías', 'caliente'],
        hint: '"Agua" is a feminine word, so the adjective needs the feminine ending: "fría".',
      },
    ],
    grammarExplanation:
      '"Bebemos" means "we drink" — the -mos ending marks the "we" (first person plural) form of the regular -er verb beber. "Agua" means "water" (a feminine word, even though it uses "el" instead of "la" when a direct article is needed — a spelling quirk that doesn\'t apply here since there\'s no article). "Fría" means "cold" — it takes the feminine ending -a to agree with "agua".',
  },
  {
    id: 'beg-14',
    difficulty: 'Beginner',
    english: 'I listen to music',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I listen to',
        correctAnswer: 'Escucho',
        options: ['Escucho', 'Escuchas', 'Escucha', 'Escuchamos'],
        hint: '"Escucho" ends in -o, the "I" ending for regular -ar verbs like escuchar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'music',
        correctAnswer: 'música',
        options: ['música', 'radio', 'canción', 'podcast'],
        hint: '"Música" is music — "canción" would specifically mean "a song".',
      },
    ],
    grammarExplanation:
      '"Escucho" means "I listen to" — the -o ending marks the "I" (first person singular) form of the regular -ar verb escuchar. Notice Spanish doesn\'t need a separate word for "to" here, unlike English "listen TO". "Música" means "music".',
  },
  {
    id: 'beg-15',
    difficulty: 'Beginner',
    english: 'My name is Ana',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'myself (My name is...)',
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Se', 'Nos'],
        hint: '"Me" here means the action happens to yourself (a reflexive pronoun) — literally "I call myself".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I call',
        correctAnswer: 'llamo',
        options: ['llamo', 'llamas', 'llama', 'llamamos'],
        hint: '"Llamo" is the "I" form of llamar(se) — "me llamo" together means "my name is", literally "I call myself".',
      },
      { type: 'fixed', text: 'Ana' },
    ],
    grammarExplanation:
      '"Me" here means the action happens to yourself (a reflexive pronoun) — you\'re not naming someone else, you\'re naming yourself. "Llamo" means "I call" — together, "me llamo" literally means "I call myself", which is how Spanish says "my name is". "Ana" is a name, so it doesn\'t change between languages.',
  },

  // ================= INTERMEDIATE =================
  {
    id: 'int-1',
    difficulty: 'Intermediate',
    english: 'I like coffee',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'to me (I like...)',
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Le', 'Nos'],
        hint: '"Me" here means "to me" — who\'s affected by the thing being pleasing (an indirect object). Literally, coffee is pleasing TO ME.',
      },
      { type: 'fixed', text: 'gusta' },
      { type: 'fixed', text: 'el' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'coffee',
        correctAnswer: 'café',
        options: ['café', 'té', 'chocolate', 'jugo'],
        hint: '"Café" is coffee — the others are tea, chocolate, and juice.',
      },
    ],
    grammarExplanation:
      '"Me" here means "to me" — who\'s affected by the thing being pleasing (an indirect object), not the one doing an action. "Gusta" means "is pleasing" — it agrees with "el café" (singular), not with "me". Spanish literally says "coffee is pleasing to me" instead of English\'s "I like coffee". "El" means "the", matching the masculine word "café". "Café" means "coffee".',
  },
  {
    id: 'int-2',
    difficulty: 'Intermediate',
    english: 'The red car is expensive',
    parts: [
      { type: 'fixed', text: 'El' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'car',
        correctAnswer: 'carro',
        options: ['carro', 'carros', 'carta', 'casa'],
        hint: '"Carro" is car (the word used in Latin America — Spain more often says "coche").',
      },
      { type: 'fixed', text: 'rojo' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'is',
        correctAnswer: 'es',
        options: ['Soy', 'Eres', 'es', 'Somos'],
        hint: '"Es" (ser) is used here because being expensive is a lasting characteristic, not a temporary state.',
      },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'expensive',
        correctAnswer: 'caro',
        options: ['caro', 'cara', 'caros', 'barato'],
        hint: '"Carro" is masculine singular, so the adjective needs to match: "caro", not "cara".',
      },
    ],
    grammarExplanation:
      '"El" means "the", matching masculine "carro". "Carro" means "car". "Rojo" means "red" — it comes right after the noun it describes, the normal Spanish word order. "Es" means "is" — this uses ser (not estar) because being expensive is a lasting trait of the car, not a temporary state. "Caro" means "expensive" — it matches masculine singular "carro".',
  },
  {
    id: 'int-3',
    difficulty: 'Intermediate',
    english: "I don't have money",
    parts: [
      { type: 'fixed', text: 'No' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: "I don't have",
        correctAnswer: 'tengo',
        options: ['tengo', 'tienes', 'tiene', 'tenemos'],
        hint: '"Tengo" is the "I" form of tener — Spanish just adds "no" before the verb to say "don\'t/doesn\'t".',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'money',
        correctAnswer: 'dinero',
        options: ['dinero', 'tiempo', 'trabajo', 'hambre'],
        hint: '"Dinero" is money — the others are time, work, and hunger.',
      },
    ],
    grammarExplanation:
      '"No" means "not/don\'t" — Spanish makes a verb negative just by putting "no" directly in front of it, with no extra helper word like English "do". "Tengo" means "I have" — the -o ending marks the "I" (first person singular) form of tener. "Dinero" means "money".',
  },
  {
    id: 'int-4',
    difficulty: 'Intermediate',
    english: 'They are studying Spanish',
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishWord: 'They',
        correctAnswer: 'Ellos',
        options: ['Ellos', 'Ellas', 'Nosotros', 'Ustedes'],
        hint: '"Ellos" means "they" (a group that includes at least one male, or a mixed/unknown group).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'are studying',
        correctAnswer: 'están',
        options: ['Estoy', 'Estás', 'está', 'están'],
        hint: '"Están" + "estudiando" together mean "are studying" — "están" is the "they" form of estar.',
      },
      { type: 'fixed', text: 'estudiando' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'Spanish',
        correctAnswer: 'español',
        options: ['español', 'inglés', 'francés', 'alemán'],
        hint: '"Español" is Spanish — the others are English, French, and German.',
      },
    ],
    grammarExplanation:
      '"Ellos" means "they". "Están" means "are" — combined with "estudiando" (studying), it forms the "are studying" progressive tense, similar to English "-ing". "Estudiando" means "studying" — the form Spanish uses for an ongoing action (a gerund); it doesn\'t change based on who\'s doing it. "Español" means "Spanish" (the language).',
  },
  {
    id: 'int-5',
    difficulty: 'Intermediate',
    english: 'I see you in the park',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'you (I see you)',
        correctAnswer: 'Te',
        options: ['Te', 'Me', 'Lo', 'Nos'],
        hint: '"Te" here means "you" as the person being seen — the one the action is done to (a direct object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I see',
        correctAnswer: 'veo',
        options: ['veo', 'ves', 've', 'vemos'],
        hint: '"Veo" is the irregular "I" form of ver.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'in',
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En" means "in" when describing a location.',
      },
      { type: 'fixed', text: 'el' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'park',
        correctAnswer: 'parque',
        options: ['parque', 'jardín', 'centro', 'edificio'],
        hint: '"Parque" is park — the others are garden, downtown, and building.',
      },
    ],
    grammarExplanation:
      '"Te" here means "you" as the person being seen — the one the action happens to directly (a direct object), placed before the verb in Spanish rather than after it like English. "Veo" means "I see" — an irregular "I" form of ver. "En" means "in". "El" means "the", matching masculine "parque". "Parque" means "park".',
  },
  {
    id: 'int-6',
    difficulty: 'Intermediate',
    english: 'She helps us a lot',
    parts: [
      {
        type: 'slot',
        category: 'pronoun',
        englishWord: 'She',
        correctAnswer: 'Ella',
        options: ['Ella', 'Él', 'Ellos', 'Usted'],
        hint: '"Ella" means "she".',
      },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'us',
        correctAnswer: 'nos',
        options: ['nos', 'me', 'te', 'les'],
        hint: '"Nos" here means "us" as the people being helped — the ones the action happens to directly (a direct object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'helps',
        correctAnswer: 'ayuda',
        options: ['ayudo', 'ayudas', 'ayuda', 'ayudamos'],
        hint: '"Ayuda" is the "she/he/you(formal)" form of ayudar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'a lot',
        correctAnswer: 'mucho',
        options: ['mucho', 'poco', 'bien', 'siempre'],
        hint: '"Mucho" is "a lot" — the others are "a little", "well", and "always".',
      },
    ],
    grammarExplanation:
      '"Ella" means "she". "Nos" here means "us" as the people being helped directly (a direct object) — placed before the verb, unlike English which places "us" after "helps". "Ayuda" means "helps" — the -a ending is the "she/he/you formal" form (third person singular) of ayudar. "Mucho" means "a lot".',
  },
  {
    id: 'int-7',
    difficulty: 'Intermediate',
    english: 'I wrote him a letter',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'him (wrote him)',
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who received the letter (an indirect object), not the letter itself.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I wrote',
        correctAnswer: 'escribí',
        options: ['escribí', 'escribiste', 'escribió', 'escribimos'],
        hint: '"Escribí" is the "I" past-tense (preterite) form of escribir.',
      },
      { type: 'fixed', text: 'una' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'letter',
        correctAnswer: 'carta',
        options: ['carta', 'nota', 'postal', 'carro'],
        hint: '"Carta" is letter — don\'t confuse it with "carro" (car).',
      },
    ],
    grammarExplanation:
      '"Le" here means "to him" — who received the letter (an indirect object), separate from the letter itself, and it goes before the verb in Spanish. "Escribí" means "I wrote" — the past-tense (preterite) "I" form of escribir. "Una" means "a", matching feminine "carta". "Carta" means "letter".',
  },
  {
    id: 'int-8',
    difficulty: 'Intermediate',
    english: 'We get up early',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'ourselves (get up)',
        correctAnswer: 'Nos',
        options: ['Nos', 'Me', 'Te', 'Se'],
        hint: '"Nos" here means the action happens to yourselves as a group — literally "we get ourselves up" (a reflexive pronoun).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we get up',
        correctAnswer: 'levantamos',
        options: ['levanto', 'levantas', 'levanta', 'levantamos'],
        hint: '"Levantamos" is the "we" form of levantar(se).',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'early',
        correctAnswer: 'temprano',
        options: ['temprano', 'tarde', 'pronto', 'ahora'],
        hint: '"Temprano" is early — the others are late, soon, and now.',
      },
    ],
    grammarExplanation:
      '"Nos" here means the action happens to yourselves as a group (a reflexive pronoun) — literally "we get ourselves up". "Levantamos" means "get up" — the -mos ending is the "we" form of levantar(se). "Temprano" means "early".',
  },
  {
    id: 'int-9',
    difficulty: 'Intermediate',
    english: 'I arrived late',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I arrived',
        correctAnswer: 'Llegué',
        options: ['Llegué', 'Llegaste', 'Llegó', 'Llegamos'],
        hint: '"Llegué" is the past-tense (preterite) "I" form of llegar — notice the spelling change to "gué" to keep the hard g sound.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'late',
        correctAnswer: 'tarde',
        options: ['tarde', 'temprano', 'pronto', 'ahora'],
        hint: '"Tarde" is late — the others are early, soon, and now.',
      },
    ],
    grammarExplanation:
      '"Llegué" means "I arrived" — the past-tense (preterite) "I" form of llegar. It\'s spelled with "gué" instead of just "gé" to keep the hard g sound of llegar (a small, common spelling change in -gar verbs). "Tarde" means "late".',
  },
  {
    id: 'int-10',
    difficulty: 'Intermediate',
    english: 'We buy gifts for them',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we buy',
        correctAnswer: 'Compramos',
        options: ['Compro', 'Compras', 'Compra', 'Compramos'],
        hint: '"Compramos" is the "we" form of comprar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'gifts',
        correctAnswer: 'regalos',
        options: ['regalos', 'flores', 'dulces', 'libros'],
        hint: '"Regalos" is gifts — the others are flowers, sweets, and books.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'for',
        correctAnswer: 'para',
        options: ['para', 'por', 'de', 'con'],
        hint: '"Para" means "for" here — a common mix-up with "por", which also means "for" but in a different sense (like "because of").',
      },
      { type: 'fixed', text: 'ellos' },
    ],
    grammarExplanation:
      '"Compramos" means "we buy" — the -mos ending is the "we" form of comprar. "Regalos" means "gifts". "Para" means "for", showing who the gifts are intended for — different from "por", which also means "for" but in the sense of "because of" or "by". "Ellos" means "them".',
  },
  {
    id: 'int-11',
    difficulty: 'Intermediate',
    english: 'I look for my keys',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I look for',
        correctAnswer: 'Busco',
        options: ['Busco', 'Buscas', 'Busca', 'Buscamos'],
        hint: '"Busco" is the "I" form of buscar. Notice Spanish doesn\'t need a separate word for "for" — buscar already means "to look for".',
      },
      { type: 'fixed', text: 'mis' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'keys',
        correctAnswer: 'llaves',
        options: ['llaves', 'gafas', 'zapatos', 'documentos'],
        hint: '"Llaves" is keys — the others are glasses, shoes, and documents.',
      },
    ],
    grammarExplanation:
      '"Busco" means "I look for" — buscar already includes the idea of "for", so Spanish doesn\'t need an extra word for it. "Mis" means "my" (plural, matching "llaves"). "Llaves" means "keys".',
  },
  {
    id: 'int-12',
    difficulty: 'Intermediate',
    english: 'I find the solution',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I find',
        correctAnswer: 'Encuentro',
        options: ['Encuentro', 'Encuentras', 'Encuentra', 'Encontramos'],
        hint: '"Encuentro" is encontrar with its o changed to ue for "I" — but "we" (encontramos) keeps the plain o.',
      },
      { type: 'fixed', text: 'la' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'solution',
        correctAnswer: 'solución',
        options: ['solución', 'respuesta', 'idea', 'pregunta'],
        hint: '"Solución" is solution — the others are answer, idea, and question.',
      },
    ],
    grammarExplanation:
      '"Encuentro" means "I find" — encontrar changes its o to ue for "I/you/he-she/they" (a stem-changing verb), but not for "we". "La" means "the", matching feminine "solución". "Solución" means "solution".',
  },
  {
    id: 'int-13',
    difficulty: 'Intermediate',
    english: 'I show him the photos',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'him (show him)',
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who receives the showing (an indirect object), separate from the photos themselves.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I show',
        correctAnswer: 'muestro',
        options: ['muestro', 'muestras', 'muestra', 'mostramos'],
        hint: '"Muestro" is mostrar with its o changed to ue for "I".',
      },
      { type: 'fixed', text: 'las' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'photos',
        correctAnswer: 'fotos',
        options: ['fotos', 'videos', 'dibujos', 'documentos'],
        hint: '"Fotos" is photos — the others are videos, drawings, and documents.',
      },
    ],
    grammarExplanation:
      '"Le" here means "to him" — who receives the showing (an indirect object), separate from what\'s being shown, and it goes before the verb. "Muestro" means "I show" — mostrar changes its o to ue for "I/you/he-she/they" (a stem-changing verb). "Las" means "the" (feminine plural, matching "fotos"). "Fotos" means "photos".',
  },
  {
    id: 'int-14',
    difficulty: 'Intermediate',
    english: 'I ask them something',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'them (ask them)',
        correctAnswer: 'Les',
        options: ['Les', 'Le', 'Nos', 'Te'],
        hint: '"Les" here means "to them" (plural) — who\'s being asked (an indirect object).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I ask',
        correctAnswer: 'pregunto',
        options: ['pregunto', 'preguntas', 'pregunta', 'preguntamos'],
        hint: '"Pregunto" is the "I" form of preguntar.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'something',
        correctAnswer: 'algo',
        options: ['algo', 'nada', 'todo', 'eso'],
        hint: '"Algo" is something — the others are nothing, everything, and that.',
      },
    ],
    grammarExplanation:
      '"Les" here means "to them" (plural) — who\'s being asked (an indirect object), placed before the verb. "Pregunto" means "I ask" — the -o ending is the "I" (first person singular) form of preguntar. "Algo" means "something".',
  },
  {
    id: 'int-15',
    difficulty: 'Intermediate',
    english: 'I ask for help',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I ask for',
        correctAnswer: 'Pido',
        options: ['Pido', 'Pides', 'Pide', 'Pedimos'],
        hint: '"Pido" is pedir with its e changed to i for "I" — pedir already means "to ask for", no extra word needed.',
      },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'help',
        correctAnswer: 'ayuda',
        options: ['ayuda', 'consejo', 'perdón', 'permiso'],
        hint: '"Ayuda" is help — the others are advice, forgiveness, and permission.',
      },
    ],
    grammarExplanation:
      '"Pido" means "I ask for" — pedir changes its e to i for "I/you/he-she/they" (a stem-changing verb), and already includes the idea of "for", so no extra word is needed. "Ayuda" means "help".',
  },

  // ================= ADVANCED =================
  {
    id: 'adv-1',
    difficulty: 'Advanced',
    english: 'I hope that you arrive on time',
    parts: [
      { type: 'fixed', text: 'Espero' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'you arrive',
        correctAnswer: 'llegues',
        options: ['llegues', 'llega', 'llegue', 'lleguemos'],
        hint: '"Espero que" makes what follows uncertain/hoped-for rather than a stated fact — this triggers a special verb mood (the subjunctive). "Llegues" is that mood\'s "you" form of llegar.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'on',
        correctAnswer: 'a',
        options: ['a', 'en', 'de', 'con'],
        hint: '"A tiempo" is the fixed phrase for "on time".',
      },
      { type: 'fixed', text: 'tiempo' },
    ],
    grammarExplanation:
      '"Espero" means "I hope". "Que" means "that", introducing what\'s hoped for. "Llegues" means "(you) arrive" — because it follows "espero que" (something hoped for, not a stated fact), the verb switches to a special mood for uncertain/hoped-for actions (the subjunctive) — its "you" form. "A" means "on" here, as part of the fixed phrase "a tiempo" ("on time"). "Tiempo" means "time".',
  },
  {
    id: 'adv-2',
    difficulty: 'Advanced',
    english: 'It is important that we study every day',
    parts: [
      { type: 'fixed', text: 'Es' },
      {
        type: 'slot',
        category: 'adjective',
        englishWord: 'important',
        correctAnswer: 'importante',
        options: ['importante', 'importantes', 'necesario', 'urgente'],
        hint: '"Importante" doesn\'t change for gender, and stays singular here since it describes the whole idea, not a plural noun.',
      },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we study',
        correctAnswer: 'estudiemos',
        options: ['estudie', 'estudies', 'estudiamos', 'estudiemos'],
        hint: '"Es importante que" makes what follows a recommendation, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Estudiemos" is that form\'s "we" form of estudiar.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'every day',
        correctAnswer: 'todos los días',
        options: ['todos los días', 'todos los meses', 'cada semana', 'siempre'],
        hint: '"Todos los días" is "every day".',
      },
    ],
    grammarExplanation:
      '"Es" means "is". "Importante" means "important" — it doesn\'t change for gender, and here it describes the whole idea of studying, not one specific noun. "Que" means "that". "Estudiemos" means "(we) study" — because it follows "es importante que" (a recommendation, not a stated fact), the verb switches to a special form used for recommended or hoped-for actions (the subjunctive mood), here in its "we" form. "Todos los días" means "every day".',
  },
  {
    id: 'adv-3',
    difficulty: 'Advanced',
    english: 'If I had more time I would travel',
    parts: [
      { type: 'fixed', text: 'Si' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I had',
        correctAnswer: 'tuviera',
        options: ['tuviera', 'tuvieras', 'tuviéramos', 'tenía'],
        hint: 'This "if" clause describes something not actually true — Spanish needs a special past-tense verb form for that (the imperfect subjunctive) here, of tener — "tuviera" is its "I" form.',
      },
      { type: 'fixed', text: 'más' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'time',
        correctAnswer: 'tiempo',
        options: ['tiempo', 'dinero', 'trabajo', 'espacio'],
        hint: '"Tiempo" is time — the others are money, work, and space.',
      },
      { type: 'fixed', text: 'viajaría' },
    ],
    grammarExplanation:
      '"Si" means "if". "Tuviera" means "(I) had" — since this "if" describes something not actually true right now (a hypothetical), Spanish uses a special past-tense form for that (the imperfect subjunctive mood), here the "I" form of tener. "Más" means "more". "Tiempo" means "time". "Viajaría" means "I would travel" — the -ía ending marks a special form used for "would" actions (the conditional mood).',
  },
  {
    id: 'adv-4',
    difficulty: 'Advanced',
    english: 'The letter that I wrote to him is on the table',
    parts: [
      { type: 'fixed', text: 'La' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'letter',
        correctAnswer: 'carta',
        options: ['carta', 'nota', 'postal', 'carro'],
        hint: '"Carta" is letter — don\'t confuse it with "carro" (car).',
      },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'to him',
        correctAnswer: 'le',
        options: ['le', 'te', 'nos', 'les'],
        hint: '"Le" here means "to him" — who received the letter (an indirect object), and it comes right before the verb.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I wrote',
        correctAnswer: 'escribí',
        options: ['escribí', 'escribiste', 'escribió', 'escribimos'],
        hint: '"Escribí" is the past-tense (preterite) "I" form of escribir.',
      },
      { type: 'fixed', text: 'está' },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'on',
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En la mesa" is the standard way to say "on the table".',
      },
      { type: 'fixed', text: 'la' },
      { type: 'fixed', text: 'mesa' },
    ],
    grammarExplanation:
      '"La" means "the", matching feminine "carta". "Carta" means "letter". "Que" means "that/which", introducing more detail about the letter. "Le" means "to him" — who received the letter (an indirect object), placed right before the verb. "Escribí" means "I wrote" — the past-tense (preterite) "I" form of escribir. "Está" means "is" (location, using estar). "En" means "on". "La mesa" means "the table".',
  },
  {
    id: 'adv-5',
    difficulty: 'Advanced',
    english: 'You should eat more vegetables',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'you should',
        correctAnswer: 'Deberías',
        options: ['Deberías', 'Debería', 'Deberíamos', 'Debes'],
        hint: '"Deberías" is the "should/would" form of deber (the conditional mood) — its "you" form.',
      },
      { type: 'fixed', text: 'comer' },
      { type: 'fixed', text: 'más' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'vegetables',
        correctAnswer: 'verduras',
        options: ['verduras', 'frutas', 'verdura', 'carnes'],
        hint: '"Verduras" is vegetables (plural) — "frutas" would be fruits.',
      },
    ],
    grammarExplanation:
      '"Deberías" means "you should" — the -ías ending marks a special form used for "should/would" actions (the conditional mood) in its "you" form. "Comer" means "to eat" (an infinitive right after "deberías"). "Más" means "more". "Verduras" means "vegetables".',
  },
  {
    id: 'adv-6',
    difficulty: 'Advanced',
    english: 'Although it is raining, we are going to go out',
    parts: [
      { type: 'fixed', text: 'Aunque' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'it is raining',
        correctAnswer: 'está',
        options: ['Estoy', 'Estás', 'está', 'Estamos'],
        hint: '"Está lloviendo" is the standard way to say "it is raining" — weather verbs use the "it" (third person singular) form.',
      },
      { type: 'fixed', text: 'lloviendo,' },
      { type: 'fixed', text: 'vamos' },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'to (going to)',
        correctAnswer: 'a',
        options: ['a', 'de', 'en', 'con'],
        hint: '"Vamos a salir" ("we\'re going to go out") uses "ir a" plus an infinitive — a very common way to talk about near-future plans.',
      },
      { type: 'fixed', text: 'salir' },
    ],
    grammarExplanation:
      '"Aunque" means "although". "Está" means "is" — combined with "lloviendo" (raining), it forms "is raining"; weather verbs like this use the "it" (third person singular) form. "Lloviendo" means "raining" — the form Spanish uses for an ongoing action (a gerund), equivalent to English "-ing". "Vamos" means "we are going". "A" here is part of "ir a" plus an infinitive, a common way to talk about near-future plans — "going to do something". "Salir" means "to go out".',
  },
  {
    id: 'adv-7',
    difficulty: 'Advanced',
    english: 'I doubt that he is coming',
    parts: [
      { type: 'fixed', text: 'Dudo' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'pronoun',
        englishWord: 'he',
        correctAnswer: 'él',
        options: ['él', 'ella', 'ellos', 'usted'],
        hint: '"Él" means "he".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'is coming',
        correctAnswer: 'venga',
        options: ['venga', 'vengas', 'viene', 'vengamos'],
        hint: '"Dudo que" makes what follows doubted, not a stated fact — this triggers a special verb form for that (the subjunctive mood). "Venga" is that form\'s "he/she/you(formal)" form of venir.',
      },
    ],
    grammarExplanation:
      '"Dudo" means "I doubt". "Que" means "that". "Él" means "he". "Venga" means "(he) is coming/will come" — because it follows "dudo que" (something doubted, not a stated fact), the verb switches to a special form used for doubted or uncertain actions (the subjunctive mood), here in its "he/she/you formal" form of venir.',
  },
  {
    id: 'adv-8',
    difficulty: 'Advanced',
    english: "I'm sorry that you're leaving",
    parts: [
      { type: 'fixed', text: 'Siento' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'yourself (you\'re leaving)',
        correctAnswer: 'te',
        options: ['te', 'me', 'nos', 'se'],
        hint: '"Te" here means the action happens to yourself (a reflexive pronoun) — irse ("to leave/go away") is built around that kind of self-directed action (a reflexive verb).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: "you're leaving",
        correctAnswer: 'vayas',
        options: ['vayas', 'vaya', 'vayamos', 'vas'],
        hint: '"Siento que" makes what follows an emotional reaction, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Vayas" is that form\'s "you" form of irse.',
      },
    ],
    grammarExplanation:
      '"Siento" means "I feel/I\'m sorry". "Que" means "that". "Te" here means the action happens to yourself (a reflexive pronoun) — irse ("to leave") is a verb built around that kind of self-directed action (a reflexive verb). "Vayas" means "(you) leave/are leaving" — because it follows "siento que" (an emotional reaction, not a stated fact), the verb switches to a special form used for emotional reactions (the subjunctive mood), here in its "you" form of irse.',
  },
  {
    id: 'adv-9',
    difficulty: 'Advanced',
    english: 'I prefer that we speak in Spanish',
    parts: [
      { type: 'fixed', text: 'Prefiero' },
      { type: 'fixed', text: 'que' },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we speak',
        correctAnswer: 'hablemos',
        options: ['hable', 'hables', 'hablamos', 'hablemos'],
        hint: '"Prefiero que" makes what follows a preference, not a plain fact — this triggers a special verb form for that (the subjunctive mood). "Hablemos" is that form\'s "we" form of hablar.',
      },
      {
        type: 'slot',
        category: 'preposition',
        englishWord: 'in',
        correctAnswer: 'en',
        options: ['en', 'a', 'de', 'con'],
        hint: '"En español" means "in Spanish".',
      },
      { type: 'fixed', text: 'español' },
    ],
    grammarExplanation:
      '"Prefiero" means "I prefer". "Que" means "that". "Hablemos" means "(we) speak" — because it follows "prefiero que" (a preference, not a stated fact), the verb switches to a special form used for preferred or wished-for actions (the subjunctive mood), here in its "we" form of hablar. "En" means "in". "Español" means "Spanish".',
  },
  {
    id: 'adv-10',
    difficulty: 'Advanced',
    english: 'We could go out tonight',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'we could',
        correctAnswer: 'Podríamos',
        options: ['Podría', 'Podrías', 'Podríamos', 'Puedo'],
        hint: '"Podríamos" is the "could/would" form of poder (the conditional mood) — its "we" form.',
      },
      { type: 'fixed', text: 'salir' },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'tonight',
        correctAnswer: 'esta noche',
        options: ['esta noche', 'mañana', 'hoy', 'ahora'],
        hint: '"Esta noche" is tonight.',
      },
    ],
    grammarExplanation:
      '"Podríamos" means "we could" — the -íamos ending marks a special form used for "could/would" actions (the conditional mood) in its "we" form of poder. "Salir" means "to go out" (an infinitive right after "podríamos"). "Esta noche" means "tonight".',
  },
  {
    id: 'adv-11',
    difficulty: 'Advanced',
    english: 'I tell him the truth',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'him (tell him)',
        correctAnswer: 'Le',
        options: ['Le', 'Te', 'Nos', 'Les'],
        hint: '"Le" here means "to him" — who\'s told the truth (an indirect object), placed before the verb.',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I tell',
        correctAnswer: 'digo',
        options: ['digo', 'dices', 'dice', 'decimos'],
        hint: '"Digo" is the irregular "I" form of decir.',
      },
      { type: 'fixed', text: 'la' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'truth',
        correctAnswer: 'verdad',
        options: ['verdad', 'razón', 'historia', 'idea'],
        hint: '"Verdad" is truth — the others are reason, story, and idea.',
      },
    ],
    grammarExplanation:
      '"Le" here means "to him" — who\'s told the truth (an indirect object), separate from the truth itself, and it goes before the verb. "Digo" means "I tell/say" — an irregular "I" form of decir. "La" means "the", matching feminine "verdad". "Verdad" means "truth".',
  },
  {
    id: 'adv-12',
    difficulty: 'Advanced',
    english: 'I bring dessert tomorrow',
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I bring',
        correctAnswer: 'Traigo',
        options: ['Traigo', 'Traes', 'Trae', 'Traemos'],
        hint: '"Traigo" is the irregular "I" form of traer.',
      },
      { type: 'fixed', text: 'el' },
      {
        type: 'slot',
        category: 'noun',
        englishWord: 'dessert',
        correctAnswer: 'postre',
        options: ['postre', 'plato', 'pan', 'vino'],
        hint: '"Postre" is dessert — the others are dish, bread, and wine.',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'tomorrow',
        correctAnswer: 'mañana',
        options: ['mañana', 'hoy', 'ayer', 'ahora'],
        hint: '"Mañana" is tomorrow — the others are today, yesterday, and now.',
      },
    ],
    grammarExplanation:
      '"Traigo" means "I bring" — an irregular "I" form of traer. "El" means "the", matching masculine "postre". "Postre" means "dessert". "Mañana" means "tomorrow".',
  },
  {
    id: 'adv-13',
    difficulty: 'Advanced',
    english: 'I usually leave early',
    parts: [
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'Generally/usually',
        correctAnswer: 'Generalmente',
        options: ['Generalmente', 'Rápidamente', 'Fácilmente', 'Finalmente'],
        hint: '"Generalmente" is "generally/usually" — the others are "quickly", "easily", and "finally".',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I leave',
        correctAnswer: 'salgo',
        options: ['salgo', 'sales', 'sale', 'salimos'],
        hint: '"Salgo" is the irregular "I" form of salir.',
      },
      { type: 'fixed', text: 'temprano' },
    ],
    grammarExplanation:
      '"Generalmente" means "generally/usually" — placed at the start of the sentence here, unlike English "usually" which more often sits closer to the verb. "Salgo" means "I leave" — an irregular "I" form of salir. "Temprano" means "early".',
  },
  {
    id: 'adv-14',
    difficulty: 'Advanced',
    english: "I think that you're right",
    parts: [
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I think',
        correctAnswer: 'Pienso',
        options: ['Pienso', 'Piensas', 'Piensa', 'Pensamos'],
        hint: '"Pienso" is pensar with its e changed to ie for "I".',
      },
      { type: 'fixed', text: 'que' },
      { type: 'fixed', text: 'tienes' },
      { type: 'fixed', text: 'razón' },
    ],
    grammarExplanation:
      '"Pienso" means "I think" — pensar changes its e to ie for "I/you/he-she/they" (a stem-changing verb). "Que" means "that". "Tienes razón" is a fixed phrase meaning "you\'re right" — literally "you have reason".',
  },
  {
    id: 'adv-15',
    difficulty: 'Advanced',
    english: 'I feel good today',
    parts: [
      {
        type: 'slot',
        category: 'object-pronoun',
        englishWord: 'myself (I feel)',
        correctAnswer: 'Me',
        options: ['Me', 'Te', 'Se', 'Nos'],
        hint: '"Me" here means the action happens to yourself (a reflexive pronoun) — sentirse ("to feel") is built around that kind of self-directed action (a reflexive verb).',
      },
      {
        type: 'slot',
        category: 'verb',
        englishWord: 'I feel',
        correctAnswer: 'siento',
        options: ['siento', 'sientes', 'siente', 'sentimos'],
        hint: '"Siento" is sentir(se) with its e changed to ie for "I".',
      },
      {
        type: 'slot',
        category: 'adverb',
        englishWord: 'good',
        correctAnswer: 'bien',
        options: ['bien', 'mal', 'raro', 'cansado'],
        hint: '"Bien" is "well/good" — the others are "badly", "strange", and "tired".',
      },
      { type: 'fixed', text: 'hoy' },
    ],
    grammarExplanation:
      '"Me" here means the action happens to yourself (a reflexive pronoun) — sentirse ("to feel") is a verb built around that kind of self-directed action (a reflexive verb). "Siento" means "I feel" — sentir(se) changes its e to ie for "I/you/he-she/they" (a stem-changing verb). "Bien" means "well/good". "Hoy" means "today".',
  },
]

export const SENTENCE_BUILDER_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
