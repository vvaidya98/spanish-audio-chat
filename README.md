# Conversation Amigo — v1.0m

A beginner-friendly Spanish conversation practice app with audio voice chat powered by Claude.

**Status:** Live in production  
**Tech Stack:** React 18 + Vite (frontend) | Node.js + Express (backend proxy)  
**Live app:** https://spanish-audio-chat.netlify.app  
**Backend:** https://spanish-audio-chat-production.up.railway.app  
**Current Version:** v1.0m

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
- Choose a mode: **🎧 Listening Mode** (shown first) or **🗣️ Conversation Mode**, or pick **🎲 Choose One for Me** on the scenario picker to jump straight in with a random topic (8 scenarios total)
- **Conversation Mode:** select a topic → "Start Conversation". Claude's opening plays as audio (text hidden). Tap "Tap to Speak", say something in Spanish, tap "Tap to Send". Replay at 1x/0.8x/0.6x, or tap "Display text" to reveal it. Continue for 5-8 exchanges, then "End Conversation" for the summary (transcript + corrections) — this also saves the session to history.
- **Listening Mode:** select a topic → "Begin Story". A prominent nav bar at the top (← Back, 📋 Change Mode, 🔄 Back to Stories, 🔄 Regenerate Story once loaded) is always available, alongside a compact scenario header. While the story generates, a plain spinner with an honest "this usually takes 10-15 seconds" message plays (no fake progress bar) — repeat visits to the same scenario load near-instantly (cached on the backend), or tap "Regenerate Story" to force a brand-new one. The story (7-10 sentences, ~100-150 words) then plays automatically, sentence by sentence, auto-pausing ~1.3s between sentences to absorb what you heard (text hidden) — if a browser blocks autoplay, a "🔊 Tap to Play" button appears instead of silently doing nothing. Controls are icon-based: ⏮ restarts, ▶/⏸ plays or pauses (stops immediately, resumes from the same spot), ⏭ jumps to the last sentence; a progress bar shows "Sentence X of Y" with numbered jump markers below it to skip directly to any sentence; speed (Slow/Normal/Fast — 0.6x/0.5x/0.4x, Normal is the default, hover for the exact multiplier) changes smoothly mid-playback without skipping ahead. After it finishes, two toggle buttons appear — "📋 Check Comprehension" (2-3 MCQ questions, hidden until tapped) and "📖 Display Transcript" (numbered sentences with 🔊 play / 🌐 translate icons, also hidden until tapped) — both can be open at once. Below that, match story words to their English meanings one at a time (easiest first) in the Vocabulary Matching exercise: pick from 4-5 options, correct matches play a success tone and (when available) show an example phrase + sentence using the word in a new context before auto-advancing, wrong matches play a distinct tone and let you retry the same word. Clicking "← Back" saves the session to history.
- **History:** click "📊 History" in the top bar (from anywhere) to see all past sessions — filter by mode/scenario, click "View" on any card for the full transcript, MCQ/vocab results (Listening), or numbered exchange-by-exchange review with Previous/Next navigation and error highlights (Conversation). Sessions are stored in IndexedDB, local to your browser — check DevTools → Application → IndexedDB → `spanish-audio-chat` → `sessions` to see them directly.

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
├── src/
│   ├── main.jsx           # React entry
│   ├── App.jsx            # Root component
│   ├── index.css          # Tailwind imports + design tokens
│   ├── db.js              # IndexedDB session storage (local-only)
│   ├── api.js             # VITE_API_URL-aware fetch wrapper
│   ├── analytics.js       # logEvent() — console-only for now
│   └── components/
│       ├── ModeSelector.jsx
│       ├── ScenarioSelector.jsx
│       ├── ConversationView.jsx
│       ├── SummaryPanel.jsx
│       ├── ListeningStoryView.jsx
│       ├── ListeningHeader.jsx
│       ├── VocabularyMatching.jsx
│       ├── HistoryDashboard.jsx
│       ├── SessionReview.jsx
│       ├── HoverableText.jsx
│       ├── NavButton.jsx      # Shared prominent nav button (44px+, teal)
│       ├── LoadingSpinner.jsx # Circular progress + word carousel
│       └── EmailCapture.jsx  # Optional post-session signup (needs VITE_FORMSPREE_URL)
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
Generates a listening-comprehension story (100-150 words, 7-10 sentences of 10-15 words each) for a scenario, using a varied/expanded vocabulary (not just the most obvious handful of words), plus a word-by-word vocabulary list for click-to-define. Cached per-scenario on the backend (`.cache/stories.json`, local to the running server process — reset on every redeploy/restart, not a durable cache).

