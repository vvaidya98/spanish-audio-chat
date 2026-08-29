import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { Anthropic } from '@anthropic-ai/sdk';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

// SAC-076: shared between generateStoryFromClaude (pre-built scenarios) and
// generateCustomStoryFromClaude (custom topics) — previously only the custom
// endpoint had a difficulty concept at all (SAC-071); pre-built stories
// always generated at one fixed, implicitly-beginner level. Hoisted to
// module scope once both functions need the identical wording.
const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTY_GUIDE = {
  Beginner: 'Simple present tense, common everyday vocabulary, short clear sentences, no subjunctive.',
  Intermediate: 'A mix of present and past tenses, more varied vocabulary, natural sentence structure.',
  Advanced: 'Complex sentences, subjunctive mood where natural, idiomatic expressions, varied verb tenses.',
};

// API call usage tracking (SAC-062), for dev cost visibility only — not
// billed/enforced, just logged. Uses Node's built-in node:sqlite (stable in
// Node 22.5+/24) rather than an npm dependency like better-sqlite3, so this
// needs zero extra installs and no native build step. Local file, git-ignored
// (see .gitignore) — same "doesn't survive a fresh clone" tradeoff as the
// existing in-memory story caches, just persisted to disk instead of memory
// since usage stats are meant to accumulate across server restarts.
const COST_PER_1K_TOKENS = 0.003;
fs.mkdirSync('./data', { recursive: true });
const usageDb = new DatabaseSync('./data/api_usage.db');
usageDb.exec(`
  CREATE TABLE IF NOT EXISTS api_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_estimate REAL NOT NULL
  )
`);

// SAC-073: persistent story cache, same db file/mechanism as the usage log
// above (same "local dev-cost tracking"-style tradeoff — git-ignored, doesn't
// survive a fresh clone, but does survive a server restart within one
// deployed environment, which is the whole point: story generation is the
// same cost either way, this just avoids paying it again on every restart).
//
// SAC-076: primary key changed from `scenario` alone to `(scenario,
// difficulty)` — a scenario can now exist at up to 3 cached difficulty
// levels simultaneously, and regenerating at Intermediate must not overwrite
// (or be shadowed by) a separately-cached Beginner version of the same
// scenario. On Railway this needs no real migration (confirmed in the
// SAC-073 round — the filesystem is ephemeral with no persistent volume, so
// a fresh CREATE TABLE with a different key shape is free there). Local dev
// DOES persist ./data/api_usage.db across restarts, though, so a pre-SAC-076
// dev database can still have the old scenario-only-PK table on disk —
// dropped and recreated below if so (losing a warm local cache is harmless,
// it just re-warms on next startup).
const storyCacheColumns = usageDb.prepare("PRAGMA table_info(story_cache)").all();
if (storyCacheColumns.length > 0 && !storyCacheColumns.some((c) => c.name === 'difficulty')) {
  console.log('[startup] Migrating story_cache to (scenario, difficulty) schema — dropping old cache table');
  usageDb.exec('DROP TABLE story_cache');
}
usageDb.exec(`
  CREATE TABLE IF NOT EXISTS story_cache (
    scenario TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    story_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (scenario, difficulty)
  )
`);

