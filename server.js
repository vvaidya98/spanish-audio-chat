import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { Anthropic } from '@anthropic-ai/sdk';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

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

// In-memory cache, local to this running process. Replaces the v1.0m
// filesystem cache (.cache/stories.json), which was unreliable on Railway's
// ephemeral filesystem with no visible errors when writes silently failed.
// Lost on restart/redeploy — acceptable, since only the *first* load after a
// restart needs to pay the generation cost again; every repeat load within
// that server instance's lifetime is instant.
const storyCache = new Map();

function getCachedStory(scenario) {
  return storyCache.get(scenario) || null;
}

function cacheStory(scenario, storyData) {
  storyCache.set(scenario, storyData);
  console.log(`[cache] Stored: ${scenario}`);
}

function clearCache() {
  storyCache.clear();
  console.log('[cache] Cleared all stories');
}

// Separate cache for /api/story-questions (MCQ + vocabulary-matching data),
// keyed by scenario the same way as storyCache. Deliberately not tied to
// story content/regenerate: on "Regenerate Story," the cached questions from
// the old story are served alongside the new one rather than regenerated —
// see SAC-033's regenerate note in PENDING.md for why that tradeoff was kept.
const questionsCache = new Map();

function getCachedQuestions(scenario) {
  return questionsCache.get(scenario) || null;
}

function cacheQuestions(scenario, data) {
  questionsCache.set(scenario, data);
  console.log(`[cache] Stored questions for: ${scenario}`);
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

/**
 * POST /api/generate-story
 * Generates a short listening-comprehension story for a scenario, reusing
 * that scenario's vocabulary, plus a word-by-word vocabulary list for tooltips.
 */
app.post('/api/generate-story', async (req, res) => {
  const { scenario, regenerate } = req.body;

  if (!scenario) {
    return res.status(400).json({ error: 'Missing scenario' });
  }

  if (!regenerate) {
    const cached = getCachedStory(scenario);
    if (cached) {
      console.log(`[generate-story] Using cached story for '${scenario}'`);
      return res.json(cached);
    }
  } else {
    // The old story's questions/vocab-matching data no longer matches what's
    // about to be generated — drop it so the next /api/story-questions call
    // regenerates fresh instead of serving a stale, mismatched cache hit.
    questionsCache.delete(scenario);
    console.log(`[cache] Cleared questions for regenerate: ${scenario}`);
  }
  console.log(`[generate-story] ${regenerate ? 'Regenerating' : 'Generating'} story for '${scenario}'`);

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 7000,
      messages: [
        {
          role: 'user',
          content: `You are writing a Spanish listening-comprehension story for a beginner learner, for the scenario: "${scenario}".

Write a story in Spanish, 100-150 words total across 7-10 sentences (natural pacing, with pauses between sentences for a beginner to absorb each one). This is important: EACH sentence must be 10-15 words long — short and punchy, but a complete thought, not a fragment. For example: "Ana entra en el restaurante y busca una mesa vacía cerca de la ventana." (13 words) or "El camarero le trae el menú y le pregunta qué desea comer." (12 words). Keep the grammar simple (present tense, no subjunctive) and give the story a coherent narrative arc — a clear beginning, middle, and end.

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
    cacheStory(scenario, storyData);
    logApiCall('/api/generate-story', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json(storyData);
  } catch (error) {
    console.error('Error in /api/generate-story:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate story',
    });
  }
});

/**
 * POST /api/story-questions
 * Generates 2-3 multiple-choice comprehension questions for a given story.
 */
app.post('/api/story-questions', async (req, res) => {
  const { scenario, story_text } = req.body;

  if (!scenario || !story_text) {
    return res.status(400).json({ error: 'Missing scenario or story_text' });
  }

  const cachedQuestions = getCachedQuestions(scenario);
  if (cachedQuestions) {
    console.log(`[story-questions] Using cached questions for '${scenario}'`);
    return res.json(cachedQuestions);
  }
  console.log(`[story-questions] Generating questions for '${scenario}'`);

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4500,
      messages: [
        {
          role: 'user',
          content: `Here is a beginner-level Spanish story for the scenario "${scenario}":

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
    cacheQuestions(scenario, questionsData);
    logApiCall('/api/story-questions', 'claude-opus-4-8', message.usage.input_tokens, message.usage.output_tokens);
    res.json(questionsData);
  } catch (error) {
    console.error('Error in /api/story-questions:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate story questions',
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

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0x' });
});

app.listen(PORT, () => {
  console.log(`Spanish Audio Chat backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set in .env');
  }
});