**Request:**
```json
{
  "scenario": "Ordering at a Restaurant",
  "regenerate": false
}
```
`regenerate` is optional (defaults to falsy). Falsy → checks the cache first, returns instantly on a hit. `true` → always generates fresh and overwrites the cache entry for that scenario.

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
  "story_text": "María va a un restaurante. ..."
}
```

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

✅ Mode selector — Listening Mode (shown first) or Conversation Mode  
✅ Audio conversation with Claude  
✅ Beginner Spanish, slow speech (0.8x)  
✅ Multi-turn conversation (5-8 exchanges) with listening-first UX — Claude's text hidden until revealed  
✅ Manual "Tap to Speak" / "Tap to Send" flow + 3-speed repeat (1x/0.8x/0.6x)  
✅ End-of-conversation summary — full transcript, highlighted errors, corrections  
✅ Listening Mode — 7-10 sentence stories (10-15 words each, varied vocabulary), icon-based playback controls (⏮ ▶/⏸ ⏭) with progress bar + numbered sentence-jump markers + Slow/Normal/Fast speed control (Normal default) + reliable immediate stop, toggle-based Comprehension Check / Transcript (hidden until tapped, not auto-shown), transcript with per-sentence 🔊 play / 🌐 translate icons + click-word definitions, prominent top-of-screen nav buttons (Back / Change Mode / Back to Stories / Regenerate Story)  
✅ Vocabulary Matching — one word at a time (easiest first), 4-5 options, success/error tones, example phrase + sentence shown after a correct match  
✅ Story caching — repeat visits to an already-generated scenario load near-instantly; "Regenerate Story" forces a fresh one  
✅ Honest loading indicator — plain spinner + realistic "usually takes N seconds" message during story/response generation, no fake progress percentage  
✅ Audio autoplay fallback — a "🔊 Tap to Play" button appears if a browser silently blocks autoplay, so playback is never silently stuck  
✅ Mobile-optimized tap targets (44px+) and a compact combined scenario header  
✅ 8 scenarios (up from 4) + "Choose One for Me" random-pick-and-start button  
✅ Session history — every completed session saved to IndexedDB (local-only), browsable via a History Dashboard (stats, filters, pagination) and per-session Review (Conversation: exchange-by-exchange with error highlights; Listening: transcript + MCQ/vocab results)  
✅ Flexible scenario picker with "Start Conversation"/"Begin Story" confirmation step  
✅ Card-based design system — centralized color/typography/spacing tokens (teal primary, coral secondary), consistent across every screen  
✅ Web Speech API (browser native)  
✅ Light background UI (per Vinay's preference)  
✅ Version badge (v1.0m)  
✅ Error recovery (back button to change API key or restart)  
✅ Deployed to production — Netlify (frontend) + Railway (backend), public GitHub repo with MIT license  
✅ Basic analytics logging (console-only for now) + optional post-session email capture form (ships inactive — no Formspree endpoint configured yet)

---

## Known Issues & Workarounds

**Speech recognition not working:**
→ Use Chrome/Edge (most reliable); Firefox is less stable  
→ Make sure microphone permissions are granted in browser  
→ Refresh the page if speech input stops working mid-session

**TTS sounds robotic or too fast:**
→ Speech rate is set to 0.8x (slightly slower). May vary by device/OS.  
→ To adjust, edit src/components/ConversationView.jsx line ~98: `utterance.rate = 0.8`

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
- SAC-030: Difficulty selector (A1 Beginner / A1.5-A2 Intermediate / B1+ Advanced)
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

**Live in production as of v1.0m**, verified end-to-end against the real deployed URLs (not just localhost). Next phase: wire up GitHub-connected auto-deploy (SAC-017), then resume feature work.

---

**Built by Vinay Vaidya | v1.0m | Last updated: 2026-08-25**