// Logging failures (e.g. a locked/corrupt db file) must never break the
// actual API response they're piggybacking on — swallow and log instead.
function logApiCall(endpoint, model, inputTokens, outputTokens) {
  try {
    const cost = ((inputTokens + outputTokens) / 1000) * COST_PER_1K_TOKENS;
    usageDb
      .prepare(
        'INSERT INTO api_calls (timestamp, endpoint, model, input_tokens, output_tokens, cost_estimate) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(new Date().toISOString(), endpoint, model, inputTokens, outputTokens, cost);
  } catch (err) {
    console.error('[usage] Failed to log API call:', err);
  }
}

function featureForEndpoint(endpoint) {
  if (endpoint === '/api/generate-story') return 'Stories';
  if (endpoint === '/api/story-questions') return 'Questions';
  if (endpoint === '/api/translate') return 'Translation';
  if (endpoint === '/api/generate-custom-story' || endpoint === '/api/generate-suggested-topics') return 'Custom Stories';
  // SAC-079: own bucket rather than folding into 'Stories' — a distinct,
  // separately-visible cost driver (fires on every story load/regenerate
  // in the background, independent of whether a user ever clicks ⓘ),
  // matching this project's existing precedent of giving custom stories
  // their own bucket for the same "genuinely distinct cost" reason.
  if (endpoint === '/api/generate-sentence-explanations') return 'Explanations';
  return 'Conversation';
}

function getUsageStats() {
  const now = Date.now();
  const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const sevenDaysAgoIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgoIso = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  const sumRow = (rows) =>
    rows.reduce(
      (acc, r) => ({
        calls: acc.calls + 1,
        tokens: acc.tokens + r.input_tokens + r.output_tokens,
        cost: acc.cost + r.cost_estimate,
      }),
      { calls: 0, tokens: 0, cost: 0 }
    );

  const allRows = usageDb.prepare('SELECT * FROM api_calls').all();
  const todayRows = allRows.filter((r) => r.timestamp >= todayStartIso);
  const last7Rows = allRows.filter((r) => r.timestamp >= sevenDaysAgoIso);
  const prior7Rows = allRows.filter((r) => r.timestamp >= fourteenDaysAgoIso && r.timestamp < sevenDaysAgoIso);

  const today = sumRow(todayRows);
  const last7 = sumRow(last7Rows);
  const prior7 = sumRow(prior7Rows);

  const last7AvgPerDay = last7.cost / 7;
  const trendPercent =
    prior7.cost > 0 ? Math.round(((last7.cost - prior7.cost) / prior7.cost) * 100) : null;

  const totalCost = allRows.reduce((sum, r) => sum + r.cost_estimate, 0);
  const byFeature = {};
  for (const row of allRows) {
    const feature = featureForEndpoint(row.endpoint);
    byFeature[feature] = (byFeature[feature] || 0) + row.cost_estimate;
  }
  const breakdown = Object.entries(byFeature).map(([feature, cost]) => ({
    feature,
    cost: Math.round(cost * 10000) / 10000,
    percent: totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0,
  }));

  return {
    today: {
      calls: today.calls,
      tokens: today.tokens,
      cost: Math.round(today.cost * 10000) / 10000,
    },
    last7Days: {
      avgPerDay: Math.round(last7AvgPerDay * 10000) / 10000,
      trendPercent,
    },
    totalCalls: allRows.length,
    breakdown,
  };
}

// SAC-073: SQLite-backed cache (was an in-memory Map through v1.0y — see
// prior note in git history). The in-memory version was lost on every
// restart/redeploy, meaning the *first* load after every deploy paid the full
// ~20s generation cost again, for every scenario independently, no matter how
// many times it had already been generated in a prior run. Same
// getCachedStory/cacheStory call sites as before (the route handler and
// warmupCache() below don't need to know the storage changed underneath
// them) — reads/writes wrapped in try/catch so a locked or corrupt db file
// degrades to "cache miss, generate fresh" rather than a hard failure.
function getCachedStory(scenario, difficulty = 'Beginner') {
  try {
    const row = usageDb.prepare('SELECT story_json FROM story_cache WHERE scenario = ? AND difficulty = ?').get(scenario, difficulty);
    return row ? JSON.parse(row.story_json) : null;
  } catch (err) {
    console.error('[cache] Failed to read story cache, treating as a miss:', err);
    return null;
  }
}

function cacheStory(scenario, difficulty, storyData) {
  try {
    usageDb
      .prepare(
        `INSERT INTO story_cache (scenario, difficulty, story_json, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(scenario, difficulty) DO UPDATE SET story_json = excluded.story_json, created_at = excluded.created_at`
      )
      .run(scenario, difficulty, JSON.stringify(storyData), new Date().toISOString());
    console.log(`[cache] Stored: ${scenario} (${difficulty})`);
  } catch (err) {
    console.error('[cache] Failed to write story cache (story still returned to the caller, just not persisted):', err);
  }
}

// SAC-073: must match src/components/ScenarioSelector.jsx's DEFAULT_SCENARIOS
// titles exactly (the story cache is keyed on this exact string) — there's no
// shared module between the frontend bundle and this backend to import a
// single source of truth from, so this list is a deliberate, disclosed
// duplication. If a scenario is ever added/renamed there, it needs the same
// change here or it just won't get pre-warmed (falls back to a normal ~20s
// live generation on first request, same as any scenario not yet cached).
const WARMUP_SCENARIOS = [
  'Introducing Yourself',
  'Ordering at a Restaurant',
  'Asking for Directions',
  'Making a New Friend',
  'At the Airport/Hotel',
  'At a Pharmacy/Doctor',
  'Shopping in a Store',
  'Asking for Help/Emergency',
];

let cacheReady = false;
let cacheWarmupStatus = { total: WARMUP_SCENARIOS.length, alreadyCached: 0, generated: 0, failed: 0 };

// Separate cache for /api/story-questions (MCQ + vocabulary-matching data).
// SAC-034 made regenerate clear the old entry (a fresh story needs fresh
// questions, not stale ones from the story it replaced) — this comment used
// to say the opposite ("deliberately not tied to regenerate"), which stopped
// being true once that fix shipped; corrected here instead of left stale.
// SAC-076: key is now `${scenario}|||${difficulty}`, not `scenario` alone —
// the same scenario can have differently-worded (and differently-lengthed)
// questions per difficulty, since they're generated from that difficulty's
// story text; without this, switching difficulty could show comprehension
// questions written for a *different* difficulty's story.
const questionsCache = new Map();
const questionsCacheKey = (scenario, difficulty) => `${scenario}|||${difficulty}`;

function getCachedQuestions(scenario, difficulty) {
  return questionsCache.get(questionsCacheKey(scenario, difficulty)) || null;
}

function cacheQuestions(scenario, difficulty, data) {
  questionsCache.set(questionsCacheKey(scenario, difficulty), data);
  console.log(`[cache] Stored questions for: ${scenario} (${difficulty})`);
}

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors({
  origin: ['http://localhost:5173', process.env.FRONTEND_URL || ''],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;

function extractJson(rawText) {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
}

/**
 * POST /api/initiate
 * Claude says the opening greeting in Spanish for a given scenario
 */
app.post('/api/initiate', async (req, res) => {
  const { scenario } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: 'Missing scenario' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are a beginner Spanish conversation partner. Start a natural, simple conversation about: "${scenario}". 

Speak slowly and use simple vocabulary appropriate for absolute beginners. 

Respond with ONLY your Spanish greeting/opening (2-3 sentences max). Do not include English or explanations.`,
        },
      ],
    });

    const spanish = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    logApiCall('/api/initiate', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json({ spanish });
  } catch (error) {
    console.error('Error in /api/initiate:', error);
    res.status(500).json({
      error: error.message || 'Failed to initiate conversation',
    });
  }
});

/**
 * POST /api/respond
 * User input → Claude response + feedback
 */
app.post('/api/respond', async (req, res) => {
  const { userInput, scenario } = req.body;

  if (!userInput || !scenario) {
    return res.status(400).json({ error: 'Missing userInput or scenario' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a beginner Spanish conversation partner. The conversation topic is: "${scenario}".

The user just said in Spanish: "${userInput}"

Respond with ONLY a JSON object (no markdown fences, no extra text) in exactly this shape:

{
  "spanish": "Your Spanish response (simple, 2-3 sentences, slow vocabulary)",
  "feedback": "Brief encouragement in English (1-2 sentences)",
  "errors": [
    { "userSaid": "exact quote from what the user said", "corrected": "corrected version", "explanation": "brief explanation of the error" }
  ]
}

If the user's Spanish had no errors worth flagging, return "errors": []. Only flag genuine grammar/vocabulary errors, not stylistic variation. Keep explanations short and encouraging, not harsh — comprehension and being understood matter more than perfect grammar at this stage.`,
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    let spanish = '';
    let feedback = 'Well done!';
    let errors = [];

    try {
      const parsed = extractJson(rawText);
      spanish = parsed.spanish || '';
      feedback = parsed.feedback || feedback;
      errors = Array.isArray(parsed.errors) ? parsed.errors : [];
    } catch (parseError) {
      console.error('Error parsing /api/respond JSON, falling back to raw text:', parseError);
      spanish = rawText;
    }

    logApiCall('/api/respond', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json({ spanish, feedback, errors });
  } catch (error) {
    console.error('Error in /api/respond:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate response',
    });
  }
});

// SAC-073: pulled out of the /api/generate-story handler so warmupCache()
// (below) can generate+cache a story the exact same way the route does,
// without duplicating the prompt or the response-shape logic. Does not touch
// the cache itself (the route handler and warmupCache() each decide when to
// call this and what to do with the result) and does not catch its own
// errors — callers are expected to.
async function generateStoryFromClaude(scenario, difficulty = 'Beginner') {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 7000,
    messages: [
      {
        role: 'user',
        content: `You are writing a Spanish listening-comprehension story for a language learner, for the scenario: "${scenario}".

Difficulty level: ${difficulty}. ${DIFFICULTY_GUIDE[difficulty]}

Write a story in Spanish, 100-150 words total across 7-10 sentences (natural pacing, with pauses between sentences to absorb each one). This is important: EACH sentence must be 10-15 words long — short and punchy, but a complete thought, not a fragment. For example: "Ana entra en el restaurante y busca una mesa vacía cerca de la ventana." (13 words) or "El camarero le trae el menú y le pregunta qué desea comer." (12 words). Give the story a coherent narrative arc — a clear beginning, middle, and end.

Use a VARIED, expanded vocabulary rather than only the most obvious handful of words for this scenario — go beyond the first words that come to mind. For example, for "Ordering at a Restaurant", don't just use pollo/arroz/agua/camarero every time; also draw from a wider pool depending on what fits the story: other foods (pescado, verduras, ensalada, sopa, pan, postre), other drinks (café, vino, cerveza, té, jugo), and varied action verbs (probar, pedir, recomendar, disfrutar, compartir, pagar) — pick whichever of these fit the specific story you're writing, don't force all of them in.

To ensure this story is completely different from any previously generated story for this scenario, explicitly vary at least 5 key elements:

1. Character names and backgrounds — make them distinct individuals with different personalities or professions
2. Specific items/objects/foods/places relevant to "${scenario}" — use different options than typical defaults
3. Dialogue and interactions between characters — vary the tone, topics discussed, and problems they address
4. Central problem/conflict or goal — what challenge do the characters face? Make it different from a basic/typical scenario
5. Setting details and atmosphere — time of day, weather, mood, environment, season, or crowd level

Even if this is a repeat generation for "${scenario}", make these changes so the story feels completely fresh and new.

Respond with ONLY a JSON object (no markdown fences, no extra text) in exactly this shape:

{
  "sentences": [
    { "spanish": "María va a un restaurante.", "english": "María goes to a restaurant." }
  ],
  "vocabulary": [
    { "word": "restaurante", "english": "restaurant" }
  ]
}

"sentences" must be the story broken into 7-10 individual sentences, each with its exact English translation — these drive sentence-by-sentence audio playback and hover-to-translate in the UI, so each pair must line up precisely (one Spanish sentence, one matching English sentence).

The "vocabulary" array must include an entry for EVERY distinct word that appears across all sentences — including small common words like "el", "la", "de", "es", "y", "un" — not just content words. Lowercase each "word" value and strip punctuation so it matches the word as it would be looked up (e.g. "gente." in the story becomes "gente" in vocabulary). Give the English meaning as used in that specific context.`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('/api/generate-story: response hit max_tokens, JSON may be truncated');
  }

  const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const parsed = extractJson(rawText);

  const storyData = {
    sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
  };
  logApiCall('/api/generate-story', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
  return storyData;
}

/**
 * POST /api/generate-story
 * Generates a short listening-comprehension story for a scenario, reusing
 * that scenario's vocabulary, plus a word-by-word vocabulary list for tooltips.
 */
app.post('/api/generate-story', async (req, res) => {
  // SAC-076: difficulty defaults to 'Beginner' if omitted, so any caller that
  // predates this round (or the frontend's own initial scenario-pick flow,
  // which still doesn't ask for a difficulty) gets identical behavior to
  // before this feature existed.
  const { scenario, regenerate, difficulty = 'Beginner' } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: 'Missing scenario' });
  }
  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }

  if (!regenerate) {
    const cached = getCachedStory(scenario, difficulty);
    if (cached) {
      console.log(`[generate-story] Using cached story for '${scenario}' (${difficulty})`);
      return res.json(cached);
    }
  } else {
    // The old story's questions/vocab-matching data no longer matches what's
    // about to be generated — drop it so the next /api/story-questions call
    // regenerates fresh instead of serving a stale, mismatched cache hit.
    // Only this exact (scenario, difficulty) combo's questions are invalid —
    // other difficulty levels' cached stories/questions are untouched.
    questionsCache.delete(questionsCacheKey(scenario, difficulty));
    console.log(`[cache] Cleared questions for regenerate: ${scenario} (${difficulty})`);
  }
  console.log(`[generate-story] ${regenerate ? 'Regenerating' : 'Generating'} story for '${scenario}' (${difficulty})`);

  try {
    const storyData = await generateStoryFromClaude(scenario, difficulty);
    cacheStory(scenario, difficulty, storyData);
    res.json(storyData);
  } catch (error) {
    console.error('Error in /api/generate-story:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate story',
    });
  }
});

