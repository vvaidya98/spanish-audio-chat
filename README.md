# Conversation Amigo — v1.2h

A beginner-friendly Spanish conversation practice app with audio voice chat powered by Claude.

**Status:** Live in production  
**Tech Stack:** React 18 + Vite (frontend) | Node.js + Express (backend proxy)  
**Live app:** https://spanish-audio-chat.netlify.app  
**Backend:** https://spanish-audio-chat-production.up.railway.app  
**Current Version:** v1.2h

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- An Anthropic API key (`sk-ant-...`)

### Setup

```bash
git clone <repo-url>
cd spanish-audio-chat

# Install dependencies
npm install

# Create .env file (in the spanish-audio-chat folder, not parent)
# Add your API key:
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# PORT=3000
# NODE_ENV=development
```

### Run Locally

**Terminal 1 — Frontend (Vite)**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 — Backend (Express)**
```bash
npm run backend
# Runs on http://localhost:3000
```

Open http://localhost:5173 in your browser. The frontend will call the backend at `http://localhost:3000/api/*`.

### Test
- The footer nav (🏠 Home / 🎧 Listening / 💬 Conversation / 🌐 Translation / 📊 History) is fixed to the bottom of every screen. From Home, tap **🎧 Listening Mode**, then pick a scenario card directly (no confirm step), tap **🎲 Choose One for Me** for a random one (8 pre-built scenarios total), or tap **✨ Create Custom Topic** (3rd card) to enter any topic of your own — type it or pick from 6 suggested-topic pills (tap 🔄 for 6 new Claude-generated ones), choose a Beginner/Intermediate/Advanced difficulty, and Generate Story (~20s). A custom story plays through the exact same view as a pre-built one, with every feature below — Regenerate on a custom story generates a new story for the *same* topic (difficulty picker defaults to the current one but can be changed), not a return to the form. Regenerate on a *pre-built* scenario now also offers the same Beginner/Intermediate/Advanced picker, not just custom topics. **🗣️ Conversation Mode is currently disabled** ("coming soon" on its mode card) — the flow below still exists in the code and works if re-enabled, it's just not reachable in the live app right now.
- **Conversation Mode (disabled in the live app, code intact):** select a topic → "Start Conversation". Claude's opening plays as audio (text hidden). Tap "Tap to Speak", say something in Spanish, tap "Tap to Send". Replay at 1x/0.8x/0.6x, or tap "Display text" to reveal it. Continue for 5-8 exchanges, then "End Conversation" for the summary (transcript + corrections) — this also saves the session to history.
- **Listening Mode:** picking a scenario goes straight to loading (no confirm screen). While the story generates, a plain spinner with an honest "this usually takes 10 to 20 seconds" message plays, with real story vocabulary words cycling in once available — repeat visits to an already-generated scenario load near-instantly (cached in SQLite on the backend, automatically re-warmed within a few minutes of every deploy, so this holds even for the *first* real visit after a fresh deploy — see "Story caching" below). Comprehension Check data (MCQ + Vocabulary Matching) loads in the background after the story appears rather than blocking the spinner on it — Play works immediately, and the Check Comprehension toggle becomes available a bit later, well before the story finishes. The story's header shows a scenario emoji (matching the picker card, e.g. 🍽️ for a restaurant scenario, ✨ for a custom topic). The story then plays automatically, sentence by sentence, auto-pausing ~1.3s between sentences to absorb what you heard — text stays hidden unless you check "🇪🇸 Spanish text", "🇬🇧 English translation", and/or "💡 Grammar" (three independent checkboxes, all off by default, each state persisted across visits, revealing three color-coded blocks in that order the instant they're checked, each with its own emoji inside it too: a light-blue 🇪🇸 Spanish block with a 🔊 replay icon; a light-yellow 🇬🇧 English translation block; and a light-green 💡 Grammar block that appears immediately showing "Loading explanation…" and swaps to the real content — how that sentence's structure differs from English — once it's finished generating in the background, usually within 15 seconds — click-word definitions work on the Spanish side throughout). When Spanish text is shown and Clarity Mode is active, the Spanish block also shows a live row of colored dots/dashes — one per pause actually inserted so far in the current sentence (grey dot/yellow dot/orange dash/red double-dash for Low/Medium/High/Ultra, "y" always shown as a red dot since it's a much more frequent pause than the other connector words) — plus a small "⏱️ Xms" elapsed-time readout, resetting fresh each sentence. The Play button pulses gently 3 times on a story's first load to show you where to start, then stops on its own (or immediately if you click it first) — a fresh, never-played scenario pulses again, and so does every Regenerate. Controls: First (⏮) / Previous (◀) / Play-Pause (▶/⏸, large center button) / Next (▶) / Last (⏩), plus a progress bar with "Sentence X of Y", followed by a plain-text **Quick Translate** link (deliberately understated) that opens a translate overlay without leaving or pausing the story. One row below the controls has **Speed** (x1.0/x0.8/x0.6/x0.4, x0.6 is the default), **Clarity** (Off/Low/Medium/High/Ultra — inserts a pause after connector words like "y"/"pero"/"porque", longer at higher levels), and a 🔄 Regenerate icon (a confirmation modal guards against accidental taps, since it discards current progress, and lets you pick a new Beginner/Intermediate/Advanced difficulty for the regenerated story) — Speed and Clarity are changeable mid-playback. After the story finishes, two toggle buttons appear — "✓ Check Comprehension" (MCQ questions + one-at-a-time Vocabulary Matching) and "📖 Display Transcript" (numbered sentences with 🔊 play / 🌐 translate / ⓘ construction-explanation icons — the Transcript's own ⓘ is still click-to-reveal per sentence, unlike the direct-display Grammar block above) — both can be open at once. Navigating away (via the footer nav) saves the session to history.
- **Translation:** a standalone page (🌐 in the footer nav) for one-off bidirectional Spanish↔English translation, separate from the in-story Quick Translate overlay — has its own Back button that returns to wherever you were.
- **Settings / API usage:** tap the version badge (top of the app) to open a modal showing Claude API call counts, token usage, and estimated cost (today / last 7 days / all-time), logged locally by the backend.
- **History:** tap "📊 History" in the footer nav (from anywhere) to see all past sessions — filter by mode/scenario, click "View" on any card for the full transcript, MCQ/vocab results (Listening), or numbered exchange-by-exchange review with Previous/Next navigation and error highlights (Conversation). Sessions are stored in IndexedDB, local to your browser — check DevTools → Application → IndexedDB → `spanish-audio-chat` → `sessions` to see them directly.

---

## Project Structure

```
spanish-audio-chat/
├── CLAUDE.md              # Technical memory (read first)
├── PENDING.md             # Roadmap & backlog (SAC- prefix)
├── README.md              # This file
├── index.html             # Vite entry (at root, not in public/)
├── package.json           # Dependencies & scripts
├── server.js              # Express backend
├── vite.config.js         # Vite frontend config
├── tailwind.config.js     # Tailwind CSS config
├── postcss.config.js      # PostCSS config
├── Procfile               # Railway deployment
├── railway.json           # Railway build/start override (backend-only)
├── LICENSE                # MIT
├── .env                   # Local secrets (gitignored)
├── .env.example           # Template for .env
├── .gitignore             # Git ignore rules
├── data/                  # SQLite API usage log (gitignored, local dev-cost tracking)
├── src/
│   ├── main.jsx           # React entry
│   ├── App.jsx            # Root component
│   ├── index.css          # Tailwind imports + design tokens
│   ├── db.js              # IndexedDB session storage (local-only)
│   ├── api.js             # VITE_API_URL-aware fetch wrapper
│   ├── analytics.js       # logEvent() — console-only for now
│   ├── speechUtils.js     # Spanish voice selection + speech-start timing (shared by every speak() call site)
│   └── components/
│       ├── ModeSelector.jsx
│       ├── ScenarioSelector.jsx
│       ├── ConversationView.jsx
│       ├── SummaryPanel.jsx
│       ├── ListeningStoryView.jsx
│       ├── FooterNav.jsx      # Global sticky bottom nav (Home/Listening/Conversation/Translation/History)
│       ├── VocabularyMatching.jsx
│       ├── HistoryDashboard.jsx
│       ├── SessionReview.jsx
│       ├── HoverableText.jsx
│       ├── NavButton.jsx      # Shared prominent nav button (44px+, teal)
│       ├── LoadingSpinner.jsx # Circular progress + rotating word preview
│       ├── EmailCapture.jsx   # Optional post-session signup (needs VITE_FORMSPREE_URL)
│       ├── TranslationView.jsx      # Standalone bidirectional Spanish/English translator page
│       ├── QuickTranslateModal.jsx  # In-story translate overlay (doesn't leave the story)
│       ├── RegenerateModal.jsx      # Confirmation gate in front of "Regenerate Story"
│       ├── AboutModal.jsx           # Version badge → API usage/cost stats
│       ├── CustomTopicForm.jsx      # Modal: user topic + difficulty → generated story
│       └── ExplanationIcon.jsx      # ⓘ icon + panel: how a sentence's grammar differs from English
└── public/                # Static assets (if needed)
```

**Important:** `index.html` is at the project root, not in `public/`, to match Vite's default configuration.

---

## Environment Variables

**Local Development (`.env`)**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3000
NODE_ENV=development
```

**Never commit `.env` to git.** Use `.env.example` as a template.

---

## API Endpoints

### `POST /api/initiate`
Claude says the opening greeting in Spanish for a given scenario.

**Request:**
```json
{
  "scenario": "Introducing Yourself"
}
```

**Response:**
```json
{
  "spanish": "¡Hola! Me llamo Claude. ¿Cómo te llamas?"
}
```

### `POST /api/respond`
User input → Claude response + English feedback + structured error analysis.

**Request:**
```json
{
  "userInput": "Me llamo Vinay",
  "scenario": "Introducing Yourself"
}
```

**Response:**
```json
{
  "spanish": "¡Mucho gusto, Vinay! ¿De dónde eres?",
  "feedback": "Perfect! You introduced yourself clearly. 'Me llamo' is exactly right for 'My name is.'",
  "errors": [
    {
      "userSaid": "Yo llamo Vinay",
      "corrected": "Yo me llamo Vinay",
      "explanation": "The verb 'llamarse' is reflexive, so you need 'me' before 'llamo'."
    }
  ]
}
```
`errors` is `[]` when nothing worth flagging was found. This feeds the end-of-conversation Summary view.

### `POST /api/generate-story`
Generates a listening-comprehension story (100-150 words, 7-10 sentences of 10-15 words each) for a scenario at a given difficulty, using a varied/expanded vocabulary (not just the most obvious handful of words), plus a word-by-word vocabulary list for click-to-define. Cached in SQLite (`./data/api_usage.db`'s `story_cache` table), keyed on `(scenario, difficulty)` — a scenario can hold up to 3 independently-cached versions. Survives a same-container restart; does not survive an actual Railway redeploy (ephemeral filesystem — see "Story caching" in Features below), which a background startup routine compensates for by auto-re-warming the Beginner difficulty for all 8 scenarios shortly after every deploy.

**Request:**
```json
{
  "scenario": "Ordering at a Restaurant",
  "difficulty": "Beginner",
  "regenerate": false
}
```
`difficulty` is optional (defaults to `"Beginner"` for backward compatibility) — one of `"Beginner"`, `"Intermediate"`, `"Advanced"`. `regenerate` is also optional (defaults to falsy). Falsy → checks the cache for that exact `(scenario, difficulty)` pair first, returns instantly on a hit. `true` → always generates fresh (bypassing the cache entirely, even if that difficulty was already cached) and overwrites the cache entry.

**Response:**
```json
{
  "sentences": [
    { "spanish": "María va a un restaurante.", "english": "María goes to a restaurant." }
  ],
  "vocabulary": [
    { "word": "restaurante", "english": "restaurant" }
  ]
}
```
`sentences` drives both sentence-by-sentence audio playback and the transcript's per-sentence translate icon — each pair must be tightly aligned. `vocabulary` includes an entry for every distinct word across all sentences, including common function words, so every word can show a click-to-define tooltip.

### `POST /api/story-questions`
Generates 2-3 multiple-choice comprehension questions for a given story, with English translations for hover-to-translate, a vocabulary list for click-to-define, and 5-10 words for the Vocabulary Matching exercise.

**Request:**
```json
{
  "scenario": "Ordering at a Restaurant",
  "story_text": "María va a un restaurante. ...",
  "difficulty": "Beginner"
}
```
`difficulty` is optional (defaults to `"Beginner"`) — used both as part of the response cache key (so switching a scenario's difficulty can't serve questions written for a different difficulty's story) and to frame the story's difficulty accurately in the prompt sent to Claude.

**Response:**
```json
{
  "questions": [
    {
      "question_spanish": "¿Dónde se sienta María?",
      "question_english": "Where does María sit?",
      "options": [
        { "text": "Cerca de la ventana", "english": "Near the window", "correct": true },
        { "text": "Cerca de la puerta", "english": "Near the door", "correct": false }
      ],
      "explanation": "María busca una mesa cerca de la ventana y se sienta allí."
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
```
`vocabulary` here is separate from the story's own vocabulary — question words (e.g. "dónde", "quién") often don't appear in the story text, so they need their own definitions for click-to-define. `matchingWords` is words taken verbatim from the story text, 5-10 entries with a genuine easy/medium/hard difficulty mix, for the Vocabulary Matching exercise — each entry's example phrase/sentence use the word in a context *different* from the story, shown after a correct match.

### `POST /api/generate-sentence-explanations`
Generates one grammar-construction note per sentence (SAC-079) — how that sentence's structure differs from English. Called by the frontend in the background right after a story loads/regenerates; never blocks Play or delays story load. Uncached, unlike `story_cache`/`questionsCache` — a disclosed cost tradeoff (see PENDING.md SAC-080).

**Request:**
```json
{
  "sentences": ["María va a un restaurante.", "El camarero le trae el menú."],
  "difficulty": "Beginner"
}
```

**Response:**
```json
{
  "explanations": [
    {
      "sentenceIndex": 0,
      "phrase": "María va a un restaurante",
      "literalTranslation": "María goes to a restaurant",
      "englishSyntax": "María goes to a restaurant",
      "pattern": "This sentence follows the same subject-verb-object order as English."
    },
    {
      "sentenceIndex": 1,
      "phrase": "le trae el menú",
      "literalTranslation": "to-him brings the menu",
      "englishSyntax": "brings him the menu",
      "pattern": "Spanish puts the object pronoun (le) before the verb, not after it like English does."
    }
  ]
}
```
`sentenceIndex` is 0-indexed, matching the position of each sentence in the request's `sentences` array — the frontend looks up explanations by this field rather than trusting response array order, since a gap or reordering in Claude's response would otherwise silently misalign every sentence after it.

### `POST /api/generate-custom-story`
Generates a Spanish listening story for a user-entered topic + difficulty (SAC-071), same `{sentences, vocabulary}` shape as `/api/generate-story` and, as of SAC-076, the same shared difficulty wording (`DIFFICULTY_LEVELS`/`DIFFICULTY_GUIDE` in `server.js`) that pre-built scenarios use. Never cached — every call is a fresh generation.

**Request:**
```json
{
  "topic": "Ordering coffee at a small café",
  "difficulty": "Beginner"
}
```
`difficulty` must be one of `"Beginner"`, `"Intermediate"`, `"Advanced"`.

**Response:** same shape as `/api/generate-story`'s response (see above).

### `POST /api/generate-suggested-topics`
Returns 6 fresh topic suggestions for the custom-topic form's 🔄 refresh button.

**Response:**
```json
{ "topics": ["A day at the market", "My first day at work", "..."] }
```

### `POST /api/translate`
One-off bidirectional translation, used by both the standalone Translation page and the in-story Quick Translate modal.

**Request:**
```json
{
  "text": "¿Cómo estás?",
  "sourceLanguage": "Spanish",
  "targetLanguage": "English"
}
```

**Response:**
```json
{
  "translated": "How are you?"
}
```

### `GET /api/usage-stats`
Returns aggregated Claude API usage/cost stats (call counts, token totals, estimated cost — today / last 7 days / prior 7 days with a trend percent / all-time, broken down by feature/endpoint) for the Settings modal's version-badge popup. Backed by a local SQLite log (`./data/api_usage.db`, gitignored — every Claude API call across all 5 endpoints above is logged there) using Node's built-in `node:sqlite` (no external dependency). Cost is a rough estimate (`$0.003/1K tokens`, not real Anthropic pricing) meant for relative dev-cost visibility, not billing.

---

## Deployment

**Live now:** frontend at https://spanish-audio-chat.netlify.app, backend at https://spanish-audio-chat-production.up.railway.app. Deployed via CLI, **not yet connected to GitHub for auto-deploy-on-push** — a `git push` alone does not update the live app (see PENDING.md SAC-017).

### Frontend (Netlify)
```bash
VITE_API_URL="https://spanish-audio-chat-production.up.railway.app" npm run build
netlify deploy --prod --dir=dist
```
`VITE_API_URL` is also stored as a Netlify env var (`netlify env:set VITE_API_URL ...`) so it's available for a future GitHub-connected build.

### Backend (Railway)
```bash
railway up --detach --service spanish-audio-chat
```
Environment variables (`ANTHROPIC_API_KEY`, `NODE_ENV=production`, `FRONTEND_URL`) are set via `railway variables --set KEY=value`. `railway.json` overrides the build/start commands so Railway's Nixpacks builder runs only `npm run backend`, not the frontend's `npm run build` (which it would otherwise auto-detect and run unnecessarily).

**API base URL:** `src/api.js` exports `apiFetch()`, which prefixes requests with `import.meta.env.VITE_API_URL` (empty in dev, so requests stay relative and go through the Vite proxy; set to the Railway URL for the production build).

---

## Features (Live in Production)

✅ Mode selector — 🎧 Listening Mode is the only enabled mode right now; 🗣️ Conversation Mode shows "coming soon" (its code/flow below still exists and works, just not reachable from the live app)  
✅ Audio conversation with Claude *(Conversation Mode, currently disabled)*  
✅ Beginner Spanish, slow speech (0.8x) *(Conversation Mode, currently disabled)*  
✅ Multi-turn conversation (5-8 exchanges) with listening-first UX — Claude's text hidden until revealed *(Conversation Mode, currently disabled)*  
✅ Manual "Tap to Speak" / "Tap to Send" flow + 3-speed repeat (1x/0.8x/0.6x) *(Conversation Mode, currently disabled)*  
✅ End-of-conversation summary — full transcript, highlighted errors, corrections *(Conversation Mode, currently disabled)*  
✅ Listening Mode — scenario cards skip straight to loading (no confirm step); 7-10 sentence stories (10-15 words each, varied vocabulary); controls are First (⏮) / Previous (◀) / Play-Pause (▶/⏸) / Next (▶) / Last (⏩) with a "Sentence X of Y" progress bar; speed x1.0/x0.8/x0.6/x0.4 (x0.6 default); **Clarity Mode** (Off/Low/Medium/High/Ultra) adds a pause after connector words ("y"/"pero"/"porque"/"cuando"/"mientras"/"si"), duration scales with the level; explicit Spanish voice selection preferring Colombian/Latin American variants (es-CO → es-419 → es-MX → es-US → es-ES) before Spain Spanish, plus a tuned start-of-speech delay for crisper syllables; independent "Display Spanish"/"Display English" checkboxes (numbered to match the sentence, 🔊 replay icon + click-word definitions on the Spanish side) alongside a toggle-based Comprehension Check / Transcript (hidden until tapped); transcript has per-sentence 🔊 play / 🌐 translate icons + click-word definitions; global sticky footer nav (Home / Listening / Conversation / Translation / History) on every screen  
✅ Play button pulse — draws attention to Play on a story's first load with a gentle opacity/color breathing fade, pulsing a fixed 3 times (~3.6s) then stopping automatically, or stopping immediately if clicked first (persists across a page reload via `sessionStorage`, keyed per scenario); pulses again fresh for a never-played scenario, and also on every Regenerate regardless of prior play history  
✅ Regenerate Story — a confirmation modal guards the small 🔄 icon near the bottom (since regenerating discards current progress with no undo) and lets you pick a Beginner/Intermediate/Advanced difficulty for the new story, defaulting to the current one — works for both pre-built scenarios and custom topics alike; always generates fresh, bypassing the cache even for an already-cached difficulty  
✅ Vocabulary Matching — one word at a time (easiest first), word audio auto-plays as each word appears, green pill-style answer options, success/error tones, example phrase + sentence shown after a correct match, manual "Next →" (no auto-advance timer)  
✅ Grammar Breakdown Icons — a ⓘ next to each sentence (in the Spanish text block and the Transcript), shown only when the "Grammar" checkbox is on, opens a light-green panel with a short note on how that sentence's structure differs from English (phrase, literal translation, natural English syntax, a one-line pattern observation); generated by Claude in the background right after a story loads or regenerates, so the icon starts grayed/disabled and becomes clickable a few seconds later without ever delaying Play  
✅ Story caching — SQLite-backed (`./data/api_usage.db`), keyed on `(scenario, difficulty)` so each scenario can hold up to 3 independently-cached versions; a background startup routine automatically pre-generates the Beginner difficulty for all 8 scenarios within a few minutes of every deploy (Intermediate/Advanced generate on-demand the first time requested, then stay cached), so the first real visit after a fresh deploy loads from cache too, not a live ~20s generation (Railway's filesystem is ephemeral across actual redeploys, same as this project's other server-side caches — the win here is the automatic re-warm on every deploy, not the cache surviving between them)  
✅ Animated loading screen — plain spinner + realistic "usually takes 10 to 20 seconds" message, with real story vocabulary words cycling in one at a time (5 rotating entrance animations) once available, looping until the story is ready — no fake progress percentage  
✅ Fast first load — the story itself (and Play) is ready as soon as `/api/generate-story` resolves; Comprehension Check data fetches in the background afterward instead of blocking the spinner on it (roughly halves the old first-load wait)  
✅ Translation — a standalone bidirectional Spanish↔English page (own Back button) plus an in-story Quick Translate overlay that doesn't pause or leave the story, both backed by real (non-mocked) Claude translation calls  
✅ Settings / API usage tracking — tap the version badge to see Claude API call counts, token usage, and estimated cost (today / 7-day trend / all-time), logged locally to SQLite on the backend; also has a "Keep screen on during story playback" toggle (defaults on, persisted locally), the first user-facing preference in the app  
✅ Screen Wake Lock during playback — the screen stays on for as long as a story is actively playing in Listening Mode, so mobile screens don't auto-lock and suspend audio mid-story; re-acquires automatically if briefly interrupted by backgrounding the browser; no effect (and no errors) on unsupported browsers/devices  
✅ Mobile-optimized tap targets (44px+) and a compact combined scenario header  
✅ 8 pre-built scenarios (up from 4), each with its own emoji on the picker card and the story header (custom topics show ✨) + "Choose One for Me" random-pick-and-start button  
✅ Custom Listening Topics — enter any topic (or pick a suggested one, with a 🔄 refresh for 6 new Claude-generated suggestions), choose Beginner/Intermediate/Advanced difficulty, get a generated story in ~20s that plays with every Listening Mode feature; Regenerate makes a new story for the same topic at the same (or a newly-picked) difficulty, never cached  
✅ Session history — every completed session saved to IndexedDB (local-only), browsable via a History Dashboard (stats, filters, pagination) and per-session Review (Conversation: exchange-by-exchange with error highlights; Listening: transcript + MCQ/vocab results)  
✅ Card-based design system — centralized color/typography/spacing tokens (teal primary, coral secondary), consistent across every screen  
✅ Web Speech API (browser native)  
✅ Light background UI (per Vinay's preference)  
✅ Error recovery (back button to change API key or restart)  
✅ Deployed to production — Netlify (frontend) + Railway (backend), public GitHub repo with MIT license. **Not** auto-deploy-on-push yet — a `git push` alone does not update the live app; see Deployment above and PENDING.md SAC-017.  
✅ Basic analytics logging (console-only for now) + optional post-session email capture form (ships inactive — no Formspree endpoint configured yet)

---

## Known Issues & Workarounds

**Speech recognition not working:**
→ Use Chrome/Edge (most reliable); Firefox is less stable  
→ Make sure microphone permissions are granted in browser  
→ Refresh the page if speech input stops working mid-session

**TTS sounds robotic, too fast, or clips the first syllable:**
→ Default speed is 0.8x in Conversation Mode; Listening Mode defaults to x0.6 with x1.0/x0.8/x0.6/x0.4 controls, plus a 5-level Clarity Mode (Off/Low/Medium/High/Ultra) that adds a longer pause after connector words at higher levels. May vary by device/OS.  
→ Voice selection prefers Colombian/Latin American Spanish variants over Spain Spanish where available, but which voices actually exist depends entirely on the browser/OS's installed voice pack — a browser with no Spanish voices installed falls back to `lang=es-ES` only (check the console for a `[speechUtils] Using voice: ...` log to see what actually got picked).  
→ Voice selection and start-of-speech timing both live in `src/speechUtils.js` (`applySpanishVoice`, `SPEAK_START_DELAY_MS`) — shared by every component that calls `speechSynthesis.speak()`, rather than being set per-call-site.

**Conversation keeps failing:**
→ Check `.env` has valid `ANTHROPIC_API_KEY` (starts with `sk-ant-`)  
→ Make sure backend is running on `:3000`  
→ Open browser console (F12) to see fetch errors

**API key "not set in .env" warning:**
→ Verify `.env` file is in the `spanish-audio-chat` folder, not parent  
→ Make sure you've restarted the backend after creating/moving `.env`

---

## Next Steps

See PENDING.md for full roadmap. Next up:

- SAC-017: Connect Netlify + Railway to GitHub for auto-deploy-on-push (currently both are manual CLI deploys)
- Set a real `VITE_FORMSPREE_URL` to activate the email capture form
- Scoring system
- User progress tracking

---

## Learning Philosophy

This app is built for **Vinay's stated Spanish learning goals:**

1. **Understand native speakers** (comprehension first)
2. **Be comprehensible to native speakers** (broken Spanish OK, as long as meaning is clear)
3. **Improve grammar & pronunciation** (after first two are solid)

The app emphasizes **communication over perfection**. Claude will accept imperfect Spanish and respond encouragingly. Grammar corrections are suggestions, not roadblocks.

---

## Development

**Live in production as of v1.2h**, verified end-to-end against the real deployed URLs (not just localhost). Next phase: wire up GitHub-connected auto-deploy (SAC-017), then resume feature work.

---

**Built by Vinay Vaidya | v1.2h | Last updated: 2026-08-29**
