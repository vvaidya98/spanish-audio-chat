# CLAUDE.md — Spanish Audio Chat

*This file is read automatically by Claude Code at the start of every session. It contains everything needed to work on this project without re-explanation. Do not modify it during a session unless explicitly instructed.*

---

## Project Overview

Spanish Audio Chat is a beginner-friendly conversational Spanish practice app with audio voice chat powered by Claude. Users pick a conversation scenario, Claude initiates in Spanish, the user speaks via Web Speech API, Claude responds in Spanish, and provides feedback (corrections + encouragement) in English. The app emphasizes **comprehension + comprehensibility over grammar perfection** — it's designed to help users understand native Spanish speakers and be understood by them, with grammar polish coming later as confidence builds.

**Live URL:** https://spanish-audio-chat.netlify.app  
**Backend URL:** https://spanish-audio-chat-production.up.railway.app  
**GitHub:** https://github.com/vvaidya98/spanish-audio-chat (public)  
**Current Version:** v1.0k  
**Stack:** React 18 + Vite (frontend, Netlify) | Node.js + Express (backend proxy, Railway)

---

## Repository / Project Structure

```
spanish-audio-chat/
├── CLAUDE.md              ← this file
├── PENDING.md             ← open decisions + backlog (SAC- prefix)
├── README.md
├── .env                   ← local secrets (gitignored)
├── .env.example           ← template with key names, no values
├── .gitignore             ← must exclude .env, node_modules/, dist/
├── index.html             ← Vite entry point (at root, not in public/)
├── package.json
├── server.js              ← Express backend
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── Procfile               ← Railway deployment
├── railway.json           ← Railway build/start override (backend-only, skips frontend build)
├── LICENSE                ← MIT
├── public/                ← static assets (if needed)
└── src/
    ├── main.jsx           ← React entry
    ├── App.jsx            ← root component
    ├── index.css          ← Tailwind imports
    ├── db.js              ← IndexedDB session storage (local-only, no backend)
    ├── api.js             ← fetch wrapper, VITE_API_URL-aware (dev proxy vs. prod Railway URL)
    ├── analytics.js       ← logEvent(), console-only for now
    └── components/
        ├── ModeSelector.jsx
        ├── ScenarioSelector.jsx
        ├── ConversationView.jsx
        ├── SummaryPanel.jsx
        ├── ListeningStoryView.jsx
        ├── ListeningHeader.jsx
        ├── VocabularyMatching.jsx
        ├── HistoryDashboard.jsx
        ├── SessionReview.jsx
        ├── HoverableText.jsx
        └── EmailCapture.jsx  ← optional post-session signup, no-ops without VITE_FORMSPREE_URL
```