// SAC-079: for each sentence in an already-generated story, a short note on
// how its structure differs from English — phrase, literal translation,
// natural English syntax, and a one-line pattern observation. Called by the
// frontend in the background right after a story loads/regenerates (never
// blocks Play), not folded into story generation itself, since the whole
// point is Play stays available the instant the story text is back.
// Deliberately uncached (unlike story_cache/questionsCache) — not asked for
// this round, and a real, disclosed cost tradeoff worth flagging: a warmed
// Beginner scenario replayed by many different users re-generates
// explanations fresh every single time. Parked as a follow-up idea in
// PENDING.md rather than silently built.
async function generateSentenceExplanations(sentences, difficulty) {
  const difficultyContext = {
    Beginner: 'a beginner Spanish learner, focused on simple, common patterns',
    Intermediate: 'an intermediate Spanish learner, ready for more nuanced structural differences',
    Advanced: 'an advanced Spanish learner, including complex or subtle sentence structures',
  };

  // 0-indexed in both the numbered list shown to Claude AND the requested
  // "sentenceIndex" field, deliberately — the frontend keys its lookup by
  // the same 0-indexed `currentIndex`/`idx` used everywhere else in
  // ListeningStoryView.jsx, so any mismatch here (e.g. a 1-indexed list
  // alongside a 0-indexed sentenceIndex request, which is what the
  // originally-given version of this prompt's code would have produced)
  // risks Claude echoing back the same indexing it was just shown.
  const sentencesText = sentences.map((s, idx) => `${idx}. ${s}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    // This project has hit max_tokens truncation on structured-JSON
    // endpoints before at tighter budgets than this (see the v1.0d and
    // SAC-071 incidents) — erring generous for up to 10 sentences x 4
    // short fields each.
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `For each Spanish sentence below, briefly explain how its structure differs from English — plain, non-jargon language, for ${difficultyContext[difficulty]}.

Sentences (0-indexed):
${sentencesText}

Respond with ONLY a JSON array (no markdown fences, no extra text), one object per sentence, in exactly this shape:

[
  {
    "sentenceIndex": 0,
    "phrase": "le trae el menú",
    "literalTranslation": "to-her brings the menu",
    "englishSyntax": "brings her the menu",
    "pattern": "Spanish puts the object pronoun before the verb, not after it like English does."
  }
]

"sentenceIndex" must be the 0-indexed position matching the numbered list above (the first sentence is 0). Include every sentence, even simple ones where the difference is small — pick whatever's most notable about that sentence's construction. "phrase" is a short excerpt (not the whole sentence) that best shows the difference.`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('/api/generate-sentence-explanations: response hit max_tokens, JSON may be truncated');
  }

  const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  // extractJson() (used elsewhere in this file) only matches a `{...}`
  // object — this response is a top-level `[...]` array, so it needs its
  // own regex rather than reusing that helper.
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  if (!Array.isArray(parsed)) {
    throw new Error('Explanations response was not a JSON array');
  }

  logApiCall('/api/generate-sentence-explanations', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
  return parsed;
}

/**
 * POST /api/generate-sentence-explanations
 * SAC-079: sentences + difficulty in, one grammar-pattern explanation per
 * sentence out. Called in the background right after a story is displayed —
 * see ListeningStoryView.jsx's effect on `story`.
 */
app.post('/api/generate-sentence-explanations', async (req, res) => {
  const { sentences, difficulty = 'Beginner' } = req.body;

  if (!Array.isArray(sentences) || sentences.length === 0) {
    return res.status(400).json({ error: 'sentences array is required' });
  }
  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }

  console.log(`[explanations] Generating for ${sentences.length} sentences (${difficulty})`);
  try {
    const explanations = await generateSentenceExplanations(sentences, difficulty);
    res.json({ explanations });
  } catch (error) {
    console.error('Error in /api/generate-sentence-explanations:', error);
    res.status(500).json({ error: error.message || 'Failed to generate explanations' });
  }
});

/**
 * POST /api/story-questions
 * Generates 2-3 multiple-choice comprehension questions for a given story.
 */
app.post('/api/story-questions', async (req, res) => {
  // SAC-076: difficulty defaults to 'Beginner' for the same backward-compat
  // reason as /api/generate-story — used here purely as part of the cache
  // key (so switching a scenario's difficulty can't serve questions written
  // for a different difficulty's story) and in the prompt's own framing.
  const { scenario, story_text, difficulty = 'Beginner' } = req.body;

  if (!scenario || !story_text) {
    return res.status(400).json({ error: 'Missing scenario or story_text' });
  }

  const cachedQuestions = getCachedQuestions(scenario, difficulty);
  if (cachedQuestions) {
    console.log(`[story-questions] Using cached questions for '${scenario}' (${difficulty})`);
    return res.json(cachedQuestions);
  }
  console.log(`[story-questions] Generating questions for '${scenario}' (${difficulty})`);

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4500,
      messages: [
        {
          role: 'user',
          content: `Here is a ${difficulty.toLowerCase()}-level Spanish story for the scenario "${scenario}":

"${story_text}"

Write 2-3 multiple-choice comprehension questions in Spanish testing understanding of the story (what happened, who did what, why). Each question needs 3-4 answer options with exactly one marked correct, and a short Spanish explanation of the correct answer.

Also select 5-10 words FROM THE STORY TEXT ABOVE (exact words as they appear, not new words) that are worth a vocabulary-matching exercise — a mix of difficulty: some easy/common words, some medium, some genuinely harder or less obvious ones. Skip trivial words like "el"/"la"/"y".

Respond with ONLY a JSON object (no markdown fences, no extra text) in exactly this shape:

{
  "questions": [
    {
      "question_spanish": "¿Dónde se desarrolla la historia?",
      "question_english": "Where does the story take place?",
      "options": [
        { "text": "En un restaurante", "english": "In a restaurant", "correct": true },
        { "text": "En una tienda", "english": "In a store", "correct": false }
      ],
      "explanation": "La historia ocurre en un restaurante."
    }
  ],
  "vocabulary": [
    { "word": "dónde", "english": "where" }
  ],
  "matchingWords": [
    {
      "word": "restaurante",
      "english": "restaurant",
      "difficulty": "easy",
      "examplePhrase": "un buen restaurante",
      "examplePhraseEnglish": "a good restaurant",
      "exampleSentence": "Vamos a un restaurante nuevo.",
      "exampleSentenceEnglish": "We're going to a new restaurant."
    }
  ]
}

"question_english" is the exact English translation of "question_spanish", and each option's "english" is the exact translation of its "text" — these drive hover-to-translate in the UI. "vocabulary" must include an entry for EVERY distinct word appearing across all questions and all options (including small common words like "el", "la", "de", "es", "y", "un"), lowercased and stripped of punctuation, for word-level click-to-define — this is separate from and may include words not in the story's own vocabulary list (e.g. question words like "dónde", "quién"). "matchingWords" is separate again — 5-10 entries, "difficulty" is one of "easy"/"medium"/"hard", with a genuine mix across the set (not all the same level); each entry also needs "examplePhrase" (a short 2-4 word Spanish phrase using the word, not just the bare word) + "examplePhraseEnglish" (its translation), and "exampleSentence" (a full simple Spanish sentence using the word, different from how it's used in the story) + "exampleSentenceEnglish" (its translation) — these teach the word in a new context beyond the story itself.`,
        },
      ],
    });

    if (message.stop_reason === 'max_tokens') {
      console.warn('/api/story-questions: response hit max_tokens, JSON may be truncated');
    }

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const parsed = extractJson(rawText);

    const questionsData = {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
      matchingWords: Array.isArray(parsed.matchingWords) ? parsed.matchingWords : [],
    };
    cacheQuestions(scenario, difficulty, questionsData);
    logApiCall('/api/story-questions', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json(questionsData);
  } catch (error) {
    console.error('Error in /api/story-questions:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate story questions',
    });
  }
});

// SAC-071: same shape as generateStoryFromClaude above, but for a
// user-entered topic + difficulty level instead of a fixed scenario, and
// deliberately never cached — an arbitrary, unbounded set of possible topics
// isn't a sensible fit for the fixed-scenario SQLite cache (SAC-073) or its
// warmup list.
async function generateCustomStoryFromClaude(topic, difficulty) {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    // SAC-077: was 3000 when "vocabulary" only asked for 8-12 selected
    // words. Now that it asks for every distinct word (matching
    // generateStoryFromClaude below, for full hover/click-to-define
    // coverage — see that fix's note), a 250-300 word story's vocabulary
    // list runs proportionally larger than a 100-150 word pre-built one's
    // 50-90 entries, so this needs at least as much headroom.
    max_tokens: 10000,
    messages: [
      {
        role: 'user',
        content: `You are writing a Spanish listening-comprehension story for a language learner, on the topic: "${topic}".

Difficulty level: ${difficulty}. ${DIFFICULTY_GUIDE[difficulty]}

Write the story in Spanish, 8-10 sentences totaling roughly 250-300 words, with a clear beginning, middle, and end.

Respond with ONLY a JSON object (no markdown fences, no extra text) in exactly this shape:

{
  "sentences": [
    { "spanish": "María va a un restaurante.", "english": "María goes to a restaurant." }
  ],
  "vocabulary": [
    { "word": "restaurante", "english": "restaurant" }
  ]
}

"sentences" must be the story broken into 8-10 individual sentences, each with its exact English translation — these drive sentence-by-sentence audio playback and hover-to-translate in the UI, so each pair must line up precisely. The "vocabulary" array must include an entry for EVERY distinct word that appears across all sentences — including small common words like "el", "la", "de", "es", "y", "un" — not just content words. Lowercase each "word" value and strip punctuation so it matches the word as it would be looked up (e.g. "gente." in the story becomes "gente" in vocabulary). Give the English meaning as used in that specific context.`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('/api/generate-custom-story: response hit max_tokens, JSON may be truncated');
  }

  const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const parsed = extractJson(rawText);

  const storyData = {
    sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
  };
  logApiCall('/api/generate-custom-story', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
  return storyData;
}

/**
 * POST /api/generate-custom-story
 * Generates a Spanish listening story for a user-entered topic + difficulty
 * (SAC-071). Never cached — see generateCustomStoryFromClaude above.
 */
app.post('/api/generate-custom-story', async (req, res) => {
  const { topic, difficulty } = req.body;

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }
  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }

  const trimmedTopic = topic.trim();
  // Every call here produces a brand-new story for this exact topic string —
  // any previously-cached /api/story-questions data for it (from an earlier
  // generation of the same topic text) no longer matches and would otherwise
  // be served stale, the same class of bug SAC-034 fixed for regenerating a
  // pre-built scenario.
  questionsCache.delete(questionsCacheKey(trimmedTopic, difficulty));

  console.log(`[generate-custom-story] Generating story for topic '${trimmedTopic}' (${difficulty})`);

  try {
    const storyData = await generateCustomStoryFromClaude(trimmedTopic, difficulty);
    res.json(storyData);
  } catch (error) {
    console.error('Error in /api/generate-custom-story:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate custom story',
    });
  }
});