**Non-standard note:** `index.html` lives at the root, not in `public/`, to work with Vite's default configuration.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Dev server on localhost:5173 |
| Frontend hosting | Netlify (live, added v1.0k) | https://spanish-audio-chat.netlify.app — deployed via `netlify deploy --prod`, **not yet GitHub-connected** (manual deploy for now, see SAC-017) |
| Backend | Node.js + Express | Proxy pattern: all API calls via /api/* |
| Backend hosting | Railway (live, added v1.0k) | https://spanish-audio-chat-production.up.railway.app — deployed via `railway up`, **not yet GitHub-connected** (manual deploy for now, see SAC-017); `railway.json` overrides the build so Nixpacks doesn't also try to build the frontend |
| Database | IndexedDB (added v1.0j) | Local-only, per-browser session history (`src/db.js`); no backend involved, no shared/multi-user data |
| Styling | Tailwind CSS | Light backgrounds per Vinay's preference |
| AI | Anthropic Claude API — claude-opus-4-8 | Current stable model (Jan 2025). **Always verify model string before assuming bugs are elsewhere.** Stale model strings have caused silent failures in the past. |
| Version control | GitHub (public, added v1.0k) | https://github.com/vvaidya98/spanish-audio-chat — push to `main` does **not** yet auto-deploy (Netlify/Railway are CLI-deployed, not GitHub-linked; see SAC-017) |
| Analytics | Console logging only (added v1.0k) | `src/analytics.js` `logEvent()` — no external provider set up yet |
| Email capture | Formspree (added v1.0k, inactive) | `EmailCapture.jsx` posts to `VITE_FORMSPREE_URL`; renders nothing if unset — no form created yet |

---

## Environment Variables

Never hardcode. Store in `.env` locally (gitignored) and in hosting platform's environment variable settings.

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://your-netlify-domain.netlify.app  (production only, set on Railway)
VITE_API_URL=https://your-railway-domain.up.railway.app  (frontend-only, Netlify build var; unset in dev)
VITE_FORMSPREE_URL=https://formspree.io/f/your-form-id  (frontend-only, optional — email capture is a no-op without it)
```

**Production values (v1.0k):** Railway has `ANTHROPIC_API_KEY`, `NODE_ENV=production`, `FRONTEND_URL=https://spanish-audio-chat.netlify.app`. Netlify has `VITE_API_URL=https://spanish-audio-chat-production.up.railway.app` (`VITE_FORMSPREE_URL` intentionally not set yet). **Caution for future sessions:** the local `.env` file has leading whitespace before some keys (confirmed on `ANTHROPIC_API_KEY=`) — a naive `grep '^KEY='` extraction will silently match nothing. Strip leading whitespace when scripting against this file.

---

## Key Architecture Decisions

- **Backend proxy pattern (required for CORS):** Initial HTML artifact hit browser CORS errors when calling Anthropic API directly. Solution: all API calls go through backend /api/* endpoints. Backend calls Anthropic API server-to-server (always allowed). API key stays in `.env` on backend, never exposed to browser.
- **Web Speech API (browser native):** No external speech libraries. Uses browser's built-in speech recognition (language: es-ES) and text-to-speech (rate: 0.8x for slower, learner-friendly pacing).
- **Feedback after every turn (not mid-conversation):** Claude provides Spanish response + English feedback after user finishes speaking. No interrupting mid-response.
- **Scenario flexibility:** Claude generates scenarios on-the-fly based on user selection, not a fixed list. Allows personalization in Phase 2+.
- **Language mix:** Claude always speaks Spanish (with slow rate). Feedback always in English (doesn't slow down learning). This aligns with Vinay's learning philosophy: understand natives + be understood, grammar polish later.
- **Listening-first, multi-turn conversation (added v1.0c):** Claude's Spanish text is hidden by default after every turn — the user must actively tap "Display text" to reveal it, or replay the audio at 1x/0.8x/0.6x speed. This forces listening comprehension before reading. Conversations run 5-8 exchanges (soft floor at 5 shows "End Conversation" alongside "Tap to Speak"; hard cap at 8 removes "Tap to Speak" and forces the end). Manual "Tap to Speak" / "Tap to Send" replaces the old auto-send-on-recognition-end flow, giving the user control over when their transcript is sent.
- **`/api/respond` returns structured error analysis (added v1.0c):** Backend prompts Claude to return a JSON object (`{ spanish, feedback, errors: [{ userSaid, corrected, explanation }] }`) instead of a `###`-delimited two-part string. `server.js` extracts the first `{...}` block via regex and `JSON.parse`s it, falling back to raw text if parsing fails. This feeds the end-of-conversation Summary view (`SummaryPanel.jsx`), which highlights each flagged error with its correction and explanation.
- **Two practice modes (added v1.0d):** `App.jsx` now gates on a `mode` state (`'conversation' | 'listening'`) before showing `ScenarioSelector`, which is reused unchanged for both modes (same 4 scenarios). Listening Mode routes to `ListeningStoryView.jsx` instead of `ConversationView.jsx`.
- **Story generation reuses conversation vocabulary (added v1.0d):** `/api/generate-story` asks Claude for a 150-200 word story (simple present tense, no subjunctive) that reuses vocabulary appropriate to the scenario, plus a full word-by-word `vocabulary` array (every distinct word, including function words like "el"/"la"/"de") for the tooltip feature. Needed `max_tokens: 4000` — the full-story vocabulary list for a ~150 word story runs to 50-90 entries and hit `stop_reason: 'max_tokens'` truncation (breaking `JSON.parse`) at the initial 1500 budget. `/api/story-questions` then generates 2-3 MCQ comprehension questions from the generated story text. Both reuse the same `extractJson()` regex+parse helper as `/api/respond`.
- **Word tooltips via plain-text tokenization (added v1.0d, component replaced in v1.0e):** Word tokenization (`text.split(/([^A-Za-zÀ-ÿ]+)/)`, capturing group keeps whitespace/punctuation as separate tokens) and lowercase vocab-map lookup. Words not found in the map render as plain text (no tooltip) rather than erroring — a defensive fallback in case the model misses a word. `WordTooltip.jsx` (v1.0d, word-only hover) was deleted and replaced by `HoverableText.jsx` (v1.0e) — see below.
- **Sentence-level hover + click-word tooltips via `HoverableText.jsx` (added v1.0e, SAC-014-A/C):** Single reusable component: hovering anywhere in the block highlights the whole unit (amber bg) and shows its `translation` prop below; clicking an individual word (independent of hover) shows a small tooltip with just that word's definition via `stopPropagation()` so it doesn't also toggle hover/parent click handlers. Reused for story transcript sentences, MCQ question text, and MCQ answer options — same component, different `text`/`translation`/`vocabulary` props each time. Root element is a `<div>` (not `<span>`) since every usage is block-level content; an early version wrapped it in a `<p>` for the MCQ question line, which is invalid HTML (`<div>` can't nest inside `<p>`) and triggered a React DOM-nesting warning — fixed by using a `<div>` wrapper instead.
- **Sentence-driven audio playback engine (added v1.0e, SAC-014-B):** `/api/generate-story` now returns a `sentences: [{ spanish, english }]` array instead of flat `story_spanish`/`story_english` strings — this is what actually drives playback: `ListeningStoryView.jsx` speaks one sentence's utterance at a time, waits `SENTENCE_GAP_MS` (2500ms) after each `onend`, then speaks the next. Playback state (`playStatus`: `idle | playing | gap | paused | finished`) plus `indexRef`/`rateRef`/`pausedRef`/`pauseContextRef` refs avoid stale-closure bugs in the async `onend`/`setTimeout` callbacks. Stop/Resume uses the native `speechSynthesis.pause()`/`.resume()` (works well in Chrome; per the existing cross-browser Web Speech caveat below, may be less reliable elsewhere) when pausing mid-utterance, but pausing during the inter-sentence gap just clears the pending `setTimeout` — Resume in that case jumps straight to the next sentence rather than replaying the finished one. Speed change mid-playback (1x/0.8x/0.6x) updates `rateRef` for future utterances and, if currently speaking, cancels and re-speaks only the *current* sentence at the new rate — Web Speech API has no way to change an in-flight utterance's rate or resume it at a new rate, so this is a deliberate, documented compromise: it does **not** restart the whole story from sentence 1 (satisfies the requirement), but it does restart the *current* sentence.
- **`/api/story-questions` now also returns per-question/option English translations + a `vocabulary` array (added v1.0e):** `question_english` and each option's `english` field feed the same `HoverableText` sentence-translation behavior. The separate `vocabulary` array (word → English) is deliberately independent from the story's own vocabulary — question words like "dónde"/"quién" often don't appear in the story text itself, so click-word definitions in MCQ context need their own source. `ListeningStoryView.jsx` merges `{ ...storyVocabMap, ...questionsVocabMap }` when rendering MCQ text so both sources are available.
- **StrictMode-safe mount effect (fixed v1.0f):** `main.jsx` wraps the app in `<React.StrictMode>`, which double-invokes effects in dev (mount → cleanup → mount) to help surface exactly this class of bug. `ListeningStoryView.jsx`'s mount effect called `loadStory()` unguarded, so both invocations ran their own fetch chain and, ~300ms after each resolved, called `speakSentenceAt(0)` — two independent playback sequences racing, canceling and restarting each other, heard as word repetition/stutter at story start. Fixed with the standard React pattern: a per-invocation `let stale = false` closure variable (set `true` in the effect's cleanup) checked via an `isStale()` callback before every `setState` call and before the `speakSentenceAt(0)` call inside `loadStory()` — the first (stale) invocation's late-arriving results are silently dropped once its cleanup has run, only the surviving invocation takes effect.
- **Hover shows translation-only badge, no Spanish highlight (changed v1.0f):** `HoverableText.jsx`'s hover behavior changed from "highlight the whole Spanish unit + show translation below" (v1.0e) to "leave the Spanish text visually unchanged, show the English translation as a small pill/badge below" (`bg-blue-100` rounded-full badge) — a deliberate legibility fix so the Spanish text is never visually altered by hovering. Click-word-for-definition is unaffected.
- **Story length increased to 7-10 sentences / 300-400 words (changed v1.0f):** `/api/generate-story`'s prompt now explicitly targets 30-45 words per sentence with descriptive detail and clause-joining words ("y"/"pero"/"porque"/"cuando") rather than short one-action sentences — the first attempt at just raising the sentence-count target (without this per-sentence word-count guidance) produced 10 short sentences totaling only ~70 words, since "simple, beginner-friendly" sentences naturally default to short. `max_tokens` bumped 4500 → 7000 for the larger vocabulary array a longer story requires. Tested output: 278 words / 10 sentences with a real narrative arc (beginning/middle/end), reasonably close to target.
- **Sentence length reduced back to 15-25 words (changed v1.0g):** v1.0f's 30-45 word sentences turned out to be too much to digest in one auto-paused chunk in real use. Same lesson as v1.0f applied in reverse: a first prompt revision just lowering the target words-per-sentence undershot badly (~10 words/sentence, 99 words total) — the model defaults toward short sentences unless explicitly, forcefully told otherwise. Needed a second revision with a concrete before/after example embedded in the prompt itself ("'Carlos entra en un restaurante bonito y busca una mesa.' (10 words) is too short; expand it... (19 words)") before it reliably landed in the 15-25 word range (tested: 18-20 words/sentence, 169 words total).
- **Smooth mid-play speed change via `onboundary` tracking (changed v1.0g, replaces the v1.0e/f documented restart-current-sentence compromise):** Users found the old "cancel + re-speak the whole current sentence at the new rate" approach audible as a stutter/repeat. Fix: `speakSentenceAt` and `handleSpeedChange` both attach `utterance.onboundary`, which fires per-word during speech (in browsers/voices that support it — not universal, see Web Speech API caveat below) and records the char index of the most recently completed word into `lastWordCharIndexRef`. On a mid-play speed change, `ListeningStoryView.jsx` slices the sentence's text from `speakOffsetRef.current + lastWordCharIndexRef.current` onward and speaks only that remainder at the new rate — genuinely resuming, not restarting. `speakOffsetRef` accumulates across repeated speed changes within the same sentence so a second change resumes from the first change's resume point, not from the sentence start. Verified in testing: a speed change after ~4 of 20 words produced a 16-word follow-up utterance (not 20). Honest limitation: if a browser/voice never fires `onboundary`, `lastWordCharIndexRef` stays 0 and the change falls back to replaying the whole sentence — graceful degradation to the old v1.0e/f behavior, not a crash.
- **Transcript redesigned around explicit per-sentence icons, not hover (changed v1.0g):** The transcript's hover-to-translate behavior (v1.0f) is replaced there by numbered sentences with two icon buttons each: 🔊 plays just that sentence (`playTranscriptSentence`, fully independent of the main sequential playback engine — tracks its own `transcriptPlayingIdx`, cancels whatever else is speaking first so only one audio source is ever active) and 🌐 toggles that sentence's English translation via `openTranslationIdx` (a single nullable value, so opening one always closes any other). `HoverableText` gained a `showHoverTranslation` prop (default `true`, so MCQ question/option rendering is unaffected) — set `false` for the transcript's Spanish text so only its click-word-for-definition behavior remains active; hover no longer does anything there. The old always-visible full-story English paragraph block was dropped as redundant now that per-sentence translation is available on demand.
- **Main controls redesigned as icons + progress bar (changed v1.0g):** Start/Stop-Resume/Restart text buttons replaced with ⏮ (restart) / ▶‑⏸ (combined play-pause toggle, same underlying logic as the old Start+Stop/Resume, just consolidated into one icon) / ⏭ (new: jump straight to the last sentence via `handleJumpToEnd`). A progress bar plus "Sentence X of Y" label was added, computed as `(currentIndex / totalSentences) * 100`, reaching 100% only in the `finished` state — deliberately coarse (per-sentence, not audio-time-based) since Web Speech API exposes no utterance duration/progress to drive a smoother fill.
- **Token-guarded speaking engine, replacing native pause() (fixed v1.0h):** Two related real bugs found in the v1.0g playback engine. (1) `speechSynthesis.pause()` is known to sometimes let the current utterance finish before actually pausing in real browsers — replaced with `cancel()` (synchronous, immediate) everywhere the old code called `.pause()`, combined with the same `onboundary`-tracked resume logic used for speed changes so "Resume" still continues roughly where it left off rather than restarting. (2) `cancel()`ing an in-progress utterance doesn't reliably suppress its `onend`/`onerror` in every browser — some fire them anyway. The v1.0g `handleSpeedChange` canceled the *old* utterance (whose `onend` closure still captured the old `idx` and called `handleSentenceUtteranceEnd(idx)`) right before speaking a *new* one; if the old utterance's `onend` fired anyway, it scheduled a stray duplicate "advance to next sentence" `setTimeout` alongside the legitimate one — audible as skipped/repeated sentences, especially with rapid speed changes. Fixed with a token-guard: every utterance is tagged with `++utteranceTokenRef.current` at creation, and its `onboundary`/`onend`/`onerror` handlers check their captured token against the ref before doing anything, so a stale utterance's late-firing event becomes a no-op once something newer has superseded it. Verified specifically against a mock that deliberately reproduces the buggy cancel-still-fires-onend behavior (not reproducible with a "well-behaved" mock) — confirmed the fix holds even then. `speakSentenceAt`, `resumeSentenceFromBoundary` (new, factors out the shared "speak the sentence's remaining text" logic used by both speed-change and pause-resume), and `playTranscriptSentence` all share the one `utteranceTokenRef`, since only one audio channel (`synthRef.current`) exists regardless of which of them is currently speaking.
- **Navigation moved to `ListeningHeader.jsx` at the top of the view (added v1.0h):** New small header component with ← Back, 📋 Change Mode, and 🔄 Diff Scenario buttons, rendered above both the loading state and the loaded story (previously navigation was a single "← Back to Scenarios" button at the bottom, now removed). "Diff Scenario" is new: `DEFAULT_SCENARIOS` was changed from a private constant to a named export in `ScenarioSelector.jsx` so `App.jsx` can pick a random *different* scenario and call `setScenario()` directly, skipping the picker screen. `App.jsx` renders `<ListeningStoryView key={scenario} .../>` — the `key` change forces a full unmount/remount on scenario change, which is what actually resets all of `ListeningStoryView`'s internal state and refs (playback position, transcript toggles, answered questions, the token/pause refs, etc.) rather than needing to manually reset each one.
- **Story vocabulary broadened, sentences shortened again (changed v1.0h):** `/api/generate-story`'s prompt now explicitly asks for vocabulary beyond the obvious handful of words for a scenario (e.g., for "Ordering at a Restaurant": not just pollo/arroz/agua every time, but pescado/verduras/ensalada/vino/café and varied verbs like probar/recomendar/disfrutar) — this reverses the original v1.0d design intent ("Reuse vocab: Stories use same words as Conversation Mode scenarios, reinforces learning"), pivoting from reinforcement to breadth based on real usage feedback; worth knowing if a future prompt asks to reconsider this again. Sentence length reduced from 15-25 words (v1.0g) to 10-15 words (~100-150 total, down from ~200-250) — unlike the two prior length changes (v1.0f, v1.0g), this one hit the target range on the very first prompt attempt (11-13 words/sentence, 102 words total), likely because the prompt included a calibrated example sentence from the start instead of only a numeric target.
- **Design token system: CSS variables wired into Tailwind theme (added v1.0i):** `src/index.css`'s `:root` defines the actual color/radius values as CSS custom properties (`--color-primary`, `--color-surface`, `--color-text`, etc. — teal primary, coral secondary, plus semantic success/danger/warn), and `tailwind.config.js`'s `theme.extend` maps Tailwind color/radius/fontSize names onto `var(--color-*)` (e.g. `colors.primary.DEFAULT = 'var(--color-primary)'`). This gives genuine single-source-of-truth CSS variables (satisfies "no hardcoded colors") while keeping normal Tailwind utility ergonomics (`bg-primary`, `text-ink-muted`, `rounded-card`) everywhere in JSX — no component reaches for a raw hex or a bespoke Tailwind palette color anymore. Typography scale added as named `fontSize` keys (`text-heading-1`=28px/700, `text-heading-2`=18px/700, `text-body`=16px, `text-small`=14px) rather than reusing Tailwind's default `text-2xl`-style scale, so the four sizes read as an intentional hierarchy in the markup. Dark mode was scoped out — CLAUDE.md's existing design philosophy already commits to light backgrounds as a firm preference (not "if applicable"), and no dark-mode infrastructure existed to extend.
- **`VocabularyMatching.jsx`: click-to-pair game (added v1.0i):** New component, rendered in `ListeningStoryView.jsx` right after the Comprehension Check section once `playStatus === 'finished'`. Takes a `words` prop (`{word, english, difficulty}[]`, 5-10 entries from `/api/story-questions`'s new `matchingWords` field) and locally shuffles+letters (a-j) the English side once via a lazy `useState` initializer (so re-renders don't reshuffle). Two independent `selectedWordIdx`/`selectedOptionIdx` pieces of state let the user start a pairing from either column; once both are set, `attemptMatch` checks correctness, adds the word index to a `matched` Set on success, and shows a transient (1.2s auto-clearing) green/red feedback banner either way. Matched entries get a persistent checkmark and become disabled/non-interactive. A completion banner appears once `matched.size === words.length`.
- **`/api/story-questions` gained `matchingWords` (added v1.0i):** Same call as the existing MCQ generation (no extra round-trip) — the prompt now also asks for 5-10 words *verbatim from the story text* with an explicit easy/medium/hard mix, returned as a third array alongside `questions` and `vocabulary`. `max_tokens` bumped 2500 → 3000 for the added content.
- **Local session history via IndexedDB (added v1.0j, SAC-013):** New `src/db.js` — minimal wrapper (`openDB`/`saveSession`/`getAllSessions`/`generateSessionId`) around a single `sessions` object store (keyPath `id`), with indexes on `mode`, `scenario`, and `timestamp` for the History Dashboard's filtering. This is genuinely local-only — nothing here touches `server.js` or the Anthropic API; session data never leaves the browser. `ConversationView.jsx` saves on "End Conversation" (exchanges, error count, computed duration via a `sessionStartRef` set at mount); `ListeningStoryView.jsx` saves on the header's "← Back" click (`handleBackWithSave`, only fires if `story` has actually loaded — nothing to save otherwise) — captures story, questions, user's MCQ answers, and vocabulary-match progress at that moment. Both wrap the save call in a `.catch(console.error)` rather than blocking navigation if IndexedDB is unavailable (e.g. very old browsers, some privacy-mode configurations) — a failed save degrades to "no history for this session," not a broken app. **Known gap:** a session is only saved on the explicit "leave" action (End Conversation / Back) — closing the tab or navigating away mid-session mid-story loses that session's data; no `beforeunload` handler exists to catch that case.
- **`VocabularyMatching.jsx` gained `onProgressChange` (added v1.0j):** Fired with `(matchedCount, total)` whenever a correct match is made, letting `ListeningStoryView.jsx` track match progress for saving *without* lifting the `matched` Set itself out of the child — the component stays self-contained for its own interaction logic, just reports upward. Session storage keeps a `matchedCount` and the full `matchingWords` list, not which specific words were matched — `SessionReview.jsx`'s Listening view shows "matched N of M" plus the full word list, not per-word matched/unmatched status. A deliberate scope-trim, not an oversight — flagged here in case a future round wants per-word review detail.
- **`HistoryDashboard.jsx` / `SessionReview.jsx` (added v1.0j, SAC-015):** Dashboard loads all sessions once via `getAllSessions()`, sorts newest-first client-side, and derives stats/filters/pagination (10 per page) from that in-memory array — no re-querying IndexedDB per filter change, since the whole session set is expected to stay small (personal-use app, not a shared multi-tenant system). Mode and scenario filters are independent `useState` values combined in a single `useMemo`. `SessionReview.jsx` branches entirely on `session.mode`: `ConversationReview` owns its own `exchangeIdx` state for Previous/Next navigation (mirrors `SummaryPanel.jsx`'s error-highlight styling); `ListeningReview` is stateless, just renders the three static sections (transcript, MCQ results, vocab summary) directly from the saved session object.
- **Scenario picker: "Choose One for Me" + 8 scenarios (changed v1.0j, SAC-015):** The old "Different Scenarios" button was dead weight — it called `/api/initiate` with a throwaway prompt and then just reset to the same static `DEFAULT_SCENARIOS` list, never actually using the response. Replaced with a pure client-side pick-and-start: picks a random entry from `DEFAULT_SCENARIOS` and calls `onSelectScenario` directly, skipping the confirm screen entirely (unlike clicking a scenario card, which still goes through the confirm step). List expanded from 4 to 8 (added At the Airport/Hotel, At a Pharmacy/Doctor, Shopping in a Store, Asking for Help/Emergency) — `ScenarioSelector.jsx` no longer needs its own `scenarios` state since the list is no longer mutable at runtime, so `DEFAULT_SCENARIOS` (the named export other components already import) is rendered directly.
- **Production deploy: CLI-based, not GitHub-connected (added v1.0k, SAC-003–007):** Backend deployed to Railway via `railway up` (uploads the local working tree directly); frontend deployed to Netlify via `netlify deploy --prod --dir=dist` (uploads a pre-built `dist/`). Neither is linked to the GitHub repo for auto-deploy-on-push yet — that's tracked separately as SAC-017 since wiring it up requires the Netlify/Railway GitHub App OAuth flow (browser-interactive, same class of blocker as the CLI logins below), not just CLI commands. Until SAC-017 ships, a code change requires a manual `git push` **and** a manual `netlify deploy`/`railway up` to actually go live — pushing to GitHub alone does nothing.
- **Railway needs its own build override (`railway.json`, added v1.0k):** Railway's Nixpacks builder auto-detects a `build` script in `package.json` and runs it unconditionally — since this repo's `npm run build` is the *frontend's* Vite build, Railway tried (and failed, missing `terser`) to build the frontend on a service that only needs to run `npm run backend`. Fixed with `railway.json` (`build.buildCommand` set to a no-op echo, `deploy.startCommand` set explicitly to `npm run backend`) rather than removing/renaming the root `build` script, since local `npm run build` still needs to work for Netlify's build step.
- **`src/api.js`: single `VITE_API_URL`-aware fetch wrapper (added v1.0k, SAC-009):** All 4 `fetch('/api/...')` call sites (2 in `ConversationView.jsx`, 2 in `ListeningStoryView.jsx`) now go through `apiFetch(path, options)`, which prefixes `path` with `import.meta.env.VITE_API_URL` (empty string if unset). In dev this env var stays unset, so requests remain relative and go through the existing Vite proxy to `localhost:3000`; the Netlify production build sets it to the Railway URL at build time. This is a build-time substitution (Vite inlines `import.meta.env.*` at build), not a runtime lookup — changing `VITE_API_URL` on Netlify requires a rebuild+redeploy, not just a restart.
- **Analytics: console-only `logEvent()`, no provider yet (added v1.0k, SAC-016):** `src/analytics.js` exports one function; call sites (`page_view` in `App.jsx`, `session_started`/`session_completed` in both view components, `history_dashboard_viewed` in `App.jsx`) are already wired so that swapping the function body for a real provider (Plausible was the one discussed) later touches one file, not every call site. Deliberately not using `NODE_ENV`/`import.meta.env.PROD` to suppress dev logging — the console output *is* the product for this round, per the prompt's own "just log to console" recommendation for launch.
- **Email capture: `EmailCapture.jsx`, ships inactive (added v1.0k, SAC-016):** Renders a small form (email input + Formspree POST) after a completed Conversation (`SummaryPanel.jsx`) or Listening (`ListeningStoryView.jsx`, once `playStatus === 'finished'`) session. Reads its endpoint from `VITE_FORMSPREE_URL` and renders `null` entirely if that's unset — Vinay chose to skip creating a Formspree form this round (it requires his own email to verify), so this ships as dead-but-harmless code rather than a half-built feature blocking the rest of the deploy. Verified via Playwright that the form genuinely doesn't render (0 `input[type=email]` elements) with the var unset, so there's no broken-looking empty box.

---

## Spanish Learning Philosophy (Embedded in App Design)

Vinay's stated learning goals (prioritized):
1. **Understand native speakers** (comprehension)
2. **Be comprehensible to native speakers** (broken Spanish OK, as long as meaning is clear)
3. **Improve grammar & pronunciation** (after first two goals are solid)

**Design implication:** v1.0b is optimized for goals #1 and #2. Feedback is encouraging, not harsh. App accepts imperfect Spanish as long as it's understandable. Grammar corrections are suggestions, not roadblocks. This is intentional — perfect grammar before confident speaking would be backwards.

---

## Data Integrity Rules

**Phase 1 (v1.0a-v1.0i):** Not applicable — app was stateless, no shared/derived records, no users, no database.

**v1.0j onward:** IndexedDB session history added (SAC-013). Checked `~/.claude/skills/PERSONAL_STYLE.md` (the file CLAUDE.md anticipated referencing here) — its persistence guidance ("clear-then-insert, identity matching, synthetic test data restrictions") is written for shared, multi-user databases. It doesn't apply here: this is local-only, per-browser IndexedDB with a single implicit "user" (whoever's using that browser), no shared/derived records, no synthetic-vs-real-data distinction to worry about. No special data-integrity process needed beyond the usual (don't silently swallow save failures — `db.js` callers log to console on error).

---

## Versioning Convention

- Format: `v[major].[minor][letter]`
- **Bump on every change**, even minor ones (v1.0b → v1.0c → v1.1a, etc.)
- Version must be **visibly displayed** in running app (header badge, top right)
- **Tell the user the new version number after every shipped change.**
- Current version: **v1.0k**

---

## Phased Roadmap

### Phase 1 — MVP (Current)
- [x] Audio conversation interface (Web Speech API)
- [x] Scenario selector (flexible, Claude-generated)
- [x] Claude initiates conversation
- [x] User speaks Spanish → Claude responds + feedback
- [x] Backend proxy (CORS fix)
- [x] Local testing complete
- [x] GitHub repo + deploy to Netlify + Railway — shipped v1.0k (CLI-deployed, not GitHub-auto-deploy yet — see SAC-017)
- [x] Final documentation (README, CLAUDE.md, PENDING.md) — updated for v1.0k

### Phase 2 — Enhanced (Do Not Build Yet)
- [x] Session persistence (IndexedDB) — shipped v1.0j
- [x] Basic analytics logging — shipped v1.0k (console-only, no provider yet)
- [ ] Email capture live (code shipped v1.0k, inactive — needs a real `VITE_FORMSPREE_URL`)
- [ ] Auto-deploy on push (Netlify + Railway connected to GitHub) — SAC-017
- [ ] Difficulty selector (absolute beginner → intermediate)
- [ ] Vocabulary hints / phrase suggestions
- [ ] Scoring system (accuracy + fluency)
- [ ] User progress dashboard
- [ ] Export transcript after session
- [ ] Mobile responsiveness polish

### Phase 3 — Platform / Commercial (Do Not Build Yet)
- [ ] Multi-user with leaderboards
- [ ] Streak system + gamification
- [ ] Integration with Duolingo-like XP system
- [ ] Voice accent analysis
- [ ] Conversation history across sessions (Postgres)
- [ ] Advanced AI features (error pattern tracking, personalized coaching)

---

## Coding Conventions

**React / JavaScript:**
- Functional components with hooks (useState, useRef, useEffect)
- No TypeScript in Phase 1 (plain JS for speed)
- API keys never in frontend code — always `.env` on backend
- Error handling: catch + surface errors to UI (not silent failures)
- Component naming: PascalCase (ConversationView.jsx)
- File names: match component names (App.jsx, ScenarioSelector.jsx)

**UI / Styling:**
- Tailwind CSS, light backgrounds (clean + white, per Vinay's preference)
- Safe-first UX: lead with what user CAN do, not restrictions
- Plain-language copy (no jargon: "Start" not "Initialize")
- Friendly, conversational tone in UI text
- **Design tokens (added v1.0i):** colors, type scale, and radii are defined once as CSS variables in `src/index.css` `:root` and mapped into `tailwind.config.js`'s `theme.extend` — use the resulting utility classes (`bg-primary`, `text-ink-muted`, `bg-surface`, `rounded-card`, `text-heading-2`, etc.), never a raw Tailwind palette color (`bg-blue-600`, `text-gray-500`) or inline hex, so the whole app stays on one palette. Primary = teal, secondary = coral; success/danger/warn are semantic, not tied to a specific hue name.

**Backend (Node.js):**
- Express routes organized by endpoint (/api/initiate, /api/respond)
- CORS middleware allows localhost:5173 (dev), production URL (prod)
- Explicit error responses (not silent failures)
- Logging to console (console.error, console.log)

---

## Known Issues & Lessons Learned

- **CORS block from local file (FIXED in v1.0b):** Initial HTML artifact hit CORS error. Root cause: browsers block direct API calls from `file://` URLs. Solution: backend proxy pattern. This is production-grade and required for any deployment.

- **Web Speech API browser inconsistency:** Chrome/Edge are most reliable. Firefox has spotty support. Safari (iOS) requires HTTPS (won't work on localhost, needs production URL). Test on target browsers before declaring a fix.

- **TTS speech rate (0.8x) varies by device:** Slower rate helps beginners but may sound unnatural on some systems. Parameter is in ConversationView.jsx line ~98 (`utterance.rate = 0.8`). May need tweaking per user feedback.

- **Model string stale risk:** claude-opus-4-8 is current as of Jan 2025. If API calls start failing silently (no error, but no response either), **check the model string first** before assuming the bug is elsewhere. This has been a recurring issue across projects.

- **Speech recognition empty transcript:** Web Speech API fires `onend` even if user says nothing or audio is noise. Handle gracefully by checking `transcript.trim()` before calling handleUserResponse.

- **API key not loading from .env (FIXED in v1.0b):** Initial setup had .env in wrong folder (parent instead of spanish-audio-chat subfolder). Backend needs .env at project root. If backend shows "⚠️ ANTHROPIC_API_KEY not set in .env", first check: is .env in the right folder?

- **Intermittent UTF-8 replacement character in accented Spanish output (observed v1.0c, unresolved):** Occasionally (roughly 1 in 3-5 calls in testing) `/api/respond`'s JSON output contains a single U+FFFD replacement character in place of an accented letter (e.g., "café" → "caf�"), most often inside the `errors[].userSaid` field. Confirmed via direct Anthropic SDK calls (bypassing Express entirely) that this originates from the model's own generation, not from `server.js`'s regex/JSON-parsing or Express's response serialization — isolated repro scripts calling the SDK directly with the identical prompt reproduced it at a similar rate. `JSON.parse` still succeeds (U+FFFD is a valid JSON string character), so it doesn't break the app — it's a rare cosmetic glitch, not a functional bug. Not worth chasing further unless it starts appearing more visibly or the user requests a workaround (e.g., asking the model to `\u`-escape non-ASCII output).

- **JSON-generating endpoints need a generous `max_tokens` (learned v1.0d):** `/api/generate-story` truncated mid-JSON at `max_tokens: 1500` (`stop_reason: 'max_tokens'`) because the full-word `vocabulary` array for a 150-200 word story is itself 50-90 entries. Bumped to 4000 and added a `console.warn` when `stop_reason === 'max_tokens'` so future truncation shows up in backend logs instead of surfacing only as a confusing `JSON.parse` error. Worth checking `max_tokens` headroom on any future endpoint that asks the model to enumerate something proportional to input length (e.g. per-word, per-sentence).

---

## Deployment

**Local Dev:**
```bash
# Terminal 1 — Frontend
cd spanish-audio-chat
npm install  (first time only)
npm run dev
# Runs on http://localhost:5173

# Terminal 2 — Backend
cd spanish-audio-chat
npm run backend
# Runs on http://localhost:3000
```

**Production (live as of v1.0k — CLI-deployed, not yet GitHub-auto-deploy, see SAC-017):**
- Frontend: https://spanish-audio-chat.netlify.app
- Backend: https://spanish-audio-chat-production.up.railway.app
- GitHub: https://github.com/vvaidya98/spanish-audio-chat (public)

To ship a change to production, `git push` is not sufficient by itself — also run:
```bash
# Backend (from spanish-audio-chat/)
railway up --detach --service spanish-audio-chat
# after any env var change: railway redeploy --service spanish-audio-chat --yes (or another `railway up`)

# Frontend
VITE_API_URL="https://spanish-audio-chat-production.up.railway.app" npm run build
netlify deploy --prod --dir=dist
```
Both CLIs are pre-authenticated in this environment (`railway whoami` / `netlify status`) as of v1.0k — don't re-run the device-code login flow unless a CLI reports unauthenticated.

**CORS for Production:**
- Backend's `FRONTEND_URL` env var (Railway) is set to the Netlify URL above; `server.js`'s CORS `origin` list is `[localhost:5173, FRONTEND_URL]`
- Frontend's `VITE_API_URL` (Netlify build env var) points at the Railway URL — resolved via `src/api.js`'s `apiFetch()`, not hardcoded per-call

---

## Decisions Log

- **2026-08-24 (Claude.ai scoping):** Chose Web Speech API (native, no external libs) over external speech library. Chose backend proxy over direct frontend-to-API calls (CORS fix). Chose Flask/FastAPI + Railway as backup if Node.js has friction, but Node.js is default.
- **2026-08-24 (during local testing):** Moved index.html to root (not in public/) to match Vite's default config. Placed .env in spanish-audio-chat subfolder (not parent).
- **2026-08-24 (design decision):** Feedback timing is after each turn (not mid-conversation). Claude provides Spanish response, then English feedback. This pacing respects the learning flow.
- **2026-08-24 (Prompt #001 — SAC-010 scoping):** SAC-010 was originally reserved in PENDING.md for "session persistence" (Phase 2, planned to start after v1.0c's deploy milestone shipped). Prompt #001 redefined SAC-010 as the listening-first, multi-turn conversation-flow overhaul instead, and shipped it as v1.0c directly — ahead of the GitHub/Netlify/Railway deploy milestone (SAC-003–008), which is deferred, not dropped. Session persistence was renumbered to SAC-011. Confirmed with Vinay before building (per PENDING.md's standing instruction to check in on new/renumbered work before starting it).
- **2026-08-24 (SAC-010 build):** "End Conversation" button coexists with "Tap to Speak" once 5 exchanges are complete (both shown, user chooses), rather than replacing it outright — preserves the intended 5-8 exchange flexibility. "Tap to Speak" is only removed once the hard cap of 8 exchanges is reached, at which point "End Conversation" is the only option.
- **2026-08-24 (Prompt #002 — SAC-014 numbering):** PENDING.md's highest ID was SAC-011 (session persistence) when Prompt #002 arrived using SAC-014 for Listening Story Mode and SAC-013 for session persistence, skipping SAC-012. Confirmed with Vinay: followed the prompt literally — session persistence renumbered SAC-011 → SAC-013, SAC-012 left as an intentional gap, SAC-014 assigned to Listening Story Mode. Note: PENDING.md was also independently edited by Vinay's other (middle-panel) Claude Code session between prompts in this project — same file, two active sessions per his split-panel workflow — which is worth checking for on every read, not just assuming this session's last write is still current.
- **2026-08-24 (Prompt #002-A — incomplete, build paused):** Prompt #002-A (SAC-014-A/B/C: transcript sentence-tooltips, audio pause/resume/restart controls, MCQ tooltips) arrived truncated mid-example in part A, with no detailed requirements for B/C and no testing/reporting/acceptance-criteria sections (every other prompt in this project has included these). Held off building against a guessed spec — asked Vinay to resend the complete prompt. Recorded the partial spec in PENDING.md so it isn't lost.
- **2026-08-24 (Prompt #002-A completed, shipped v1.0e):** Vinay resent the rest of the prompt (it picked up mid-sentence from where the original cut off). Confirmed target version was v1.0e (stated in both the REPORTING and ACCEPTANCE CRITERIA sections of the completed prompt, overriding the original truncated header's "still v1.0d"). Built SAC-014-A/B/C in full — see Key Architecture Decisions above for the `HoverableText.jsx` and sentence-driven playback engine design. Testing caught one real bug (React DOM-nesting warning from a `<div>`-rendering `HoverableText` inside a `<p>`), fixed before shipping.
- **2026-08-24 (Prompt for SAC-014-D — arrived missing its opening, built anyway):** Unlike Prompt #002-A's truncation, this one was missing its start (no header/context, no implementation detail for the two reported bugs) but had complete, actionable detail for everything else (exact target ranges for the pause-duration fix, full specs for the hover-badge and story-length changes, full testing/reporting/acceptance-criteria sections). Judgment call: proceeded without asking, since the gap was fillable — Bug #2's fix was fully specified via its testing step's target range, and Bug #1 was diagnosable directly from the existing code (see Key Architecture Decisions above: StrictMode double-invoke race). This differs from #002-A, where the missing middle contained substantial new-feature spec (audio pause/resume mechanics, exact button behavior) that genuinely couldn't be inferred. Reconstructed the header context (SAC-014-D, v1.0f) from internal references ("v1.0f" in Reporting/Acceptance, "SAC-014-D" in Reporting, "SAC-014-E" in the Phase-2-parking section).
- **2026-08-24 (Prompt for SAC-014-E — arrived missing its opening again, plus an ID collision):** Same pattern a third time: no header, cut off mid-way through an icon-styling subsection, but everything needed to build was either fully specified (shorter-sentence target range, icon glyphs literally given in testing steps, progress-bar label format) or a defensible engineering judgment call (the `onboundary`-based smooth-speed-change mechanism — no implementation guidance given, root Web Speech API limitation understood from the v1.0e/f work). Separately: PENDING.md already had an unbuilt, parked "SAC-014-E" (story caching) from an earlier round, but this prompt's own Reporting section called the *current* work "SAC-014-E" too. Renumbered the parked caching idea to SAC-014-F to resolve the collision — a low-stakes call since that idea was never built, so didn't stop to ask (unlike the SAC-010/SAC-013 renames, which involved IDs already referenced elsewhere as actively-tracked work).
- **2026-08-24 (Prompt for SAC-014-F — missing opening a fourth time, ID collision a second time):** Same pattern again: no header, cut off mid-way through an icon-sizing subsection. Both "Fix #1" (stop button) and "Fix #2" (speed-change skip) testing steps described symptoms with zero implementation guidance — both root causes were diagnosed directly from the v1.0g code (see Key Architecture Decisions: token-guarded speaking engine). And again, this round's own Reporting section called itself "SAC-014-F" — colliding with the *previous* round's rename of the parked story-caching idea to that same ID. Renumbered the caching idea again, to SAC-014-G, same low-stakes reasoning as before. Pattern worth naming explicitly at this point: every SAC-014 sub-round so far has arrived missing its opening section, and the parked "next available ID" keeps getting claimed by the following round before it's ever built — if this keeps happening, consider just leaving the caching idea unnumbered in the parking area until it's actually scheduled, rather than pre-assigning an ID it won't keep.
- **2026-08-24 (Prompt for SAC-014-H — most compressed yet, no ID this time):** This prompt was *only* its Reporting and Acceptance Criteria sections — no header, no Objective, no Implementation section at all, the most compressed of any round so far. Unlike prior rounds, it never referenced its own SAC ID anywhere, so there was no collision to resolve this time — assigned SAC-014-H as the next available ID (following the already-claimed SAC-014-G). What made building without asking still defensible: the Acceptance Criteria bullets were unusually concrete on their own — an exact 28/18/16/14px type scale, exact 1.5rem spacing, exact 44px tap targets, exact 0.2s transition timing, exact interaction semantics for vocabulary matching (click-to-pair, checkmarks, completion message) — closer to a real spec than most rounds' actual Implementation sections have been. Testing caught a self-inflicted test bug worth remembering for future rounds: an unscoped Playwright locator (`text=/Correct!|Try again/`) picked up the *first* matching element in DOM order, which was the MCQ section's own persistent "Correct! ✓" answer-feedback text (appearing earlier in the page) rather than the intended Vocabulary Matching card's transient banner — the log claimed a successful match that a screenshot then contradicted. Fixed by scoping the locator to the vocabulary card specifically before trusting a "test passed" result again.
- **2026-08-24 (Prompt for SAC-013 + SAC-015 — largest round yet, real persistence layer):** This prompt introduced actual client-side data storage (IndexedDB) for the first time in the project — the largest scope of any round so far (new storage module, two new full-page components, scenario list expansion, a dead-button fix). Given CLAUDE.md's own Data Integrity Rules section explicitly flagged "return to PERSONAL_STYLE.md rules" for this moment, checked that file before designing anything — see Data Integrity Rules above for what was found (its rules are for shared multi-user databases, don't apply to local-only per-browser storage). Also folded in SAC-013 itself, which had sat undefined in PENDING.md since v1.0c (originally just a one-line placeholder: "Objective: Store all sessions to IndexedDB. User can view history" — no schema, no UI spec) — this prompt's Testing/Acceptance sections were the first time SAC-013 actually got fleshed out, alongside the new SAC-015 (scenario/button/history-dashboard work). Design calls made without an explicit spec to follow: single `sessions` object store (not separate stores per mode) so the unified History Dashboard doesn't need to merge two queries; sessions save on explicit "leave" actions (End Conversation / header Back) rather than continuously, so a closed tab mid-session loses that session — a disclosed gap, not an oversight; vocabulary-match results stored as a count + word list rather than per-word matched/unmatched detail, trading review granularity for a simpler save payload.
- **2026-08-25 (production deployment round, v1.0k — first round needing external accounts/credentials):** This prompt (GitHub + Netlify + Railway deploy, email capture, analytics, launch checklist) arrived via a `/compact` message with only its back half attached (Email Capture through Post-Launch Tasks — no header, no Objective, no earlier numbered sections), consistent with the pattern of prior rounds. Unlike prior rounds, this one couldn't just be built from the codebase — it required real external accounts. Checked tooling first (`git status`, `gh`, `netlify --version`, `railway --version`): no git repo yet, no `gh` CLI, `netlify` CLI present and already authenticated as Vinay (linked to an unrelated site, `tripbrazil`), no `railway` CLI. Did everything possible locally without asking first (git init, MIT LICENSE, `src/analytics.js`, `EmailCapture.jsx`, version bump, local Playwright test), then used `AskUserQuestion` for the three genuinely external decisions: GitHub repo creation (Vinay created it manually and sent the URL — faster than installing/authenticating `gh`), Railway (installed the CLI, Vinay completed the browser device-code authorization — first attempt's code expired before use since the login command was accidentally wrapped in a sub-shell `&` that got killed when its parent script exited; second attempt with a bare `run_in_background: true` call stayed alive correctly), Formspree (skipped — Vinay chose not to create a form this round, so `EmailCapture.jsx` ships wired but inactive). Two real bugs hit and fixed during deployment (not app bugs, deploy-config bugs): Railway's Nixpacks auto-ran the frontend's `npm run build` and failed on a missing `terser` dependency (fixed with `railway.json` overriding build/start commands, and `terser` added as a devDependency since it's also needed for Netlify's own frontend build) — and a `.env` extraction script (`grep '^ANTHROPIC_API_KEY='`) silently produced an empty value because the file has leading whitespace before that key, which shipped a broken backend (auth error on every Claude API call) until caught by actually calling `/api/initiate` against the live URL rather than just checking `/health`. Lesson generalized into the Environment Variables section above. GitHub's repo-creation defaults added placeholder README/LICENSE/gitignore content despite requesting an empty repo — confirmed it was trivial single-line/template content (not real work) before force-pushing local history over it.

---

## Standing Reminders for Claude Code

- **Every numbered prompt gets a Prompt Log entry** (this project uses SAC- prefix for PENDING items, separate from Prompt numbers)
- **Every build requires real UI testing** — not just "done," but specific before/after results
- **Version bump on every change** — even one-line fixes
- **Update CLAUDE.md, PENDING.md, README.md as last step of every shipped version**
- **API key always in .env, never in code**
- **Check model string before assuming bugs**