async function generateSuggestedTopicsFromClaude() {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Generate 6 interesting and diverse listening-story topics for a beginner-to-intermediate Spanish learner.

Topics should be:
- Everyday scenarios people naturally talk/tell stories about
- Varied (not all food, not all travel)
- Understandable at an A1-A2 level
- 2-5 words each

Respond with ONLY a JSON object (no markdown fences, no extra text) in exactly this shape:

{ "topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5", "topic 6"] }`,
      },
    ],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const parsed = extractJson(rawText);
  logApiCall('/api/generate-suggested-topics', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
  return Array.isArray(parsed.topics) ? parsed.topics : [];
}

/**
 * POST /api/generate-suggested-topics
 * 6 fresh topic suggestions for the custom-topic form's "🔄" refresh (SAC-071).
 */
app.post('/api/generate-suggested-topics', async (req, res) => {
  try {
    console.log('[generate-suggested-topics] Generating fresh suggestions...');
    const topics = await generateSuggestedTopicsFromClaude();
    res.json({ topics });
  } catch (error) {
    console.error('Error in /api/generate-suggested-topics:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate suggested topics',
    });
  }
});

/**
 * POST /api/translate
 * Bidirectional Spanish <-> English translation for the Translation tool.
 */
app.post('/api/translate', async (req, res) => {
  const { text, sourceLanguage, targetLanguage } = req.body;

  if (!text || !sourceLanguage || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Translate the following ${sourceLanguage} text to ${targetLanguage}. Return ONLY the translation, nothing else.

Text: "${text}"`,
        },
      ],
    });

    const translatedText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    logApiCall('/api/translate', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json({ translated: translatedText });
  } catch (error) {
    console.error('[translate] Claude API error:', error);
    res.status(500).json({ error: error.message || 'Translation failed' });
  }
});

/**
 * GET /api/usage-stats
 * Returns aggregated Claude API usage/cost stats from the local SQLite log
 * for the About modal (SAC-063/064).
 */
app.get('/api/usage-stats', (req, res) => {
  try {
    res.json(getUsageStats());
  } catch (error) {
    console.error('Error in /api/usage-stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch usage stats' });
  }
});

// SAC-073: called once, after the server is already listening (see below).
// Sequential, not parallel — deliberately, to avoid firing 8 concurrent
// Claude calls against the same API key on every deploy, and because there's
// no user waiting on this specific timing (unlike a live request). A small
// delay between calls gives a little breathing room against rate limits.
// SAC-076: warms only the Beginner difficulty — a deliberate choice, not an
// oversight. Warming all 3 levels for all 8 scenarios would triple both
// startup time (~2.5min -> ~7.5min) and the real Claude API cost of every
// single deploy. Intermediate/Advanced generate on-demand on whichever
// scenario a user first requests them for (~20s that one time), then stay
// cached for the rest of that deployed instance's life — the same tradeoff
// the original pre-SAC-073 in-memory cache already had for every scenario.
async function warmupCache() {
  console.log(`[startup] Warming up story cache for ${WARMUP_SCENARIOS.length} scenarios (Beginner only)...`);
  for (const scenario of WARMUP_SCENARIOS) {
    if (getCachedStory(scenario, 'Beginner')) {
      console.log(`  [startup] already cached: ${scenario}`);
      cacheWarmupStatus.alreadyCached++;
      continue;
    }
    try {
      console.log(`  [startup] generating: ${scenario}...`);
      const storyData = await generateStoryFromClaude(scenario, 'Beginner');
      cacheStory(scenario, 'Beginner', storyData);
      cacheWarmupStatus.generated++;
      console.log(`  [startup] cached: ${scenario}`);
    } catch (err) {
      cacheWarmupStatus.failed++;
      console.error(`  [startup] failed to generate '${scenario}':`, err.message || err);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  cacheReady = true;
  console.log(
    `[startup] Cache warmup complete: ${cacheWarmupStatus.alreadyCached} already cached, ${cacheWarmupStatus.generated} generated, ${cacheWarmupStatus.failed} failed`
  );
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.2b', cacheReady, cacheWarmup: cacheWarmupStatus });
});

app.listen(PORT, () => {
  console.log(`Spanish Audio Chat backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set in .env');
  }
  // SAC-073: deliberately fired *after* listen(), not awaited before it. The
  // server is already accepting requests at this point — a scenario that
  // hasn't warmed up yet just falls through to a normal ~20s live generation
  // the first time it's requested, same as before this feature existed. This
  // project already hit one real incident from an unverified assumption about
  // startup behavior (node:sqlite needing Node 22.5+, which crash-looped the
  // whole backend on Railway's then-default Node 18 — see CLAUDE.md Decisions
  // Log) — blocking listen() on ~8 sequential Claude calls (state a 2-3 minute
  // startup, easily longer under real latency) would risk the same class of
  // problem again: a slow-to-bind process reads as a failed deploy, not a
  // "still warming up" one, on most PaaS platforms including this one.
  warmupCache().catch((err) => console.error('[startup] warmupCache failed:', err));
});
