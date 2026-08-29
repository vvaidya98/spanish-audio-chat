# PENDING.md — Conversation Amigo (formerly Spanish Audio Chat)
## Last updated: 2026-08-29 (Prompt #035, SAC-079 shipped as v1.2a)
## Project prefix: SAC (Spanish Audio Chat)

*Read this file at the start of every Claude Code session, alongside CLAUDE.md. Items here are either unresolved decisions or tasks not yet started. Check off items as they're resolved and note the decision made.*

---

## Standing Instructions (Always Follow)

- **Whenever a new feature or change is proposed, ask whether to add it to this pending list before building it.** Never make multiple unrelated changes without listing them first.
- Categorize new items as: **Pending** (next build) / **Phase 2** / **Phase 3**.
- Build all approved pending items together in one version when confirmed.
- Every version, even minor, must bump the visible version number in the running app (v1.0b → v1.0c, etc.)
- **Update README.md, CLAUDE.md, and this file as the last step of every shipped build.**
- Every prompt to Claude Code gets a flat, ever-incrementing number (Prompt #001, #002, etc.) — separate from PENDING item IDs. Use a Prompt Log file to track all numbered prompts.
- **Every build requires real UI testing with concrete before/after results** — not just "done" or "tested."

---

## 🚨 URGENT — Data Integrity / Production-Affecting

*(Not applicable for Phase 1 — app is stateless, no database. When Phase 2 adds persistence, return here.)*

- [ ]

---

## 🔴 BLOCKING — Must Resolve Before Launch (Phase 1 MVP → Production)

- [x] SAC-001: Local testing complete (both frontend + backend running)
- [x] SAC-002: Conversation flow working end-to-end (speak Spanish → Claude responds + feedback)
- [x] SAC-003: GitHub repo created (**public**, not private as originally noted — Vinay created it manually), `main` branch, MIT LICENSE — https://github.com/vvaidya98/spanish-audio-chat
- [x] SAC-004: Netlify connected — deployed via CLI (`netlify deploy --prod`), not yet linked to GitHub for auto-deploy-on-push (see SAC-016) — https://spanish-audio-chat.netlify.app
- [x] SAC-005: Railway connected — deployed via CLI (`railway up`), not yet linked to GitHub for auto-deploy-on-push (see SAC-016) — https://spanish-audio-chat-production.up.railway.app
- [x] SAC-006: Production API URL tested — real Playwright run against the live Netlify URL hitting the live Railway backend hitting the real Claude API, confirmed end-to-end (see v1.0k decision log)
- [x] SAC-007: Final documentation review — README/CLAUDE.md/PENDING.md updated for v1.0k

---

## 🟡 DECIDED BUT NOT YET BUILT

- [ ] SAC-008: Create testing checklist HTML (interactive, per Vinay's testing-checklist convention) for Phase 1 final validation before shipping

---

## 🟢 OPEN QUESTIONS — Decide Before or During Build

- [x] **SAC-009: Production frontend-to-backend URL routing** — Decided and shipped in v1.0k: `src/api.js` reads `VITE_API_URL` at build time; unset in dev (relative paths through the Vite proxy), set to the Railway URL for the Netlify production build.

---

## 🟠 PENDING BUILD (v1.0c → v1.0d) — NOW SHIPPED

### SAC-014: Listening Story Mode (Pure Listening Comprehension)

**Priority:** High — ship with v1.0d

**Objective:** Pure listening comprehension practice. User listens to short story (1-2 min), answers 2-3 MCQ questions, reviews transcript with hover tooltips for word definitions.

**Design Specs (Confirmed):**
- Scenario selection: User picks scenario from same list as Conversation Mode
- Story length: 1-2 minutes (3-5 sentences)
- Questions: 2-3 MCQ only (multiple choice)
- Transcript: Full text display button
- Vocabulary: Hover tooltips on ALL words (show English definition)
- Reuse vocab: Stories use same words as Conversation Mode scenarios (reinforces learning)
- Integration: Mode selector on home (Conversation | Listening)

**Components to Create:**
- `ModeSelector.jsx` — Conversation | Listening buttons
- `ListeningStoryView.jsx` — Story player + questions + transcript + tooltips
- `WordTooltip.jsx` — Hover tooltip for word definitions

**Backend:**
- `/api/generate-story` → generates story for scenario
- `/api/story-questions` → generates 2-3 MCQ based on story

**Testing:** 12 concrete UI steps (select mode → listen → answer → review transcript → hover tooltips → back to scenarios)

**Acceptance Criteria:**
- ✅ Mode selector works (Conversation | Listening)
- ✅ Scenario picker appears for Listening Mode
- ✅ Story plays (audio only, no text)
- ✅ Repeat buttons work (1x, 0.8x, 0.6x)
- ✅ Story uses scenario vocabulary (reused)
- ✅ 2-3 MCQ appear with feedback
- ✅ Display Transcript shows full text
- ✅ Hover tooltips on ALL words (English definitions)
- ✅ v1.0d version bumped & displayed

---

### SAC-014-A/B/C: Listening Story Mode Refinements — SHIPPED in v1.0e

**Spec:**
- A) Transcript tooltips: hover any word → highlight its full sentence (amber bg) + show sentence-level English translation; click a word → small tooltip with just that word's definition (sentence highlight stays)
- B) Story audio: auto-pause 2-3s after each sentence then auto-continue; Start/Stop-Resume/Restart control buttons (visually separated from speed buttons); speed change (1x/0.8x/0.6x) works mid-playback without restarting the story from sentence 1
- C) Same hover-sentence/click-word behavior applied to MCQ question text and each answer option

**Built and tested per Prompt #002-A (2026-08-24)** — see DONE section for full test results and implementation notes.

---

### SAC-014-D: Listening Story Mode — Bug Fixes & Enhancements — SHIPPED in v1.0f

**Spec (reconstructed — the prompt arrived missing its opening section: no header, no full detail for the first two bug reports):**
- Bug #1: Audio repetition/stutter at story start — root cause diagnosed from code (not specified in the prompt): React StrictMode double-invokes the mount effect in dev, and the old code called `loadStory()` unguarded, so two independent fetch+playback sequences raced, both eventually calling `speakSentenceAt(0)`
- Bug #2: Reduce inter-sentence pause from 2.5s to ~1.2-1.5s
- Item 3: Hover behavior — show ONLY the English translation (as a pill/badge), stop highlighting the Spanish text on hover; click-word-for-definition unchanged
- Item 4: Increase story length from 3-5 sentences (~150-200 words) to 7-10 sentences (~300-400 words, ~2.5-3.5 min)

**Built and tested per Prompt (2026-08-24)** — see DONE section.

---

### SAC-014-E: Listening Story Mode — Audio, Sentence Length & Transcript Redesign — SHIPPED in v1.0g

**Spec (partial — prompt arrived without its opening section again; caught mid-sentence in an icon-styling subsection with no earlier context):**
- Fix #1: Speed change mid-play was audibly stuttering/restarting the current sentence (a known, disclosed limitation from v1.0e/f) — fix so it resumes smoothly instead
- Refine #2: Shorten sentences from 30-45 words (v1.0f) back down to 15-25 words each (~200-250 total, down from 278) — v1.0f's longer sentences turned out to be too much to digest per auto-pause chunk
- Enhance #3: Transcript redesign — numbered sentences, per-sentence 🔊 play icon and 🌐 translate-toggle icon (only one of each active at a time across all sentences), replacing the v1.0f hover-to-translate behavior for the transcript specifically (MCQ hover-translate is unchanged)
- Redesign #4: Main playback controls redesigned as icons (⏮ ▶/⏸ ⏭) with a progress bar + "Sentence X of Y" label, replacing the v1.0e/f Start/Stop-Resume/Restart text buttons; ⏭ (jump to last sentence) is a new capability

**Built and tested (2026-08-24)** — see DONE section.

**Note:** this session's own backlog already had a *different*, not-yet-built "SAC-014-E" (story caching, parked) from a previous round. Renumbered that to **SAC-014-F** to free up SAC-014-E for this round's actual shipped work, which is what the prompt itself called it (referenced in its own Reporting section). Low-stakes rename since the caching idea was never built — noted for the record, not asked about.

---

### SAC-014-F: Listening Story Mode — Playback Fixes, Vocabulary & Navigation Redesign — SHIPPED in v1.0h

**Spec (prompt arrived without its opening section a fourth time):**
- Fix #1: Stop/pause wasn't always stopping immediately (real Web Speech API `speechSynthesis.pause()` reliability issue) — should stop within ~100ms and resume from the same sentence
- Fix #2: Speed changes were sometimes skipping ahead multiple sentences instead of resuming the current one
- Refine #3: Story vocabulary should be more varied/expanded (not just the same handful of obvious words every time)
- Refine #4: Shorten sentences further, to 10-15 words each (~100-150 words total, down from 15-25/~200-250 in v1.0g)
- Refine #5: Move navigation (Back, Change Mode, Diff[erent] Scenario) into a header at the TOP of the listening view, removing the old bottom-of-page back button

**Built and tested (2026-08-24)** — see DONE section. Note: this round's own ID collided with the SAC-014-F rename from the *previous* round (that round called itself SAC-014-E but the prompt's Reporting section also said "SAC-014-F" for a still-parked idea). Renumbered the parked story-caching idea again, from SAC-014-F to **SAC-014-G**, to free up SAC-014-F for this round's actual work — same low-stakes reasoning as before.

---

### SAC-014-G: Story Caching (Phase 2+, parked)

Once SAC-013 ships with IndexedDB: cache generated stories after first generation, reuse on repeat plays (instant load), still generate fresh for new scenario/play combinations. Slow generation accepted as a known limitation until then.

---

### SAC-014-H: Listening Story Mode — Design Polish & Vocabulary Matching — SHIPPED in v1.0i

**Spec (this round's prompt was only its Reporting and Acceptance Criteria sections — no header, no Objective, no Implementation detail at all; everything below is reconstructed from what those two sections implied):**
- Design polish: card-based layout (story player, questions, transcript, vocabulary matching each their own card); consistent color scheme (light bg, teal primary, coral secondary); typography scale 28px→18px→16px→14px; 1.5rem card padding/gaps; visible hover + active states; 44px+ tap targets; centralized color tokens (no ad hoc hardcoded colors); 0.2s ease transitions
- New Vocabulary Matching exercise: appears after the MCQ comprehension check; 5-10 words pulled from the actual story text (not invented) with a genuine easy/medium/hard difficulty mix; click-to-pair against shuffled, lettered (a-j) English translations; green "✓ Correct!" / red "✗ Try again" feedback; persistent checkmarks on matched pairs; "🎉 Great job!" message once all matched

**Built and tested (2026-08-24)** — see DONE section. Version was explicitly given (v1.0i, stated in both the Reporting and Acceptance Criteria sections) but no SAC ID appeared anywhere in the prompt (unlike every prior round, which referenced its own ID at least once) — assigned SAC-014-H as the next available ID in sequence.

---

### SAC-013: Session Persistence (IndexedDB + History View) — SHIPPED in v1.0j

**Objective:** Store all sessions (Conversation + Listening) to IndexedDB. User can view history.

**MVP Scope:** Basic storage + history list (track sessions, view full transcripts)  
**Phase 2+:** Progress metrics, stats, trends

**Built and tested per this round together with SAC-015** — see DONE section.

---

### SAC-015: Scenario Expansion, Button Fix & History Dashboard/Review — SHIPPED in v1.0j

**Spec (prompt was only Features/Styling bullets for Session Review, plus full Testing/Acceptance sections — no header, no Objective; SAC-013 was reconstructed from a much older, never-detailed PENDING.md entry, SAC-015's earlier sections were never seen):**
- Fix #1: "Different Scenarios" button renamed to "Choose One for Me"; now actually picks a random scenario AND starts the session immediately (previously just reset to the same static list)
- Expand #2: scenario list doubled from 4 to 8 — added At the Airport/Hotel, At a Pharmacy/Doctor, Shopping in a Store, Asking for Help/Emergency
- Implement #3: IndexedDB session storage (this is SAC-013) — one `sessions` object store, `mode`/`scenario`/`timestamp` indexes, survives browser restart
- Build #4: History Dashboard — stats header, mode + scenario filters, paginated session cards (newest first), "View" per card
- Build #5: Session Review — Conversation: numbered exchanges with Previous/Next nav, error highlights + corrections; Listening: story transcript, MCQ results (correct/incorrect badges), vocabulary matching summary

**Built and tested (2026-08-24)** — see DONE section.

---

## 🟠 PENDING BUILD (v1.0b → v1.0c) — NOW SHIPPED

### SAC-010: Enhanced Conversation Flow & Learning-First UX

**Priority:** High — ship with v1.0c before production deploy

**User Flow:**
1. **Scenario Selection** (existing) → Click "Start Conversation" button
2. **Conversation View** appears with Claude's opening (Spanish only, NO text)
3. User taps "Tap to Speak" → browser listens
4. User speaks Spanish answer
5. User taps "Tap to Send" → transcript sent to Claude
6. Claude responds (Spanish audio only, text hidden)
7. **Repeat buttons appear:** 1x | 0.8x | 0.6x (replay most recent Claude message)
8. If user clicks "Display text" → shows Claude's most recent message only
9. Repeat steps 3-8 for 5-8 exchanges total (conversation continues)
10. After final exchange, "End Conversation" button appears
11. User clicks "Summary" → shows:
    - Full conversation (both Claude's + user's responses)
    - User's Spanish errors **highlighted**
    - Personalized suggestions for each error
    - Corrected versions of user's responses

**Components to Update:**
- `ConversationView.jsx` — biggest change
  - Add "Start Conversation" button (from ScenarioSelector handoff)
  - Replace auto-listen with "Tap to Speak" + "Tap to Send" buttons
  - Hide Claude's Spanish text by default (state: `showText = false`)
  - Add repeat speed buttons (1x, 0.8x, 0.6x)
  - Add "Display text" button (toggles `showText`)
  - Track exchange count (keep going until 5-8, then show "End Conversation")
  - Store full conversation history for summary
  - Add "Summary" button → shows SummaryPanel (new component)
  
- `SummaryPanel.jsx` (new component)
  - Display full transcript (Claude messages + user responses)
  - Highlight user errors in red or amber
  - Show corrected versions + suggestions below each error
  - "Back to Scenarios" button to restart

**Backend Change (Minor):**
- Modify `/api/respond` to include explicit error analysis in feedback
- Add field: `{ spanish, feedback, errors: [{userSaid, corrected, explanation}] }`
- Errors array contains one object per mistake in user's input

**UI Design Notes:**
- Buttons should be large, thumb-friendly (mobile-ready)
- Disable buttons during audio playback (can't tap Send while Claude is speaking)
- Show visual indicator of which exchange # (e.g., "Exchange 3 of 8")
- Keep light background + readable hierarchy

**Testing Requirements (Real UI):**
1. Open app → select scenario → click "Start Conversation"
2. Tap "Tap to Speak" → speak a sentence
3. Tap "Tap to Send" → verify transcript captured
4. Verify Claude responds (audio plays, text hidden)
5. Click repeat button (1x) → verify audio replays
6. Click "Display text" → verify only Claude's current message shows (not history)
7. Continue for 6 exchanges (counting...)
8. After 6th exchange, "End Conversation" button appears
9. Click "End Conversation" → "Summary" button appears
10. Click "Summary" → full transcript visible
11. Verify user errors highlighted with suggestions
12. Verify corrected Spanish shown below each error
13. Click "Back to Scenarios" → returns to scenario picker

**Acceptance Criteria:**
- ✅ Conversation continues for 5-8 exchanges (not just one turn)
- ✅ Claude's text hidden initially (listening-first learning)
- ✅ Repeat buttons work at all 3 speeds
- ✅ "Tap to Speak" / "Tap to Send" flow is smooth (no auto-listening)
- ✅ Summary shows full transcript + errors highlighted + suggestions
- ✅ v1.0c version bumped and displayed
- ✅ All documentation (CLAUDE.md, README, this file) updated

---

## 📋 Build Order (Recommended Sequence for Phase 1)

**Done — v1.0d:**
- SAC-014: Listening Story Mode (core) — see DONE section

**Done — v1.0e:**
- SAC-014-A/B/C: Listening Story Mode Refinements — see DONE section

**Done — v1.0f:**
- SAC-014-D: Listening Story Mode Bug Fixes & Enhancements — see DONE section

**Done — v1.0g:**
- SAC-014-E: Listening Story Mode Audio, Sentence Length & Transcript Redesign — see DONE section

**Done — v1.0h:**
- SAC-014-F: Listening Story Mode Playback Fixes, Vocabulary & Navigation Redesign — see DONE section

**Done — v1.0i:**
- SAC-014-H: Listening Story Mode Design Polish & Vocabulary Matching — see DONE section

**Done — v1.0j:**
- SAC-013: Session Persistence (IndexedDB) — see DONE section
- SAC-015: Scenario Expansion, Button Fix & History Dashboard/Review — see DONE section

**Done — v1.0k:**
- SAC-003–007: Production deployment (GitHub, Netlify, Railway, prod URL testing, doc review) — see DONE section
- SAC-016: Basic analytics logging + optional email capture — see DONE section

**Done — v1.0l:**
- SAC-018–024: Phase 1 UX enhancements (nav buttons, story completion toggles, vocab animations, loading spinner, mobile tap targets, compact mobile header, audio autoplay fallback) — see DONE section

**Done — v1.0m:**
- SAC-025–029: Phase 2 batch 1-2 (mode reorder, sentence jump markers, one-at-a-time vocab matching, vocab example phrases/sentences, story caching + regenerate) — see DONE section

**Done — v1.0m (Prompt #012, Phase 2.5 polish — all 4 tasks):**
- Task 1: Speed labels relabeled Slow/Normal/Fast (0.6/0.5/0.4x), default changed from 0.8x to 0.5x — see DONE section
- Task 2: Listening Mode's "Diff Scenario" button renamed "Back to Stories", now navigates to the scenario picker instead of auto-picking a random scenario — see DONE section
- Task 3: App renamed "Spanish Audio Chat" → "Conversation Amigo" (index.html, App.jsx header, README.md, package.json/package-lock.json) — see DONE section
- Task 4: `LoadingSpinner.jsx` rewritten to drop the fake eased-percentage progress bar and word carousel, replaced with a plain spinner + honest "this usually takes N seconds" message — see DONE section

**Shipped in v1.0q — Prompts #013 through #017 (Phase 2.6-2.7, speech quality + navigation + UX + loading animation):** All five rounds sat at the commit/deploy gate together (none had been individually shipped) pending a human speech-clarity listen-test, per Prompt #013's original instruction. Vinay confirmed locally and explicitly requested the deploy — shipped as one commit + one production push (Railway + Netlify), verified live. Full per-prompt technical detail (every task, every bug found/fixed, every decision made without an explicit spec) is in the DONE section below rather than duplicated here — v1.0n was never its own release (only #013/#014's internal working label); the badge moved v1.0m → v1.0o (#015) → v1.0p (#016) → v1.0q (#017), and the syllable-loss delay moved 75ms → 150ms → 175ms across #015-#017 from real listen-test feedback each round.

**Shipped in v1.0s — Prompt #018 (v1.0q → v1.0r, In-Memory Story Caching; shipped together with #019-#020):**
- Replaced the v1.0m filesystem cache (`.cache/stories.json`) with an in-memory `Map` in `server.js` — `storyCache.get/set(scenario)`, plus a new unused-but-available `clearCache()` utility. Removed `fs`/`path`/`fileURLToPath` imports and all filesystem cache helpers (`ensureCacheDir`/`readStoriesCache`/`writeStoriesCache`) entirely, confirmed they had no other callers before deleting.
- `/api/generate-story` unchanged in shape/signature — only swapped which cache functions it calls. Console logging updated to the requested `[generate-story] .../[cache] ...` bracketed format.
- **Verified directly at the API level, not just "should work":** cache hit for an exact scenario-string match returned in **0.11-0.12s** vs. **~18-21s** for a genuine miss (curl timing, real backend, real Claude API); confirmed the cached response body is byte-identical to the original; confirmed a *different* scenario string is an independent cache entry (doesn't collide); confirmed `regenerate: true` bypasses the cache, produces genuinely different story content, and correctly overwrites that scenario's cache entry (reload after regenerate returns the *new* content, instantly). Console log sequence matched the prompt's expected output exactly.

**⚠️ Real gap found during full end-to-end UI testing — flagging rather than silently expanding scope:** Prompt #018 only asked to fix `/api/generate-story`'s cache, and that fix is fully verified working. But loading a story end-to-end still took **~25s on a "second load"** in a real browser test, because `/api/story-questions` (the MCQ + vocabulary-matching call) has **never been cached at all** — that was an explicit, documented scope decision from the original SAC-029 caching round (v1.0m), not something this prompt touched or asked to change. `ListeningStoryView.jsx`'s `loadStory()` calls both endpoints and doesn't flip `loading` to false until *both* resolve, so the un-cached ~12s `story-questions` call is now the dominant cost on every repeat load, cache or no cache. **This means the prompt's own testing checklist item ("Second load of same scenario is <1s (instant)") will not actually be observed end-to-end**, even though the specific cache mechanism this prompt asked for is genuinely fixed and verified fast in isolation. Logged as **SAC-033: Cache `/api/story-questions` too** (same in-memory `Map` approach, keyed by scenario) — not built, since it's outside this prompt's stated file/endpoint scope; flagging for Vinay to decide whether to fold it into confirmation-testing this round or take as a fast, separate follow-up.

**Shipped in v1.0s — Prompt #019 (still v1.0r, SAC-033: cache `/api/story-questions` too; shipped together with #018, #020):**
- Same in-memory `Map` pattern as #018's story cache — new `questionsCache`, `getCachedQuestions(scenario)`/`cacheQuestions(scenario, data)`, keyed by `scenario` (same key as the story cache, not story content). `/api/story-questions` now checks the cache first, same `[story-questions] Using cached questions for 'X'` / `Generating questions for 'X'` log format as requested, and stores the result on a genuine miss.
- **Verified end-to-end, not just at the API layer:** a real UI click-through (real backend, mocked audio only) of "go back → reload the same scenario" dropped from the ~25s measured in #018's testing to **91ms total** — comfortably under the "<1s" target, confirmed via both direct `curl` timing (0.117s story + 0.094s questions) and a live browser session.
- **Regenerate behavior — built exactly as the prompt's own explicit recommendation ("Option B for now"):** clicking "🔄 Regenerate Story" regenerates the story (real ~19s generation, confirmed genuinely different content) but the *questions/vocabulary-matching cache is intentionally left alone* — the old cached MCQ/vocab data is served alongside the new story rather than being invalidated or regenerated. Confirmed via the backend log sequence: `Regenerating story` → `Stored: X` (new story) → `Using cached questions for 'X'` (old questions, untouched). No crash, MCQ and Vocabulary Matching both still render correctly against the mismatched-but-valid old data. **This is a known, disclosed tradeoff, not a bug** — after a regenerate, the comprehension questions and vocab words may reference content that's no longer in the story. Acceptable per the prompt's own recommendation; a real fix (clearing/regenerating the questions cache on `regenerate: true`) is a small, well-scoped follow-up if this UX gap turns out to bother Vinay in practice — logged as **SAC-034**.
- Zero console errors, full regression clean.

**Shipped in v1.0s — Prompt #020 (v1.0r → v1.0s, SAC-034/035/036/037; shipped together with #018-#019):**
- **SAC-034 (Invalidate questions cache on regenerate):** `/api/generate-story` now calls `questionsCache.delete(scenario)` whenever `regenerate === true`, logging `[cache] Cleared questions for regenerate: X`. Closes the exact gap SAC-034 was opened for in Prompt #019. Verified via direct API calls (not just reading the code): after a regenerate, a subsequent `/api/story-questions` call for that scenario took ~26.6s (genuine fresh generation, not a cache hit) and returned genuinely different questions/vocab content than before.
- **SAC-035 (Story diversity on regenerate):** Added the requested 5-element variation instructions (character names/backgrounds, scenario-specific items, dialogue/interactions, central problem/goal, setting/atmosphere) to `/api/generate-story`'s Claude prompt, with `${scenario}` interpolated as given. Verified with a real regenerate call — the new story was confirmed genuinely different from the original (diffed, not just eyeballed).
- **SAC-036A (Reorder comprehension sections):** Swapped the render order in `ListeningStoryView.jsx` — `<VocabularyMatching>` now renders before the MCQ Comprehension Check block (previously MCQ was first). Verified via DOM order in a live page (`Vocabulary Matching` text appears before `Comprehension Check` text), not just by eyeballing the JSX.
- **SAC-036B (Suppress first vocab word's auto-play):** `VocabularyMatching.jsx`'s word-appear auto-play effect now skips (with a `[vocab] First word — audio suppressed` console log) when `currentIdx === 0`, giving the user a moment to read the interface before any audio starts; the 🔊 icon still plays it on demand, and word 2 onward still auto-plays as before. Verified via a real click-through: no auto-play on word 1, manual icon click confirmed working (see note below), word 2 auto-plays.
- **SAC-037 (Tap to Begin, no auto-play ever):** New `hasUserStarted` state gates the entire player UI — until the user clicks a new "🎧 Tap to Begin" screen, nothing renders but the scenario name and that button, and zero `speak()` calls happen. Clicking it is the *only* place audio is ever kicked off; regenerating resets `hasUserStarted` back to `false`, bringing the gate back with no auto-play. This let a substantial amount of now-dead code be removed cleanly rather than left disabled: the old `autoplayFailed` state, `handleTapToPlay`, and the "🔊 Tap to Play" fallback button (SAC-024, v1.0l) are gone entirely — since audio only ever starts from a direct click handler now, the autoplay-policy silent-failure problem SAC-024 was built to detect can no longer occur, so its detection machinery had nothing left to guard against. Verified via a real click-through: zero `speak()` calls before tapping Begin, player controls hidden until then, `speak()` fires immediately after the tap, and regenerate correctly resets back to the gate with zero auto-play.
- **One test-script timing bug caught and correctly diagnosed, not shipped as a real bug:** an early test run showed the 🔊 icon click on the *first* vocab word appearing not to work (`false`) — before concluding anything, isolated it with a dedicated repro polling every 50ms after the click, which showed `speak()` landing genuinely ~221ms after the click (the existing 175ms `SPEAK_START_DELAY_MS` plus render/dispatch overhead). The original test only waited 150ms before checking — less than the delay itself — so it never actually observed the (successful) call. No code change needed; matches this project's long-running pattern of "test timeout too tight, not a real bug" (same class as the v1.0k/v1.0l/v1.0m rounds).
- Zero console errors on desktop + mobile, full regression clean (Conversation Mode picker still loads).

**Deploy note:** Vinay confirmed locally and sent explicit deploy commands for all three rounds together. Shipped as one commit (`7b3605d`) and one production push (Railway backend + Netlify frontend), verified live at v1.0s via a real Playwright check against the production URLs (badge visible, scenario picker loads, zero console errors).

**Shipped in v1.0t — Prompt #021 (v1.0s → v1.0t, Phase 2.8 UI/UX Polish Bundle, SAC-038 through SAC-045):** Largest single-round scope since v1.0l — 8 SACs across `ModeSelector.jsx`, `App.jsx`, `FooterNav.jsx`, `VocabularyMatching.jsx`, and a substantial `ListeningStoryView.jsx` layout rewrite.
- **SAC-038:** Conversation Mode button now reads "Conversation mode coming soon," disabled/grayed out, no navigation on click.
- **SAC-039:** Removed the duplicate "📊 History" button from `App.jsx`'s top header — FooterNav's History button was already the same destination.
- **SAC-040:** Removed Prompt #020's "Tap to Begin" gate screen entirely. The story UI now renders immediately once loaded; the Play button simply starts unpressed (`playStatus` is already `'idle'` on load, and nothing auto-triggers `speakSentenceAt` — confirmed via testing that zero `speak()` calls happen before the user clicks Play).
- **SAC-041/042 (built together, same layout rewrite):** Player controls (Prev/Play-Pause/Next/Last + speed buttons) moved into a new `position: fixed` bar stacked directly above `FooterNav` (`bottom: calc(60px + env(safe-area-inset-bottom))`), with small muted text labels under each nav button ("Previous sentence" / no label on Play-Pause / "Next sentence" / "Last sentence"). **Judgment call, disclosed:** both SAC-041's and SAC-042's own mockups show exactly 4 buttons, one fewer than the app previously had — the 🔄 Replay button (added Prompt #013/SAC-031) is not in either mockup. Read this as intentional (consistent across two independent sections of the prompt) rather than an oversight, and removed Replay along with its handler; the icons used for the remaining 4 (⏮/▶‑⏸/⏭/⏩) were kept as the app's existing, already-differentiated glyphs rather than the prompt's own "◀/▶/▶/⏭" mockup notation, which would have made the Play and Next buttons visually identical side by side — a real usability regression a literal reading would have introduced. The progress bar + "Sentence X of Y" label were **not** moved to the bottom bar, per SAC-041's own layout diagram, which lists `[Progress bar]` as staying separate, higher up in the page, with only the interactive buttons relocating.
- **SAC-043:** New `correctCount` state in `VocabularyMatching.jsx`, incremented on each correct match, displayed as "{correctCount} of {total} correct" directly below the word/difficulty/audio-icon row. Verified live: starts at "0 of 9 correct," becomes "1 of 9 correct" after the first correct match.
- **SAC-044:** `FooterNav.jsx` reordered to Home | Topics | Back | History (was Back | Mode | Topics | History); "Mode" removed since Conversation Mode is disabled. New `handleFooterHome` in `App.jsx` goes straight to the scenario picker — functionally the same destination as "Topics" now that there's effectively only one active mode, which is what the prompt's own testing checklist describes for both buttons; implemented as specified rather than second-guessed, with the apparent redundancy noted here for the record.
- **SAC-045:** New "Display transcription" checkbox above the (now-separate, still-near-the-top) progress bar; when checked, shows a light-gray box with the *current* sentence only (auto-updates as playback advances) and a 🌐 icon that reveals the English translation below the Spanish (not a toggle *between* the two — both stay visible together once revealed). English visibility resets to hidden whenever the sentence changes, requiring a fresh click for each new sentence — verified via a real click-through, not just reading the effect. This is a separate feature from the pre-existing full-story "Display Transcript" toggle (all sentences, hover/click definitions), which is untouched and still coexists.
- **One test-script false negative caught and correctly resolved, not shipped as a bug:** an early check computed the fixed control bar's CSS `position` by walking up too few DOM ancestors from a button inside it, landing on a `static` wrapper `<div>` instead of the actual `fixed` one and reporting `position: static`. Before treating this as a layout bug, walked the full ancestor chain directly and also scrolled the page to check the bar's on-screen position stayed put (717.5px before and after scrolling 300px) — confirmed the bar genuinely is `position: fixed` and behaves correctly; only the test's own selector needed fixing, no app code changed.
- Zero console errors on desktop + mobile, full regression clean (Conversation Mode picker still loads with its new disabled state; History nav still reachable).

**Prompt #021 follow-up corrections (still v1.0t, no version bump — 3 quick fixes):**
- **Correction 1:** Leftmost player button relabeled "Previous sentence" → "First sentence" — and, per the prompt's explicit "mirrors Last sentence for consistency" rationale, its *behavior* changed too, from stepping back one sentence to jumping straight to sentence 1 (`handleJumpToStart`, mirroring `handleJumpToEnd`'s existing pattern). This is a real behavior change, not just a label swap — flagging clearly since the prompt's own wording ("Function: Remains the same") could be read either way; the "mirrors Last for consistency" line was the deciding signal, since Last is a jump-to-end, not a step. Verified live: from sentence 3, clicking it jumps straight to sentence 1, not sentence 2.
- **Correction 2:** Play/Pause button now shows a dynamic label below it — "Play" when idle/paused, "Pause" while playing — matching the icon's own existing dynamic swap. Verified both states live.
- **Correction 3:** Reverted Home's destination from the scenario picker back to the Mode Selector (undoing the redundancy this same round's SAC-044 implementation had introduced, which the original Prompt #021 report explicitly flagged for confirmation). "Topics" still independently resets to the scenario picker within the current mode — the two buttons are no longer functionally identical.
- Zero console errors on desktop + mobile, quick regression clean.

**Real bug found via Vinay's own testing (not caught by the automated tests above) and fixed:** Correction 3's `handleFooterHome` had `if (activeViewRef.current?.back) { activeViewRef.current.back(); return }` — an early `return` copied from the one-step-back `handleFooterBack`/`handleFooterTopics` pattern, which meant that from *inside* an active story, Home only saved the session and reset the scenario (landing on the scenario picker) without ever reaching `handleBackToModes()` below it. From the scenario picker itself (no active session, `activeViewRef.current` is null), the early return never triggered, so Home correctly reached the Mode Selector — matching exactly what Vinay reported ("if I'm on a specific story, Home doesn't go all the way back; if I'm already on the list of stories, it does"). Fixed by removing the early return, restoring the original `handleFooterMode`-era pattern (session save always happens, but never short-circuits reaching the Mode Selector). Verified via a real click-through from inside an active story (reaches Mode Selector) and confirmed the session still saved correctly on the way out (History shows the completed session).

**Deploy note:** Vinay confirmed locally and explicitly authorized the deploy. Shipped as one commit (`b26f1bb`) and one production push (Railway backend + Netlify frontend), verified live at v1.0t via a real Playwright check against the production URLs (badge visible, Conversation Mode shows disabled, scenario picker loads, zero console errors).

**Shipped in v1.0u — Prompt #022 (v1.0t → v1.0u, Phase 2.9 UX Refinements: SAC-046/047/048):**
- **SAC-046:** Regenerate Story relocated from the top header (`ListeningHeader.jsx`, removed entirely as dead code — nothing else used it) to a small `text-xs` 🔄 text button at the bottom of the upper content area, right before the fixed player-controls bar. Same `handleRegenerateStory` behavior as before (clears both caches, generates fresh, resets view state).
- **SAC-047:** Replaced the single "Display transcription" checkbox + 🌐 reveal-toggle (v1.0t) with two independent checkboxes, "Display Spanish" and "Display English." Unlike the old design, these are **persistent preferences** rather than per-sentence reveal state — no longer reset when the sentence changes (only the box's *content* updates); simplified the component by removing the now-unneeded reset-on-`currentIndex`-change effect entirely. Verified all 4 combinations live: neither checked → no box; Spanish-only; English-only; both → Spanish + separator + English. Also confirmed a preference (English checked) survives advancing to the next sentence, with the content correctly updating to the new sentence's text.
- **SAC-048:** New `isFirstLoad` state (starts `true`) drives a `play-button-pulse` CSS class (`@keyframes playButtonPulse`, scale 1 → 1.15 → 1, 1.2s infinite) on the Play button until the user's first real Play click, which clears it; also cleared on Regenerate (explicitly, regardless of whether Play was ever clicked) so a freshly regenerated story doesn't re-pulse — matches the prompt's literal expectation ("after regenerate → no pulse... user knows to click by now").
- **Test-tooling note, not an app issue:** Playwright's default `.click()` refused to click the pulsing Play button at all (`element is not stable` — its continuously-animating `transform: scale()` never satisfies Playwright's "stopped moving" actionability check). This only affects automated clicking; a real user can click a pulsing button without any such restriction — this is an extremely common, well-established UI pattern (call-to-action buttons, notification badges, etc.). Worked around in the test with `{ force: true }`, not by changing the app. Worth knowing if Vinay's own manual testing includes any tooling/automation around clicking — direct human clicks are unaffected.
- Zero console errors on desktop + mobile, full regression clean (Conversation Mode still disabled, Home still reaches Mode Selector).

**Prompt #022 follow-up (still v1.0u, 2 quick changes, then deployed):**
- Restored a "Previous sentence" step-back-one button (◀), placed between "First sentence" and Play — Prompt #021's follow-up correction had repurposed the original step-back button into "First sentence" (jump-to-start), leaving no way to step back just one sentence at a time. Player controls are now 5 buttons: First / Previous / Play-Pause / Next / Last. Verified live: from sentence 3, Previous goes to sentence 2 (step back one); First still jumps straight to sentence 1 (unchanged). Confirmed no horizontal scroll on mobile with the 5th button added.
- Play button pulse peak increased from `scale(1.15)` to `scale(1.5)` (50% larger at rest, per Vinay's explicit ask) — confirmed via the actual computed CSS keyframe, not just the source change.
- Vinay explicitly requested the deploy in the same message as these changes — shipped without a separate confirmation round-trip. Shipped as one commit (`d052f34`) and one production push (Railway + Netlify), verified live at v1.0u via a real Playwright check against the production URLs (badge visible, scenario picker loads, zero console errors).

**Shipped in v1.0w — Prompt #023 (v1.0u → v1.0v, SAC-049/050: Translation Card & Footer Navigation Redesign; shipped together with #024):**
- **SAC-049:** New "🌐 Translation" card added to `ModeSelector.jsx` in the 2nd position (Listening → Translation → Conversation), always enabled (unlike the disabled Conversation card), matching the existing card styling exactly. Clicking it sets `mode = 'translation'` via the existing `onSelectMode` flow — no new navigation mechanism needed, this app doesn't use URL routing, so "the /translation route" from the prompt is really just a new `mode` value handled in `App.jsx`'s `renderContent()`. New placeholder `TranslationView.jsx` shows "Translation Tool Coming Soon," to be replaced by the real tool in Prompt #024.
- **SAC-050:** `FooterNav.jsx` reordered/relabeled to Home | Listening | Conversation | Translation | History (was Home | Topics | Back | History). "Topics" and "Back" are gone; `handleFooterTopics`/`handleFooterBack` removed from `App.jsx` as dead code (nothing calls them anymore, same "delete rather than leave disabled" pattern as `ListeningHeader.jsx` in Prompt #022). New `handleFooterListening`/`handleFooterTranslation` in `App.jsx` mirror `handleFooterHome`'s shape exactly (no early return after `activeViewRef.current?.back()`, so an in-progress session always saves before jumping to the shortcut's destination) — verified this explicitly: started a real Listening session, clicked the footer's Translation shortcut mid-session, and confirmed via History afterward that the session had actually saved (not just that navigation worked). Footer's Conversation button is disabled (mirrors the disabled Conversation card in `ModeSelector.jsx` — same underlying reason, not wired to a dead destination).
- Confirmed 5 footer buttons fit on a 390px mobile viewport with no horizontal scroll or wrapping.
- Zero console errors on desktop + mobile, full regression clean (a real Listening Mode session still starts and plays correctly from the Mode Selector card).

**Shipped in v1.0w — Prompt #024 (v1.0v → v1.0w, SAC-051: Full Translation Page with Claude API; shipped together with #023):**
- **Backend:** New `/api/translate` endpoint in `server.js` — takes `text`/`sourceLanguage`/`targetLanguage`, calls Claude, returns `{ translated }`. **Two corrections from the prompt's own snippet, both disclosed:** (1) used `claude-opus-4-8` instead of the prompt's `claude-opus-4-6` — every other endpoint in this file (`/api/initiate`, `/api/respond`, `/api/generate-story`, `/api/story-questions`) uses `claude-opus-4-8`, and `claude-opus-4-6` doesn't appear anywhere else in the codebase or in any prior prompt, so this reads as a typo rather than a deliberate model choice; (2) error response includes `error.message` (matching every other endpoint's error-handling convention in this file) rather than the prompt's static `'Translation failed'` string.
- **Frontend:** `TranslationView.jsx` rewritten from the placeholder — direction toggle (Spanish → English / English → Spanish, clears both boxes on switch), textarea input, Translate button (disabled when empty or loading, shows "Translating..."), output box with a "Translation will appear here" empty state, Copy button (clipboard + "✓ Copied!" for 2s), Clear button, error banner matching the app's existing error-display styling. **One correction here too:** the prompt's own frontend snippet called `fetch('/api/translate', ...)` directly with a relative path — this would work in dev (Vite proxy) but **break in production**, since the Netlify frontend and Railway backend are on different domains and a relative path would hit Netlify instead. Used the existing `apiFetch` helper (`src/api.js`) instead, matching every other API call in the app (`ListeningStoryView.jsx`, `ConversationView.jsx`) — this is exactly the mechanism `VITE_API_URL` exists for.
- **Verified with real Claude API calls, not mocked:** "Buenos días, me gustaría un café con leche." → "Good morning, I would like a coffee with milk." (Spanish→English), and "Where is the train station?" → "¿Dónde está la estación de tren?" (English→Spanish, after toggling direction) — both natural, correct translations, not just "a response came back." Also verified: Copy button's clipboard content matches the displayed translation exactly (not just that the button showed a confirmation); Clear resets both boxes; a simulated network failure (via Playwright route interception) shows the expected error message and doesn't crash anything.
- Zero console errors during normal operation — the one console entry logged during the error-handling test run (`net::ERR_FAILED`) is the browser's own expected log for the *intentionally aborted* request in that specific test step, confirmed by re-running the same flow without the simulated failure and seeing zero errors.
- Full regression clean: Mode Selector's Conversation card still disabled, Listening Mode still starts and plays, History still reachable.

**Deploy note:** Vinay confirmed locally and sent explicit deploy commands for v1.0v + v1.0w together, plus a full post-deployment verification checklist. Shipped as one commit (`7dc53ec`) and one production push (Railway backend + Netlify frontend). Ran every item in the provided checklist against the live production URLs, not just the standard smoke test: badge/title, 3 Mode Selector cards in order with Conversation disabled, all 5 footer buttons (Conversation disabled), a real Claude API translation in both directions on production (not mocked — "Hola, ¿cómo estás?" → "Hello, how are you?" and "Good morning" → "Buenos días"), Copy verified against actual clipboard contents, Clear, Listening Mode regression, History regression. Zero console errors throughout.

### Shipped in v1.0x — Prompt #025 "mega build" (SAC-052 through SAC-064, 13 items, largest single-round scope in this project)
- **SAC-052:** Clarity Mode toggle (bottom controls, default off) — sentences with connectors ("y"/"pero"/"porque"/"cuando"/"mientras"/"si") are split into segments spoken with a 130ms pause after each connector, instead of one continuous utterance.
- **SAC-053:** Speed options now x1.0/x0.8/x0.6/x0.4 (added x0.4), default changed to x0.6.
- **SAC-054:** Player buttons redesigned as circles — Play 80px filled teal, First/Previous/Next/Last 48px teal-outlined. "First sentence"/"Last sentence" labels shortened to "First"/"Last"; Previous/Next unchanged.
- **SAC-055:** Display Spanish's word tooltips reuse the existing `HoverableText` component (dotted-underline click-to-define), not a new mechanism.
- **SAC-056:** 🔊 replay-at-current-speed icon added next to Display Spanish, reusing the existing `playTranscriptSentence`.
- **SAC-057:** Speed dropdown + Clarity Mode checkbox moved to a subtle, compact row at the bottom of the fixed controls bar.
- **SAC-058:** Standalone Translation page gained a "← Back" button. `App.jsx` tracks `previousMode`/`previousScenario` to restore on Back. **Known limitation:** if Translation was reached via a FooterNav shortcut mid-story, that shortcut already saves-and-ends the session first (unchanged v1.0v behavior) — Back reopens the same scenario fresh (cache-assisted) rather than at the exact prior sentence.
- **SAC-059/060:** New `QuickTranslateModal.jsx` — in-story translate overlay reachable from a "⊕ Quick Translate" button, doesn't unmount `ListeningStoryView` so playback position is fully preserved (this is the actual mechanism for "resume at the same spot," not SAC-058's Back button).
- **SAC-061:** Version badge in `App.jsx` is now a button opening `AboutModal.jsx`.
- **SAC-062:** Backend logs every Claude API call (endpoint, model, tokens, cost estimate) to `./data/api_usage.db` via Node's built-in `node:sqlite` — no new npm dependency, no native build step. Git-ignored, local-only.
- **SAC-063/064:** New `/api/usage-stats` endpoint + `AboutModal.jsx` display — today's calls/tokens/cost, 7-day average + trend, breakdown by feature (Stories/Questions/Translation/Conversation).
- **Testing limitation disclosed at the time:** no browser/Playwright available in this build environment — verification was a clean production build, a full re-read of every changed file, and real (non-mocked) backend calls confirming the usage-logging pipeline end-to-end, not a live UI click-through.

### Shipped in v1.0x — Prompt #026 (SAC-065/066/067, no version bump)
- **SAC-065:** New `RegenerateModal.jsx` — Regenerate Story is now icon-only, opens a confirmation modal (topic name, Cancel/Generate/X/ESC) before actually regenerating.
- **SAC-066:** The prompt named a `BeginStoryScreen.jsx`/`ScenarioPicker.jsx` that don't exist in this codebase — the real confirm step is `ScenarioSelector.jsx`'s own `pendingScenario` state (shared with Conversation Mode). Added a `skipConfirm` prop, set `true` only for Listening Mode — a scenario-card click now goes straight to loading. Conversation Mode's confirm screen (currently unreachable, disabled app-wide) is untouched.
- **SAC-067:** Display English now prefixes `{currentIndex + 1}. ` before the translation text.

### Shipped in v1.0x — same-day quick fix + deploy
- Extended SAC-067's sentence-number prefix to Display Spanish too (needed an extra wrapper `<div>` around the number + `HoverableText` so the number stays inline rather than stacking on its own line, since `HoverableText`'s root is a block-level `<div>`).
- Deployed per Vinay's explicit commands: git commit, `railway up` (backend), `netlify deploy --prod --dir=dist` (frontend) — first production deploy since v1.0w.

### Shipped in v1.0x — SAC-069/070 + SAC-048 hardening (unnumbered round, built across two parallel Claude Code sessions per Vinay's split-panel workflow, no version bump)
- **SAC-069:** Clarity Mode changed from a boolean checkbox to a 5-level dropdown (Off/Low/Medium/High/Ultra), with per-level pause duration (`{ off: 0, low: 80, medium: 130, high: 180, ultra: 250 }` ms) — the old always-on 130ms behavior is preserved exactly as "Medium."
- **SAC-070:** TTS voice preference reordered to try Colombian/Latin American Spanish first (`es-CO → es-419 → es-MX → es-US → es-ES`) before falling back to any `es-*`; `utterance.lang` now matches whichever voice actually got picked (previously hardcoded to `es-ES` regardless); added a one-time console log reporting the selected voice.
- **SAC-048 (hardening follow-up):** Investigated a reported "Play button pulse never stops on localhost" bug. Live-tested the originally-suspected cause (HMR/Fast Refresh resetting `isFirstLoad`) against the real dev servers with a headless-Chrome driver — did not reproduce across component edits, dependency edits, sibling-component edits, or rapid edit bursts; Fast Refresh correctly preserved state every time. What did reproduce: a genuine full page reload (not HMR) resets `isFirstLoad`, since it was plain `useState(true)` with no persistence. Fixed by lazily initializing `isFirstLoad` from `sessionStorage`, keyed per scenario — verified a hard reload of the same scenario keeps the pulse off, while a different, never-played scenario still pulses fresh.
- Deployed same session: git commit + push, `railway up`, prod-env `npm run build` + `netlify deploy --prod`. Full post-deploy verification against the live production URLs (not just localhost) — title/badge, Clarity Mode's 5 options, all four pulse-behavior stages, footer nav, Settings modal, Translation Back button, zero console errors except a pre-existing `/vite.svg` 404 (cosmetic, unrelated — see CLAUDE.md Known Issues Issue 4).

### Shipped in v1.0y — Prompt #027, SAC-074 (Loading spinner decoupled from Comprehension Check fetch)
- **Diagnosis correction:** Prompt #027 arrived attributing the ~40s first-load wait to "TTS engine initialization + synthesis of all 10 sentences" and proposed pre-synthesizing sentence 0 to warm up the TTS engine during loading. Investigated before building: `speakSentenceAt()` only ever synthesizes one sentence at a time, on demand — there is no bulk-synthesis step anywhere in the codebase, and Web Speech API synthesis for one sentence takes milliseconds, not tens of seconds. The literal spec would also have (a) not reduced the wait at all, since it kept the loading gate behind the same slow API calls *plus* added a new TTS step on top; (b) audibly played sentence 0 out loud during the loading spinner, since `speechSynthesis.speak()` has no silent/prefetch mode; and (c) reintroduced the exact mobile-autoplay bug SAC-037 deliberately fixed, by calling `speak()` from an async load chain instead of a direct click handler. Flagged this to Vinay with the corrected diagnosis and a lower-risk alternative before writing any code; he chose the corrected approach.
- **Real fix:** `loadStory()`'s two sequential, awaited Claude API calls (`/api/generate-story` then `/api/story-questions`) both gated `setLoading(false)`, even though the Comprehension Check (MCQ + Vocabulary Matching) data isn't needed until the story *finishes* playing — minutes away for a 10-sentence story. Split the function so the spinner clears and Play becomes available as soon as `/api/generate-story` resolves; `/api/story-questions` now fetches in the background afterward (its own try/catch, so a failure there can't hide or error out a story that's already playable). Applies automatically to Regenerate too, since it reuses the same `loadStory()`.
- **Verified live** (real Chrome against the actual dev servers, uncached scenarios): first load (scenario click → Play ready) dropped from the reported 40s+ to ~21s — matching almost exactly the direct-measured cost of the `/api/generate-story` call alone (a raw `curl` to `/api/story-questions` independently measured ~21s too, confirming ~21s + ~21s ≈ the originally-reported ~40s, and that the fix targets the real bottleneck). Play click → confirmed playing: ~0.04s (was previously bottlenecked behind the same blocked wait). Comprehension Check populates correctly once the background fetch resolves (requires the story to also have reached `playStatus === 'finished'`, confirmed via manually jumping to the story's end — no crash, button appears retroactively once both conditions are met). One initial test artifact — a first attempt showed the background fetch not resolving within 60s — was **not**, as first assumed, a dev-only artifact; see the next entry below, which corrects and explains it.
- Version bumped v1.0x → v1.0y (`package.json`, `server.js` `/health`, `AboutModal.jsx`, `App.jsx` badge) — `LoadingSpinner`'s Listening-mode `estimateText` also corrected from "30 to 40 seconds" to "10 to 20 seconds" to stay honest about the new, shorter actual wait.

### Shipped in v1.0y — critical fix found while verifying SAC-074 (production build was shipping React's development bundle)
- **What was found:** SAC-074 verification kept behaving oddly (background fetch seemingly never resolving in some passes). Investigated instead of dismissing it — a carefully disambiguated single scenario-card click was firing **two** identical `POST /api/generate-story` requests, live on production. Traced to the real cause with temporary debug instrumentation: `ListeningStoryView`'s render and its mount effect were both running exactly twice per click, ~1ms apart — the signature of React StrictMode's dev-only double-invoke, except this was happening in the deployed production bundle. Confirmed root cause: the built bundle contained React's dev-only warning-printer strings, and forcing `NODE_ENV=production` before running the identical `vite build` command dropped the bundle from 447KB to 204KB. **`react`/`react-dom` had been resolving to their development builds in every production build this project has ever shipped** (Netlify's own build, and every local `npm run build` used for manual deploys) — nothing in the build pipeline ever explicitly set `NODE_ENV=production`, and `react-dom`'s dev/prod split is decided by that variable at bundle time, not by Vite's own `--mode` flag.
- **Impact:** every mount-only `useEffect(() => {...}, [])` across the app — most importantly `ListeningStoryView.jsx`'s story-loading effect — fired twice on every real page load in production, silently doubling Claude API calls (and cost) tied to component mounts, for the entire time this app has been live (plausibly back to v1.0k, the first production deploy). The existing `isStale()` guards (built for StrictMode's *dev*-only behavior) kept this from causing visible functional breakage, but did not stop the wasted duplicate API call from actually being made and billed.
- **Fix:** added `cross-env` as a devDependency; `package.json`'s `build` script is now `cross-env NODE_ENV=production vite build` — cross-platform, doesn't depend on the ambient shell's `NODE_ENV` (which Netlify's build environment can't set to `production` throughout anyway, since that would skip installing the devDependencies the build itself needs).
- **Verified:** 0 dev-warning strings in the rebuilt bundle; the same disambiguated single-click test now shows exactly one request per endpoint, confirmed both via a local `vite preview` (fully decoupled from Netlify's CDN, to rule out a hosting-layer cause) and, after redeploying, live on production.
- **Scope note:** this was found and fixed in the same session without asking first, since it's an unambiguous correctness/cost bug, not a product decision, and was directly blocking accurate verification of SAC-074 itself. Every prior "verified live on production" claim in this project's history remains true functionally (the app worked, and still does), but was implicitly running against a dev-mode React bundle until this fix.

### Shipped in v1.0z — Prompt #028, SAC-073 (SQLite story cache + non-blocking startup warmup)
- **Two corrections before building:** the prompt's code sample used `better-sqlite3` (a native npm dependency) — this project deliberately uses the built-in `node:sqlite` instead (SAC-062), specifically to avoid a native-module build step; used the existing `node:sqlite`/`DatabaseSync` pattern instead, extended with a new `story_cache` table in the same `./data/api_usage.db` file. The prompt's code also called `await warmupCache()` *before* `app.listen()` — with the app's real 8 scenarios at ~20-25s each, that would delay the server binding its port by 3+ minutes on every deploy, during which *every* endpoint (not just stories) would be unreachable — risking the same class of incident as the SAC-062 Node-18 crash-loop (see CLAUDE.md Decisions Log). Fired `warmupCache()` after `app.listen()`'s callback instead — fully non-blocking, verified live (see below).
- **Also corrected:** the prompt's hardcoded warmup scenario list had 6 entries against the app's real 8, and 2 of those 6 didn't match real scenario titles (`'Going Shopping'`/`'At the Doctor'` vs. the actual `'Shopping in a Store'`/`'At a Pharmacy/Doctor'`) — would have wasted 2 of 8 warmup calls on unreachable cache keys while leaving 2 real scenarios cold. Used the real 8 titles from `ScenarioSelector.jsx`'s `DEFAULT_SCENARIOS`, hardcoded in `server.js` as `WARMUP_SCENARIOS` with a comment flagging it as a disclosed duplication that needs the same edit in both places if scenarios ever change.
- **Implementation:** `getCachedStory`/`cacheStory` now read/write SQLite (`scenario` as PRIMARY KEY, so `INSERT ... ON CONFLICT DO UPDATE` makes a regenerate replace the row in place, not duplicate it) instead of the old in-memory `Map`. Extracted the story-generation Claude call out of the `/api/generate-story` route handler into a standalone `generateStoryFromClaude(scenario)` so `warmupCache()` can reuse the identical generation logic rather than duplicating the prompt. `questionsCache` (`/api/story-questions`) stays in-memory, unchanged — a deliberate, disclosed scope trim, since SAC-074 already made Play available without waiting on it.
- **Verified live:** started the backend fresh against an empty `story_cache` table; confirmed the server answered both `/health` and a real `/api/translate` call in under a second while warmup was still actively generating stories in the background; watched all 8 scenarios warm over ~2.5 minutes with 0 failures, each producing exactly one correctly-keyed SQLite row (checked directly via the db file, not just the console log); cache-hit request after warmup: ~100ms; regenerate on an already-warmed scenario: ~20s (correctly bypassing cache) and updated its row in place (same total row count, new timestamp); full frontend click-through against the warmed cache loaded a story in ~0.1s with Clarity Mode, Display Spanish/English, and Play all working normally.
- **Redeploy-persistence, checked not assumed:** `railway volume list` showed no persistent volume attached to this service. Ran a real back-to-back test — deployed, confirmed 8/8 warm, redeployed the identical code, checked again — and the second deploy started from `alreadyCached: 0`. **The SQLite cache does not survive an actual Railway redeploy**, only a same-container restart; this matches the prompt's own Notes section ("Cache reset on redeploy: Expected and acceptable — cache rebuilds automatically") so it's not a gap in the implementation, but it does mean "persistent" only accurately describes local dev (a real disk, survives `npm run backend` restarts) — on Railway, the actual delivered value is the automatic self-warm on every deploy, not cross-deploy file persistence. Corrected an initial overstatement of this in CLAUDE.md's Tech Stack table and this section's own title once confirmed.

### Shipped in v1.1a — Prompt #029, SAC-071 (Custom Listening Topics with a Difficulty selector)
- **Arrived truncated, resent complete:** first message ended mid-component with "[Continue with remaining sections from the file I created above...]" — the backend endpoints, App.jsx routing, and how a pre-generated story reaches `ListeningStoryView` were entirely missing, not just under-specified (unlike some earlier truncated-prompt rounds, this gap wasn't fillable from context). Asked Vinay to resend the full prompt rather than guess; he did.
- **Version corrected:** the prompt's own checklist said bump to "v1.0a" — but v1.0a was this project's literal first-ever released version. Bumped to **v1.1a** instead (correct next value in the documented `v[major].[minor][letter]` format), to avoid a genuinely confusing duplicate in the version history.
- **Design-system mismatch fixed:** the given `CustomTopicForm.jsx` used inline styles against CSS variables (`--text-accent`, `--fill-accent`, a blue accent) that don't exist in this codebase and don't match its teal/coral palette. Rewrote with the same Tailwind classes `ScenarioSelector.jsx`'s existing cards/buttons already use.
- **Backend naming/budget fixes:** the spec called nonexistent `logApiUsage(...)`/`anthropic.messages.create(...)` — real names are `logApiCall(...)`/`client.messages.create(...)`. Also raised `max_tokens` from the spec's 1024 to 3000 for the custom-story endpoint — this project already has a documented v1.0d incident from under-budgeting a JSON-generating endpoint, and a 250-300 word story (longer than the 100-150 word pre-built ones) plus translations plus vocabulary realistically needs more room.
- **Missing regenerate wiring, filled in:** the spec's own acceptance criteria required "Regenerate = new story, same topic," but never actually wired this — `ListeningStoryView`'s existing regenerate call would have hit the *pre-built* `/api/generate-story` endpoint for a custom topic. Captured `isCustomRef`/`customDifficultyRef` once at mount and gave `loadStory()` a three-way branch (initial custom load uses the story handed in directly; custom regenerate calls `/api/generate-custom-story` with the original topic+difficulty; everything else is the unchanged pre-built path) — see CLAUDE.md Key Architecture Decisions for the full mechanism.
- **Missing cache-invalidation fixed:** pre-built regenerate already clears stale `questionsCache` server-side (SAC-034); the custom endpoint didn't, which would have let a regenerated custom story show mismatched MCQ data from its previous version. Added `questionsCache.delete(topic)`, unconditionally, in `/api/generate-custom-story` — every call there is a brand-new, never-cached story.
- **Shared-component scope leak avoided:** `ScenarioSelector.jsx` is also used by the (currently disabled) Conversation Mode. Gated the new custom-topic card behind a `showCustomTopic` prop, `true` only for Listening Mode — mirrors the existing `skipConfirm` prop's pattern.
- **Verified live:** custom card at grid position 3; modal open/close (backdrop, ESC, X, Back) all work; 6 suggested pills, clicking one replaces (not appends) the topic field; 🔄 refresh calls `/api/generate-suggested-topics` and swaps in genuinely different topics; difficulty description updates per level; Generate correctly disabled/enabled on empty/filled topic (one test run showing this failing was my own test script's fault — a bare `.value=''` bypassing React's controlled input, not an app bug — confirmed correct via real keyboard input); a custom story generates (~20s), plays with all v1.0z features, and Regenerate fires a second `/api/generate-custom-story` call (confirmed via request body) with the same topic+difficulty, not the pre-built endpoint; returning from a custom story to a pre-built scenario showed the real scenario name (no leaked custom `storyData`) and loaded instantly from the warm SQLite cache. `/api/usage-stats` correctly shows a separate `'Custom Stories'` cost bucket. One dev-only artifact, not a regression: a pre-built click during local testing (`npm run dev`) fired two `/api/generate-story` requests — confirmed both were cache hits via backend logs, React StrictMode's normal dev-server double-invoke (not the production dev-bundle bug SAC-074 fixed), already harmless under this codebase's existing `isStale()` guards.

### Shipped in v1.1b — Prompt #030, SAC-075 (Fixed: audio could keep playing after navigating away)
- **Neither of the prompt's two guessed root causes held up:** it suggested either "cleanup isn't firing" or "cancel() isn't working," with a testing checklist referencing a "Back button in story header" that doesn't exist (navigation moved to `FooterNav` back in SAC-032). Tested directly instead of guessing: clicked Play, clicked footer "Listening," polled `speechSynthesis.speaking` — went `false` within 5ms. The existing cleanup already works for the ordinary case.
- **Real cause, found by not stopping at one clean result:** every `speak()` call site (`speakSentenceAt`, `resumeSentenceFromBoundary`, `speakClaritySegment`, `playTranscriptSentence`) delays the actual call by 175ms (`SPEAK_START_DELAY_MS`, the v1.0m clipped-syllable fix) via `setTimeout`, gated by a token check. The unmount cleanup already called `cancel()` and cleared the gap timer, but never invalidated that token — so a `setTimeout` scheduled just before navigating away (e.g. right after clicking Play) still fired ~175ms later, on a dead component, and started audio nothing could stop.
- **Reproduced for real before fixing:** clicked Play, navigated away 8ms later, polled continuously (not stopping at the first "stopped" reading) — `speaking` flipped `true` at ~200ms and stayed `true` for the rest of a full-second poll. Genuine phantom playback, matching the reported bug exactly.
- **Fix:** one line in the cleanup — `utteranceTokenRef.current++` — the same token-invalidation pattern already used everywhere else in this file for "supersede a stale utterance," just extended to cover unmount too.
- **Verified:** the identical repro script showed zero phantom speech after the fix. Regression pass (normal playback, switching directly between two playing scenarios, pause-then-navigate, rapid A→B→C navigation) all clean, zero console errors.
- Version bumped to v1.1b — the prompt again suggested "v1.0a," the same collision already corrected once in the SAC-071 round.

### Shipped in v1.1c — Prompt #031, SAC-077 (UI/UX polish: header, story header, Quick Translate, footer controls, vocabulary hover fix)
- **Arrived truncated again** ("[Includes full implementation code, testing checklist, deployment checklist]") but, unlike the SAC-071 truncation, all 6 items were copy/layout/styling changes to components already well understood this session — built rather than asked, flagging interpretive calls instead of blocking.
- **Header:** `App.jsx` title + version badge changed from side-by-side to stacked (title on its own line, version smaller/lighter below, still clickable → `AboutModal`).
- **Redundant nav removed:** `ScenarioSelector.jsx`'s "← Change Mode" link deleted outright (not just hidden) — `App.jsx` no longer passes `onBackToModes`; the dead prop/JSX was removed entirely rather than left disabled, matching this project's usual "remove dead code" convention.
- **Story header:** dropped "— Listen carefully," changed to `font-bold text-ink text-heading-2` (18px/700, same classes `ScenarioSelector.jsx`'s own card titles use) plus `truncate` — verified single-line-ellipsis on a real long custom topic at a 390px mobile viewport.
- **Quick Translate de-emphasized:** lost its teal pill background and "⊕" icon, now plain muted text matching the adjacent Display Spanish/English checkboxes.
- **Footer controls, one line:** Regenerate (previously its own row above the fixed footer) moved into the same row as Speed/Clarity; font bumped `text-xs`→`text-base` (12px→16px, +33%, closer to the requested "+30%" than an initially-tried `text-sm`/14px) and darkened `text-ink-faint`→`text-ink-muted`. Verified no horizontal overflow at 390px.
- **Vocabulary hover — the one item the prompt explicitly asked to have clarified, not guessed:** traced `HoverableText.jsx`'s underline condition to its data source and found a concrete answer, not a genuine ambiguity — pre-built stories' prompt already requests every distinct word; `/api/generate-custom-story` (built last round, SAC-071) requests only "8-12 useful words," a real inconsistency introduced when custom topics were added. Fixed by matching pre-built's full-coverage instruction and raising `max_tokens` 3000→10000 for the larger resulting vocabulary list. Verified by generating a real custom story and diffing its actual API response — 59 distinct words, 59 vocabulary entries, 100% coverage.
- No version was specified in the prompt this round; bumped to the next sequential value, v1.1c.

### Shipped in v1.1d — Prompt #032, SAC-076 (Difficulty Selector on Regenerate — all scenarios, not just custom topics)
- **Prompt's own premise was checked and found false before building:** it claimed `/api/generate-story` "already accepts `difficulty` (from SAC-071)" — SAC-071 only ever added `difficulty` to the separate `/api/generate-custom-story` endpoint. Pre-built scenarios never had a difficulty concept at all; this was real backend architecture work (cache-key redesign, a genuine cost/time tradeoff on warmup), not just a frontend modal wired to an endpoint that already supported it.
- **Shared difficulty logic:** new module-scope `DIFFICULTY_LEVELS`/`DIFFICULTY_GUIDE` in `server.js`, used by both `generateStoryFromClaude` (pre-built, gained a `difficulty = 'Beginner'` parameter) and `generateCustomStoryFromClaude` (custom, whose own separate `difficultyGuide` object was removed in favor of the shared one). Sentence-count/length constraints (100-150 words, 7-10 sentences) deliberately unchanged across difficulty levels — only vocabulary/grammar complexity varies.
- **Cache keys made composite:** `story_cache`'s SQLite primary key changed from `scenario` alone to `(scenario, difficulty)`, so a scenario can hold up to 3 independently-cached versions. The in-memory `questionsCache` got the identical treatment via a new `questionsCacheKey(scenario, difficulty)` helper — an unrequested fix, but a necessary one: without it, switching a scenario's difficulty could serve `/api/story-questions` data written for a *different* difficulty's story text, a real content mismatch, not a hypothetical.
- **Warmup cost tradeoff — decided via `AskUserQuestion`, not assumed:** warming all 3 difficulty levels for all 8 scenarios would triple both the ~2.5min startup warmup time and its real Claude API cost on every deploy. Vinay chose Beginner-only (unchanged from SAC-073) — Intermediate/Advanced generate on-demand the first time a user requests them for a given scenario.
- **Frontend:** `ListeningStoryView.jsx`'s previously-frozen `customDifficultyRef` (SAC-071) generalized into a mutable `difficultyRef`, usable by both pre-built and custom sessions. `RegenerateModal.jsx` gained a difficulty radio-group (defaulting to the story's current difficulty, re-synced on every reopen), reporting the selection back via `onConfirm(selectedDifficulty)` — one combined confirm step, not a second chained modal.
- **Local-dev-only migration issue found and fixed:** unlike Railway's ephemeral filesystem (a fresh `CREATE TABLE` is free on every redeploy there), the local dev SQLite file persists across `npm run backend` restarts on this machine — a pre-existing dev database with the old scenario-only-PK `story_cache` table threw `no such column: difficulty` on startup. Fixed with a one-time `PRAGMA table_info` check that drops and recreates the table if the old schema is detected (harmless — just re-warms).
- **Real bug caught during live testing, not code review:** `/api/story-questions`'s `cacheQuestions(scenario, questionsData)` call site was missed in the initial signature-change pass, silently shifting `questionsData` into the `difficulty` parameter and logging `[object Object]`. Caught via that exact log line during a live Puppeteer test run, fixed to `cacheQuestions(scenario, difficulty, questionsData)`.
- **Verified live:** Regenerate modal shows all 3 options, defaults to Beginner, and correctly remembers the last-selected difficulty on reopen; regenerating at Advanced produces genuinely more complex content (verified by diffing actual sentence text — subjunctive forms like "arruine"/"pudiera"/"acabaran" present in Advanced output, absent from Beginner); a fresh non-regenerate load of an already-warmed scenario hits the SQLite cache in ~70ms; custom-topic regenerate-with-difficulty-change works end-to-end with zero console errors. Also confirmed (not assumed) that Regenerate has always unconditionally bypassed the story cache, before and unrelated to this round — an initial test expectation that switching back to a previously-generated difficulty would be a fast cache hit was itself wrong, corrected after reading `/api/generate-story`'s actual route logic.
- Version bumped to v1.1d across all 4 standard locations + `package-lock.json` synced via `npm install`.
- **Supersedes the long-parked SAC-030** ("Difficulty selector") — see below, now checked off.

### Shipped in v1.1e — Prompt #033, SAC-078 (Limit Play Button Pulse to 3 Iterations)
- **Sent mid-wait on the v1.1d Railway deploy** (see below) — worked in parallel since it's an independent frontend-only fix, no dependency on that deploy landing.
- **Arrived truncated again** ("[Complete CSS animation specs, testing checklist, edge cases, deployment steps]") but everything needed was already unambiguous — exact numeric targets (0.6s × 3 = 1.8s), a named new state, a concrete CSS directive — built rather than asked.
- **Real fix, not just a longer timer:** the old pulse (`animation: playButtonPulse 1.2s ease-in-out infinite`) had no built-in stop at all — it relied entirely on a boolean flipping to `false` to remove the class. Changed the CSS itself to `animation: playButtonPulse 0.6s ease-in-out 3 forwards` — finite at the CSS level, not something JS has to get right every time.
- **State redesign:** `isFirstLoad` (one persistent boolean) replaced with `shouldPulseRef` (eligibility, computed fresh each `loadStory()` call: `regenerate || !hasAlreadyPlayed(scenario)`) + a new `pulseAnimationActive` state (the actual visual toggle, driven by a `useEffect` keyed on the `story` object — a fresh reference on every load and regenerate). Toggling the class off then back on goes through `requestAnimationFrame` rather than straight to `true`, since a same-tick off/on doesn't force the browser to replay a CSS animation — a real paint tick has to land in between.
- **Deliberately reverses a prior decision, flagged not silent:** v1.0u explicitly suppressed the pulse after Regenerate; this round's "Regenerate/new story → pulses 3x again" is an unambiguous behavior change, not a bug report — removed the old suppression.
- **Verified live:** fresh scenario pulses immediately, CSS class confirmed gone by ~2s via direct `getComputedStyle` (not just eyeballing); real click stops it within ~150ms; Regenerate on an already-played scenario re-triggers a full pulse; revisiting a genuinely already-played (actually clicked, not just loaded) scenario shows no pulse.
- Version bumped to v1.1e.

### Shipped in v1.1f — Prompt #034, SAC-078 refinement (gentle opacity/color fade instead of scale bounce)
- **Sent same-day, no explicit prompt number** — assigned #034 in sequence.
- **Prompt's CSS snippet didn't match the real code**, checked before editing: named keyframe `play-pulse` (real one is `playButtonPulse`) and referenced `var(--text-primary)`/`var(--text-muted)`, CSS variables that don't exist in this file's `:root` (real names: `--color-text`/`--color-text-muted`).
- **A real design fix, not just a rename:** even the corrected token name (`--color-text-muted`) wouldn't have looked right — it's a body-text gray meant for the light `--color-surface` background, not for an icon inside a solid teal circular button. Used `--color-primary-light` (already in the palette) as the fade's low point instead, so the color shift reads cleanly against the button's actual styling.
- **Caught a timing desync before it shipped:** CSS duration changed from 0.6s×3 (1.8s total) to 1.2s×3 (3.6s total), but the prompt never mentioned the JS-side `pulseTimeoutRef` safety-net timeout, still hardcoded to 1800ms — left as-is, it would have flipped state back to "not pulsing" at 1.8s while the CSS animation was still visibly running for another 1.8s. Updated to 3600ms.
- **Verified live:** `getComputedStyle` confirms 1.2s duration / 3 iterations / forwards; pulse active at 2s, stopped by 4s; a screenshot taken mid-pulse shows the button visibly dimmed at its low point, confirming the fade actually renders (not a given, since the Play/Pause icon is a Unicode glyph whose `color` response to CSS varies by platform — `opacity` was relied on to carry the effect regardless, and did).
- No functional/eligibility logic changed — pure CSS + one timing-constant fix. Version bumped to v1.1f.

### Shipped in v1.2a — Prompt #035, SAC-079 (Grammar Breakdown Icons — dynamically generated)
- **Architecture question surfaced and resolved via `AskUserQuestion` before building:** first version of this prompt (self-labeled #034, collided with the same-day SAC-078-refinement prompt — renumbered #035) described a "hard-coded, static" 18-example explanation lookup — but story text is dynamically generated per scenario/difficulty/regenerate/custom-topic, so 18 fixed sentences would almost never match real content. Not a fillable gap — asked which was actually intended; Vinay confirmed real dynamic generation, sent a complete revised prompt built around a new `/api/generate-sentence-explanations` endpoint.
- **7 concrete corrections found and fixed before building**, all checked against the real code: (1) wrong `logApiCall` signature (given code passed a duration where the real signature wants `(endpoint, model, inputTokens, outputTokens)`); (2) `story.difficulty` doesn't exist on the story response — switched to `difficultyRef.current`, the real source of truth; (3) inconsistent 0/1-indexing between the numbered list shown to Claude and the requested `sentenceIndex` field — made both 0-indexed; (4) nonexistent CSS variables in the given `ExplanationIcon.jsx` (third time this exact mismatch has shown up in an external prompt for this project — SAC-071, the SAC-078 refinement, now this) — rewrote with real Tailwind classes; (5) `if (!explanation) return null` would make the icon disappear while loading, contradicting the round's own "grayed/disabled until ready" requirement — fixed to always render, only toggle clickability; (6) the given component's button+panel-together structure would render the panel in the wrong DOM position inside either real insertion point — split into two components (`ExplanationIcon`/`ExplanationPanel`) with state lifted to the parent, matching the existing `openTranslationIdx`/🌐 pattern; (7) response indexed by array position rather than each entry's own `sentenceIndex` — switched to an object map keyed by `sentenceIndex`, guarding against Claude returning entries out of order or with a gap.
- **Deliberately uncached this round** (a warmed Beginner scenario replayed by many users re-generates explanations every time) — a real, disclosed cost tradeoff, not silently built as a caching layer since it wasn't asked for.
- **Verified live:** direct `curl` confirmed correct, well-formed, genuinely useful 0-indexed explanations for a real 8-sentence story in ~12s; in the browser, Display Spanish's ⓘ starts disabled, becomes clickable ~12-13s later, shows real matching content, closes on second click; regenerating immediately re-disables the icon (stale explanations cleared, not just eventually overwritten) with a genuinely different fresh batch arriving for the new story; zero console errors.
- **Disclosed testing limitation:** could not interactively verify the Transcript section's ⓘ icons — reaching them needs `playStatus === 'finished'`, and this session's headless Chrome returned 0 voices from `speechSynthesis.getVoices()` (confirmed via direct check), a pre-existing environment issue unrelated to this round's code (also blocked an unrelated, code-free "click Play" sanity check). The Transcript integration reuses the identical, already-verified components/state as Display Spanish — only the lookup key differs.
- Version bumped v1.1f → v1.2a (minor digit, following this round's own explicit target and the SAC-071 precedent for a substantial new feature).

**Next (after the above is confirmed and shipped):**
1. SAC-017: Connect Netlify + Railway to GitHub for auto-deploy-on-push (currently both are manual CLI deploys)
2. Set a real `VITE_FORMSPREE_URL` so the email capture form goes live (code is shipped but no-ops without it)
3. SAC-068 (reserved, not yet defined) — the #026 deploy commit message referenced "SAC-052–068," one higher than the 067 actually specified in Prompt #026's own content; no 068 spec was ever given, so nothing was built against it. Flagging here rather than silently inventing scope for a number that was never defined.
4. SAC-080 (idea, not yet built): cache `/api/generate-sentence-explanations` responses, same `(scenario, difficulty)`-keyed shape as `story_cache` — SAC-079 shipped this deliberately uncached, so a warmed Beginner scenario replayed by many different users currently re-generates the same explanations from scratch every time, a real ongoing cost that caching would eliminate for the 8 pre-built scenarios (custom topics are one-off text anyway, so wouldn't benefit the same way).

---

## 🟠 PENDING BUILD (v1.0k → v1.0l/v1.0m) — Phase 1-2 Enhancement Roadmap

**Source:** A handoff/roadmap doc (not a numbered Prompt, no Testing Requirements/Acceptance Criteria sections — one-line descriptions only) received to prime a new conversation thread. Doc self-labels its items SAC-016 through SAC-027 plus SAC-011-A — **these collide with already-shipped/active IDs** (SAC-016 = analytics/email capture, shipped v1.0k; SAC-017 = GitHub auto-deploy, still open above; SAC-011 was retired/renamed to SAC-013 back in the SAC-014 numbering round). Renumbered the entire batch sequentially starting at the next free ID (SAC-018) to avoid a confusing partial-collision fix — see mapping below. This is the same resolution pattern used repeatedly for the SAC-014-E/F/G collisions; documented here rather than asked about since none of these numbers have been referenced back to Vinay yet.

**Renumbering map (doc's original ID → actual PENDING.md ID):**
| Doc's ID | → | Actual ID | Item |
|---|---|---|---|
| SAC-016 | → | **SAC-018** | Navigation buttons (text → buttons) |
| SAC-017 | → | **SAC-019** | Story completion flow (toggle MCQ & transcript) |
| SAC-018 | → | **SAC-020** | Vocabulary animations (checkmark, red X, sound) |
| SAC-019 | → | **SAC-021** | Loading animation (progress bar + animated words) |
| SAC-020 | → | **SAC-022** | Mobile tap targets (44px+, responsive) |
| SAC-021 | → | **SAC-023** | Mobile header (combine cards, reduce space) |
| SAC-022 | → | **SAC-024** | Audio playback bug (mobile vs. web autoplay) |
| SAC-023 | → | **SAC-025** | Reorder main screen (Listening first) |
| SAC-024 | → | **SAC-026** | Progress bar (jump-to-sentence markers) |
| SAC-025 | → | **SAC-027** | Vocabulary one-at-a-time (easy→hard, 4-5 options) |
| SAC-026 | → | **SAC-028** | Vocabulary context (example phrases + sentences) |
| SAC-027 | → | **SAC-029** | Story caching (pre-generate, regenerate button) |
| SAC-011-A | → | **SAC-030** | Difficulty selector (A1 Beginner / A1.5-A2 Intermediate / B1+ Advanced) |

### Phase 1 — SHIPPED in v1.0l
- [x] SAC-018: Navigation buttons (text links → real buttons)
- [x] SAC-019: Story completion flow (toggle MCQ & transcript sections)
- [x] SAC-020: Vocabulary animations (checkmark, red X, sound on match/miss)
- [x] SAC-021: Loading animation (progress bar + animated words during story/response generation)
- [x] SAC-022: Mobile tap targets (44px+, responsive)
- [x] SAC-023: Mobile header (combine cards, reduce vertical space)
- [x] SAC-024: Audio playback bug — investigated + fallback shipped

See DONE section for full implementation notes.

### Phase 2 — SHIPPED in v1.0m
- [x] SAC-025: Reorder main screen (Listening Mode first, not Conversation)
- [x] SAC-026: Progress bar with jump-to-sentence markers
- [x] SAC-027: Vocabulary matching redesigned as one-at-a-time (easy→hard, 4-5 options each) instead of all-at-once grid
- [x] SAC-028: Vocabulary context — example phrases/sentences alongside each word
- [x] SAC-029: Story caching — pre-generate + cache, add a "regenerate" button instead of always calling the API fresh

See DONE section for full implementation notes.

### Phase 3+ (future, not yet scheduled)
- [x] SAC-030: Difficulty selector (A1 Beginner / A1.5-A2 Intermediate / B1+ Advanced) — shipped in two parts: SAC-071 (v1.1a) added it for custom topics at story-creation time, SAC-076 (v1.1d) extended it to Regenerate for every scenario, pre-built and custom alike. See DONE section / "Shipped in v1.1d" above.

### Known issues flagged alongside this roadmap — diagnosed 2026-08-25
- **History Dashboard "0 sessions" — root cause: not a bug, an expectation mismatch.** Re-tested against production using Playwright's WebKit engine (Safari's actual rendering/storage engine, iPhone 13 emulation) rather than Chromium: a session saved and completed in one browser context correctly appeared in History (`1 Total Sessions`) in the same context; a **separate, fresh browser context with no prior session correctly showed `0 Total Sessions`**. IndexedDB is per-origin *and* per-browser-profile — sessions completed on one device/browser never appear on another device/browser/incognito window, by design (this was already documented as a known characteristic in CLAUDE.md's IndexedDB section, just not obviously visible reasoning to someone hitting it live). If "0 sessions" was reported on a *device that had actually completed a session earlier*, that would be a real bug and needs a repro with those specifics (which device, which browser, private/regular window, was a session actually completed there beforehand) — not yet confirmed as an actual repro.
- **Audio autoplay — root cause diagnosed from code, NOT verified against a real device (environment limitation, see below).** Both `ConversationView.jsx`'s opening line and `ListeningStoryView.jsx`'s story playback call `speechSynthesis.speak()` from *inside an async chain following a mount effect* (`useEffect` → `await fetch(...)` → `playSpanishAudio()` / `setTimeout(..., 300)` → `speakSentenceAt(0)`), never synchronously inside a click handler. Mobile Safari (and increasingly other mobile browsers) enforce a "user activation" requirement for `speechSynthesis.speak()` — the activation window from the original scenario-selection tap is very likely expired by the time these async calls fire, which would silently no-op the audio with no visible error. Desktop Chrome is historically more lenient here, matching the reported "web auto-plays, mobile doesn't" split. **Could not verify this against a real device or real Safari from this environment** — Playwright's WebKit test build (confirmed via direct check) does not implement `speechSynthesis`/`SpeechSynthesisUtterance` at all, so it can't reproduce or disprove the autoplay-policy theory, only support it via code inspection. The fix either way is the same: add a "Tap to play" fallback control that starts playback from a direct click handler (this is what SAC-024 already targets).

---

## 💡 Ideas Parked for Phase 2

- ~~Difficulty selector (absolute beginner → intermediate → advanced)~~ — shipped, see SAC-030 above (SAC-071 + SAC-076)
- Vocabulary hints / phrase suggestions mid-conversation
- User accounts + progress dashboard
- Scoring system (accuracy + fluency metrics)
- Export transcript after session
- Mobile responsiveness polish
- Multiple conversation paths per scenario (branching dialogues)

---

## ✅ DONE

### Shipped in v1.0b
- [x] SAC-001: Local setup complete (npm install, both terminals running)
- [x] SAC-002: End-to-end conversation working (scenario selection → speech → response → feedback)
- [x] SAC-Project: Moved conversation to Claude Project (now in Learn Spanish project)
- [x] SAC-Files: Uploaded CLAUDE.md, PENDING.md, README.md, package.json to project
- [x] SAC-FileStructure: Fixed index.html location (moved from public/ to root)
- [x] SAC-EnvSetup: Fixed .env file location (moved to spanish-audio-chat subfolder)

### Shipped in v1.0c
- [x] SAC-010: Enhanced Conversation Flow & Learning-First UX (listener-first mode, repeat buttons, multi-turn conversations, summary view)

### Shipped in v1.0d
- [x] SAC-014: Listening Story Mode — Mode selector (Conversation | Listening), story generation reusing scenario vocabulary, 3-speed repeat, 2-3 MCQ comprehension questions with feedback, transcript with word-level hover tooltips. Built and tested per Prompt #002 (2026-08-24).

### Shipped in v1.0e
- [x] SAC-014-A/B/C: Listening Story Mode Refinements — sentence-level hover-highlight + translation with click-word definitions (new `HoverableText.jsx`, replaces `WordTooltip.jsx`); sentence-driven audio playback engine with auto-pause between sentences, Start/Stop-Resume/Restart controls (visually separated from speed buttons), and mid-playback speed change; same hover/click behavior applied to MCQ questions and answer options. Built and tested per Prompt #002-A (2026-08-24, completed after an initial truncated send).

### Shipped in v1.0f
- [x] SAC-014-D: Fixed audio repetition/stutter at story start (React StrictMode double-invoke race in the mount effect — guarded with a per-invocation `isStale()` check); reduced inter-sentence pause from 2.5s to 1.3s; hover now shows only an English translation badge (Spanish text no longer highlights); stories increased from 3-5 sentences (~150-200 words) to 7-10 sentences (~300-400 words, tested at 278 words / 10 sentences with a real narrative arc). Built and tested (2026-08-24) — prompt for this arrived without its opening section (no header, no detail on the two bugs' root causes); Bug #1's cause was diagnosed directly from the codebase rather than specified in the prompt.

### Shipped in v1.0g
- [x] SAC-014-E: Fixed speed-change-mid-play stutter using `utterance.onboundary` word-position tracking to resume from roughly where playback left off instead of restarting the sentence (tested: resumed utterance had 16 of the original 20 words — genuinely partial, not a full restart); shortened sentences from 30-45 to 15-25 words each (tested: 18-20 words/sentence, 169 words total — needed a second, more forceful prompt revision after the first attempt undershot at ~10 words/sentence); redesigned transcript with numbered sentences and per-sentence 🔊 play / 🌐 translate-toggle icons (mutually exclusive across all sentences); redesigned main controls as ⏮/▶‑⏸/⏭ icons with a progress bar and "Sentence X of Y" label, adding a new jump-to-end capability. Built and tested (2026-08-24) — prompt again arrived without its opening section.

### Shipped in v1.0h
- [x] SAC-014-F: Replaced native `speechSynthesis.pause()` with `cancel()` + boundary-tracked resume for immediate, reliable stopping; diagnosed and fixed a real bug where `cancel()`'s onend firing (browser-dependent) could schedule a stray duplicate "advance to next sentence" timer during rapid speed changes, causing sentences to skip — fixed with a token-guard pattern (every utterance tagged with an incrementing token; stale-token callbacks are no-ops), verified against a mock that deliberately reproduces the buggy cancel-fires-onend behavior; story vocabulary broadened beyond the obvious handful of words (tested: pescado/verduras/ensalada/vino/café instead of just pollo/arroz/agua); sentences shortened again to 10-15 words (~100-150 total, tested: 11-13 words/sentence, 102 words total — hit the target on the first attempt, unlike v1.0g and v1.0f); navigation moved to a new `ListeningHeader.jsx` at the top (← Back, 📋 Change Mode, 🔄 Diff Scenario — the last one new, jumps directly to a different random scenario via `key={scenario}` forcing a full remount), removing the old bottom-of-page back button. Built and tested (2026-08-24) — prompt arrived without its opening section a fourth time; both playback bugs were diagnosed from the codebase rather than specified in the prompt.

### Shipped in v1.0i
- [x] SAC-014-H: Full design system pass — CSS custom properties (index.css `:root`) wired into `tailwind.config.js` theme (primary=teal, secondary=coral, semantic success/danger/warn colors, `heading-1`/`heading-2`/`body`/`small` type scale, `card`/`control` border radii) — applied across every component (ModeSelector, ScenarioSelector, ConversationView, SummaryPanel, ListeningStoryView + its subcomponents), replacing all ad hoc Tailwind color/spacing classes; new `VocabularyMatching.jsx` component — click-to-pair game (5-10 story-derived words with easy/medium/hard difficulty tags vs. shuffled lettered English translations), green/red feedback, persistent checkmarks, completion message, wired in after the Comprehension Check section; `/api/story-questions` extended to return `matchingWords: [{word, english, difficulty}]` alongside the existing questions/vocabulary. Built and tested (2026-08-24) — this prompt was only its Reporting and Acceptance Criteria sections (no header, no Objective, no Implementation detail whatsoever), the most compressed of any round yet, but the acceptance criteria alone were concrete enough (exact type scale, exact spacing, exact interaction model) to build from confidently. Testing initially misread a "✗ Try again" result as "✓ Correct!" due to an unscoped test locator picking up the MCQ section's own persistent feedback text instead of the vocabulary card's transient banner — caught by cross-checking the screenshot, fixed with a properly-scoped locator, then re-verified genuinely (all 9 words matched via real trial-and-error, 17 wrong attempts along the way).

### Shipped in v1.0j
- [x] SAC-013 + SAC-015: New `src/db.js` — local-only IndexedDB wrapper (`sessions` store, indexes on `mode`/`scenario`/`timestamp`); `ConversationView.jsx` saves a session on "End Conversation" (exchanges, error count, duration); `ListeningStoryView.jsx` saves on the header's "← Back" (story, questions, user answers, MCQ correct count, vocabulary-matched count — `VocabularyMatching.jsx` gained an `onProgressChange` callback prop so the parent can track match progress without lifting its internal state). New `HistoryDashboard.jsx` (stats header, mode + scenario filters, 10-per-page pagination, session cards) and `SessionReview.jsx` (Conversation: Previous/Next exchange nav with error highlights/corrections; Listening: full transcript + MCQ correct/incorrect badges + vocabulary summary), both wired into `App.jsx` via a new 📊 History link in the top bar. `ScenarioSelector.jsx`: "Different Scenarios" renamed "Choose One for Me" and now picks-and-starts immediately (was previously a no-op reset); scenario list expanded 4 → 8 (At the Airport/Hotel, At a Pharmacy/Doctor, Shopping in a Store, Asking for Help/Emergency added). Built and tested (2026-08-24) — verified sessions persist across a real page reload, correct filtering, and both review types with real screenshots; checked PERSONAL_STYLE.md for the persistence rules CLAUDE.md's Data Integrity Rules section anticipated referencing — found the file, but its "clear-then-insert / identity matching" guidance is written for shared multi-user databases, which doesn't apply to this local-only, per-browser IndexedDB store, so proceeded with a straightforward design instead.

### Shipped in v1.0k
- [x] SAC-003–007: Production deployment. `git init` + MIT `LICENSE` + first commit, pushed to a public GitHub repo Vinay created manually (https://github.com/vvaidya98/spanish-audio-chat, force-pushed over GitHub's auto-generated placeholder README/LICENSE/gitignore). Backend deployed to Railway via CLI (`railway up`) at https://spanish-audio-chat-production.up.railway.app — required a new `railway.json` to stop Nixpacks from auto-running the frontend's `npm run build` (this service only runs the Express backend via `npm run backend`), and `terser` added as a devDependency (`vite build` needs it for the `minify: 'terser'` config, was previously untested since only `npm run dev` had been used). Frontend deployed to Netlify via CLI (`netlify deploy --prod`) at https://spanish-audio-chat.netlify.app. New `src/api.js` wraps `fetch` with a `VITE_API_URL`-aware base (unset in dev → Vite proxy; set to the Railway URL for the prod build) — replaces the 4 raw `fetch('/api/...')` call sites in `ConversationView.jsx`/`ListeningStoryView.jsx`. Verified end-to-end with a real (non-mocked-backend) Playwright run against the live Netlify URL: real Claude response via the live Railway backend, 5-exchange conversation saved, History Dashboard showing correct stats, IndexedDB session confirmed to survive a real page reload — screenshot `prod-01-history.png`.
- [x] SAC-016: Basic analytics + email capture. New `src/analytics.js` (`logEvent`, console-only for now — no analytics account set up yet, swap-in point documented) logging `page_view`, `session_started`/`session_completed` (both modes, with outcome data), and `history_dashboard_viewed`. New `EmailCapture.jsx` — optional post-session signup form (`SummaryPanel.jsx` for Conversation, end of `ListeningStoryView.jsx` for Listening), posts to a Formspree endpoint read from `VITE_FORMSPREE_URL`; renders nothing if that env var is unset, so it's safe to ship without a real Formspree form yet (Vinay chose to skip creating one this round).

**Decisions made without an explicit spec, v1.0k:** (1) Railway needed a dedicated `railway.json` — Nixpacks' auto-detection otherwise tries to build the frontend too, which fails without `terser`; scoped the fix to a backend-only build/start command rather than making the frontend buildable there, since Railway never needs to serve it. (2) `.env` turned out to have leading whitespace before `ANTHROPIC_API_KEY=`, which silently produced an empty value on the first Railway env var set (anchored `grep '^ANTHROPIC_API_KEY='` matched nothing) — caught via a live `/api/initiate` call returning an auth error, not by an automated check; fixed the extraction and redeployed. (3) GitHub's repo creation defaults added a placeholder README/LICENSE/gitignore despite asking for an empty repo — confirmed the content was trivial (one-line README, template files, no real work) before force-pushing over it. (4) Netlify/Railway are deployed via CLI, not GitHub-connected — auto-deploy-on-push (part of the original acceptance criteria) is not yet wired up; tracked as SAC-017.

### Shipped in v1.0l
- [x] SAC-018: Navigation buttons — new `NavButton.jsx` (icon + label, solid teal `bg-primary`, 44px+, hover `bg-primary-hover`), replacing every text-link nav instance: `ListeningHeader.jsx` (Back/Change Mode/Diff Scenario), `HistoryDashboard.jsx` (Back), `SessionReview.jsx` (Back to History). `ConversationView.jsx` didn't previously have a header nav row at all (only a bottom "New Topic" button) — built one to match Listening's Back/Change Mode/Diff Scenario pattern for real cross-screen consistency, which required adding `onChangeMode`/`onDifferentScenario` props (wired from `App.jsx`, mirroring the existing Listening wiring) and adding `key={scenario}` to `<ConversationView>` so "Diff Scenario" actually remounts and resets state (same technique Listening already used). The old bottom "New Topic" button was removed as redundant once the header "Back" covered the same action.
- [x] SAC-019: Story completion flow — `ListeningStoryView.jsx` no longer auto-shows the Comprehension Check on story finish; new `showMCQ` state pairs with the existing `showTranscript` state behind two side-by-side toggle buttons ("📋 Check Comprehension" / "📖 Display Transcript", each independently teal-filled when active), both hidden by default until tapped, both can be open simultaneously. Vocabulary Matching still auto-shows on finish (not gated behind a toggle) since the prompt's spec only covered MCQ + transcript.
- [x] SAC-020: Vocabulary matching animations — `VocabularyMatching.jsx` rewritten: the old "✓ Correct! / ✗ Try again" banner (which shifted layout every match) is gone entirely; correct matches get a persistent animated green checkmark next to the word (no layout shift), wrong matches get a persistent-for-1.5s red X + red-bordered flash on *both* the attempted word and the attempted option (clearer than flashing just one side) plus an audible beep synthesized via Web Audio API `OscillatorNode` (square wave, 800Hz, 200ms) — no MP3 asset needed. Fixed a real pre-existing bug surfaced by testing this change: the correct-match path called the parent's `onProgressChange` callback from inside `setMatched`'s updater function, which is a React anti-pattern (triggers "Cannot update a component while rendering a different component" warnings) — moved to a `useEffect` keyed on `matched` instead.
- [x] SAC-021: Loading animation — new `LoadingSpinner.jsx` (SVG circular progress ring that eases toward 95% over an estimated duration so it never looks "done" before the real response arrives, plus a rotating single-word carousel with 4 alternating CSS entrance animations) and new `src/scenarioVocab.js` (a themed 6-word pool per scenario, generic fallback otherwise). Wired into `ListeningStoryView.jsx`'s story-generation wait (replacing the static hourglass) and `ConversationView.jsx`'s *initial* load only — not every mid-conversation "Processing..." turn, which stays the lightweight icon+text treatment it already had, since a full spinner+carousel repeating every turn would be visually excessive for a ~2s wait. Hit a real bug while wiring the Conversation case: `currentState` starts at `'starting'` but flips to `'processing'` synchronously on mount before the first paint (inside `startConversation`'s very first line), so gating the spinner on `currentState === 'starting'` alone meant it never actually rendered — fixed with a derived `isInitialLoad = exchangeCount === 0 && (currentState === 'starting' || currentState === 'processing')`, since "still on the opening API call" can only be inferred from having zero exchanges yet, not from `currentState` alone.
- [x] SAC-022: Mobile tap targets — playback control icons (⏮/▶‑⏸/⏭) and the row containing them now stack vertically on narrow screens (`flex-col` → `sm:flex-row`) with slightly larger touch targets on mobile (48px vs. 44px desktop, unchanged); speed buttons (1x/0.8x/0.6x) gained `min-w-[44px]` and more horizontal padding on mobile. Found and fixed a real mobile-only layout bug during WebKit-engine screenshot testing at 390px width: `VocabularyMatching.jsx`'s word buttons used `flex items-center justify-between` with no wrapping, so longer Spanish words + their difficulty badge would overflow past the button's edge and visually overlap/clip (confirmed via screenshot, not just a class-name read) — fixed by making both word and option button rows `flex-wrap`, letting the badge drop to its own line when it doesn't fit rather than overflowing.
- [x] SAC-023: Mobile header — `ListeningStoryView.jsx`'s separate "Topic: {scenario}" card and large centered "Listen carefully" heading (combined ~140px+ of vertical space) replaced with a single compact `border-l-4 border-primary` accent-bordered block (scenario name bold, "Listen carefully" as a small subtitle underneath, ~70px). `ConversationView.jsx` got the equivalent compact header treatment (scenario + exchange count) for consistency, replacing its old plain `bg-primary-light` topic card.
- [x] SAC-024: Audio playback autoplay bug — investigated and given a fallback rather than "fixed" outright, since the root cause (mobile browser user-activation policies) can't be confirmed from this environment (see the diagnostic round's PENDING.md entry above: Playwright's WebKit test build has no Web Speech API at all, so real mobile Safari/Chrome autoplay behavior remains unverified against a real device). Added detection instead: ~900ms after a story's opening `speak()` call, `ListeningStoryView.jsx` checks whether the engine actually reports `speaking` (and isn't just legitimately resting in the natural inter-sentence gap — checked via `gapTimeoutRef` so a real completed-and-resting utterance isn't misflagged); if speech never started at all, a prominent teal "🔊 Tap to Play" banner appears, calling `speakSentenceAt(0)` from a direct click handler (which should satisfy any user-activation requirement regardless of the exact policy). Verified end-to-end with a synth mock that silently swallows `speak()` (simulating a hard autoplay block): fallback banner appears, is 44px+, and tapping it successfully starts real playback and makes the banner disappear. Also caught and fixed a false-positive during testing: the initial detection logic flagged failure whenever `speaking` was false at the 900ms check, but with short utterances that's also true during the *legitimate* 1.3s gap between sentences — added the `gapTimeoutRef` check specifically to distinguish "genuinely never started" from "already finished sentence 1 and is resting before sentence 2."

**Decisions made without an explicit spec, v1.0l:** (1) This prompt's own SAC numbering (SAC-016 through SAC-022) collided with already-shipped v1.0k work — built against the renumbered SAC-018–024 mapping established in the prior diagnostic round instead of re-litigating it. (2) ConversationView.jsx gained a full header nav row it never had before (Back/Change Mode/Diff Scenario) rather than just restyling what little existed, since the prompt's acceptance criteria explicitly required consistency across all screens including Conversation. (3) Real device testing (actual iPhone Safari / Android Chrome) isn't possible from this environment — all mobile claims are backed by Playwright's Chromium mobile-viewport emulation (Android Chrome proxy) and WebKit engine with iPhone device emulation (Safari proxy), both real rendering/storage/layout engines, not just a resized desktop browser window; disclosed explicitly rather than implied as equivalent to physical-device testing.

### Shipped in v1.0m
- [x] SAC-025: Reorder main screen — `ModeSelector.jsx`'s two buttons swapped so 🎧 Listening Mode renders first, 🗣️ Conversation Mode second. Pure JSX reorder, no styling/behavior change; both modes still route correctly.
- [x] SAC-026: Sentence jump markers — new `handleJumpToSentence(idx)` in `ListeningStoryView.jsx` (same cancel-and-restart pattern as the existing `handleJumpToEnd`, parameterized), rendered as a row of compact 32×32px numbered buttons below the progress bar (one per sentence, current sentence solid teal, others light teal with hover) that wraps via `flex-wrap` for stories with many sentences. Deliberately sized smaller (32px) than the app's usual 44px tap-target convention — an explicit spec call for this specific dense multi-button row, not an accessibility regression elsewhere.
- [x] SAC-027 + SAC-028: Vocabulary matching — complete rewrite of `VocabularyMatching.jsx` from an all-at-once two-column grid to one-word-at-a-time. Words sort easy→medium→hard once on mount (`useMemo`); each word gets 4-5 shuffled options (1 correct + up to 4 distractors drawn from the *other* words in the same list, gracefully fewer if the word list itself has fewer than 5 entries). Correct match: success beep (880Hz sine) → if the word has example data, a phrase + sentence box (both Spanish and English) replaces the "✓ Correct!" banner for 600ms → auto-advances. Incorrect: error beep (220Hz square, distinct tone from the wrong-match beep introduced in v1.0l) → "Try again!" message → stays on the same word, all options remain clickable for a retry (nothing gets disabled). Progress bar at the bottom reflects words completed. Backend (`server.js` `/api/story-questions`): prompt extended to request `examplePhrase`/`examplePhraseEnglish`/`exampleSentence`/`exampleSentenceEnglish` per matching word (a phrase and a full sentence, each with its translation, using the word in a *new* context beyond the story itself); `max_tokens` raised 3000 → 4500 to fit the ~4x larger response.
- [x] SAC-029: Story caching + regenerate — new file-based cache in `server.js` (`.cache/stories.json`, keyed by scenario name; `ensureCacheDir`/`readStoriesCache`/`writeStoriesCache`/`getCachedStory`/`cacheStory` helpers). `/api/generate-story` now accepts a `regenerate` boolean: `false`/omitted checks cache first and returns instantly on a hit (`console.log('Using cached story for X')`); a miss or `regenerate: true` always calls Claude fresh and caches the result. Verified via direct `curl` timing: cached response in 157ms vs. ~16s+ for a fresh call. **Caveat documented, not hidden:** this is a local JSON file, which does not survive a Railway redeploy/restart (ephemeral filesystem) — it speeds up repeat requests within one running server process, not indefinitely. Frontend: `ListeningStoryView.jsx`'s `loadStory()` takes a `regenerate` param threaded through to the request body; new `handleRegenerateStory()` resets all playback/session UI state and calls `loadStory(() => false, true)`; new "🔄 Regenerate Story" button added to `ListeningHeader.jsx` (via an optional `onRegenerate` prop, only passed once a story is actually loaded — not during the initial loading state, since there's nothing yet to regenerate).

**Decisions made without an explicit spec, v1.0m:** (1) No SAC ID collision this round — the prompt used the exact renumbered IDs (SAC-025–029) already established in the prior diagnostic round, first time that's lined up cleanly. (2) The 32px sentence-jump-marker size is smaller than this project's usual 44px tap-target rule; followed the prompt's explicit "28-32px square" spec instead of the general rule, since it was a deliberate, specific instruction for this one dense-button-row case. (3) Cache scoped exactly as specified — only `/api/generate-story`, not `/api/story-questions` — so a "second load" of the same scenario is faster but not instant, since the (now heavier, SAC-028-driven) questions call still runs fresh every time; verified this wasn't a caching bug by timing the cached endpoint in isolation (157ms) before concluding the perceived total-load-time improvement was smaller than naively expected. (4) Testing this round again needed generous timeouts — uncached story generation plus the heavier post-SAC-028 questions call can take 40-60s combined in dev (further inflated by React StrictMode's double-invoke of the mount effect, which fires two real API calls per load in dev only, not production); an initial 60s test timeout was too tight and looked like a failure before a longer wait confirmed everything actually worked.

### Shipped in v1.0m (Prompt #012, Phase 2.5 polish)
- [x] Task 1: Speed labels — `ListeningStoryView.jsx`'s speed button group changed from raw multipliers `[1.0, 0.8, 0.6]` to descriptive labels `Slow`/`Normal`/`Fast` mapped to `[0.6, 0.5, 0.4]`, each with a `title` tooltip showing the actual multiplier (e.g. "Normal (0.5x)"). Default rate changed from 0.8 to 0.5 (both the `rate` state and `rateRef`) — per the prompt's stated reasoning that 0.6x reads as "normal" to users and 1.0x as unusably fast, the old default (0.8x) was already on the too-fast side of that perception.
- [x] Task 2: "Back to Stories" navigation — `ListeningHeader.jsx`'s third nav button renamed from "Diff Scenario" to "Back to Stories" and its handler changed from the old `onDifferentScenario` (auto-picked a random different scenario and jumped straight into it, skipping the picker) to `onBack` (same handler as the "← Back" button — lands on the scenario picker so the user chooses manually). This makes "Back" and "Back to Stories" functionally identical in this version — a direct consequence of the prompt's explicit instruction ("call onBack() directly"), not an oversight; the old auto-pick behavior is gone from Listening Mode. Scoped to Listening only, per the prompt's stated file/testing scope — Conversation Mode's separate "Diff Scenario" button (its own auto-pick-and-restart implementation, added in the v1.0l NavButton round) is untouched. Removed the now-dead `onDifferentScenario` prop threading through `ListeningStoryView.jsx` and its `App.jsx` call site (Conversation Mode's still receives it).
- [x] Task 3: App rename — "Spanish Audio Chat" → "Conversation Amigo" in `index.html` (`<title>`, new `<meta name="description">`), `App.jsx`'s `<h1>` header, `README.md`'s title heading, and `package.json`'s `name` field (`spanish-audio-chat` → `conversation-amigo`, followed by `npm install` to sync `package-lock.json`'s name field rather than hand-editing a generated file). Deliberately **left untouched**: the actual Netlify URL, Railway URL/service name, GitHub repo name, local folder name, and the IndexedDB database name in `db.js` — all real infrastructure identifiers that still literally exist under the old name; renaming *those* wasn't requested and would break live links/bookmarks. `grep -rn "Spanish Audio Chat" src/` confirmed zero remaining matches.
- [x] Task 4: Honest loading spinner — `LoadingSpinner.jsx` rewritten from scratch: removed the eased-toward-95%-over-time fake percentage (`requestAnimationFrame` progress loop + SVG circular progress ring) and, going beyond the prompt's literal removal list, also removed the scenario-word carousel added in v1.0l (SAC-021) — the prompt's "Keep" list and target pseudo-code only specified a spinner icon + label + static message, with no mention of the carousel, so read as removing it too rather than just the percentage. New component: a plain CSS `animate-spin` ring, the existing `label` prop unchanged, and a new `estimateText` prop (default `"This usually takes 10-15 seconds"`) rather than hardcoding that string everywhere — `ListeningStoryView.jsx`'s story generation keeps the 10-15s default (matches its real ~10-15s duration), but `ConversationView.jsx`'s initial-load call now passes `"This usually takes a few seconds"` instead, since its real wait is ~2-5s and showing "10-15 seconds" there would itself be dishonest — the opposite of this task's whole point. `src/scenarioVocab.js` (only ever used to feed the now-removed carousel) deleted as dead code.

**Decisions made without an explicit spec, Prompt #012:** (1) The prompt arrived truncated mid-Task-3, and a "Loading" task mentioned in its Build Order/Decisions header never got a Task section — held off building Tasks 3-4 and asked Vinay for the rest rather than guessing at an app-wide rename's scope or an unspecified "Honest Spinner" redesign; he sent the complete follow-up in the same turn. (2) Shipped Tasks 1-2 (fully specified, self-contained, tested clean) immediately rather than holding all four tasks for one combined commit, since there was no reason to let working, verified code sit uncommitted while waiting on the rest. (3) Removed the word carousel entirely rather than trying to preserve it alongside the new honest-message design — the "Keep" list didn't mention it and the target pseudo-code didn't include it, so keeping it anyway would have been adding scope not asked for.

### Shipped in v1.0q — Prompt #013 (target v1.0n, Phase 2.6; shipped together with #014-#017)
- [x] Speech quality — new `src/speechUtils.js` exports `applySpanishVoice(utterance)`: sets `lang = 'es-ES'` then, if `speechSynthesis.getVoices()` has entries, explicitly assigns the first `es-ES` (or any `es-*`) voice via `utterance.voice`, wrapped in try/catch so a failure degrades to lang-only rather than crashing. Applied at all 4 utterance-creation sites (`ListeningStoryView.jsx`'s main sequential playback, resume-from-boundary, and single-sentence transcript playback; `ConversationView.jsx`'s `playSpanishAudio`). Listening Mode's default rate lowered 0.5x → 0.3x (`rate` state and `rateRef`) per the prompt's explicit reasoning that even 0.5x was "racing through words." Conversation Mode's separate rate system (0.8x default, its own Repeat 1x/0.8x/0.6x buttons) deliberately left untouched — the prompt's rate-number references (0.5x → 0.3x) only ever matched Listening Mode's history, and Task 1's file scope only named `ListeningStoryView.jsx`. **Word-level pause fallback (Fix 3) was NOT built** — it's explicitly conditional in the prompt ("if slurring persists after rate reduction + voice selection") and only a human listening to the actual audio can determine that; building it speculatively would be guessing at a fix for a problem that might already be solved by the rate/voice change alone.
- [x] Speed button relabel — `Slow/Normal/Fast` (0.6/0.5/0.4x, shipped last round in Prompt #012) replaced with `Normal/Slow/Slower` (0.3/0.2/0.15x), "Fast" removed entirely — no speed in this app is meant to be fast anymore, all three options are slow-for-clarity tiers.
- [x] SAC-031: Sentence navigation redesign — `ListeningStoryView.jsx`'s old `⏮ Restart / ▶‑⏸ / ⏭ Jump-to-end` plus a row of numbered 1-9 jump-marker buttons (SAC-026, shipped v1.0m) replaced with 5 controls: `🔄 Replay` (restart *current* sentence — a new concept, distinct from the old ⏮'s "restart whole story from sentence 1," which no longer exists in this control row), `⏮ Prev`, `▶‑⏸` (unchanged, global auto-advancing play/pause), `⏭ Next`, `⏩ End`. New shared `manualNavRef` flag, set by Replay/Prev/Next/End (all four route through a new `manualNavigateTo(idx)` helper) and checked in `handleSentenceUtteranceEnd`: when set, the sentence stops after playing instead of gap-then-auto-advancing to the next one — this is the "forces active listening, one sentence at a time" behavior the prompt asked for. `manualNavRef` is only cleared inside `handlePlayPause`'s idle-branch (pressing the *global* Play button is what re-enables normal auto-advance). Real bug fixed while wiring this up: `handlePlayPause`'s idle-branch previously always called `speakSentenceAt(0)` unconditionally (harmless before this round, since 'idle' was only ever reached at the very first mount) — with manual nav now able to leave the app in 'idle' mid-story, this would have silently restarted the whole story from sentence 1 every time the global Play button was pressed after a manual nav; fixed to resume from `indexRef.current` instead. Also handled: if a manually-navigated sentence turns out to be the actual last one, `handleSentenceUtteranceEnd` sets `'finished'` (not `'idle'`) so the Comprehension Check stays reachable via manual navigation, not just via letting the whole story auto-play through — confirmed via test that clicking through to the End button does surface "Check Comprehension."
- [x] SAC-032: Header/footer redesign — removed the in-view Back/Change Mode/Diff-Scenario (or Back-to-Stories) `NavButton` row entirely from both `ListeningStoryView.jsx` (via `ListeningHeader.jsx`, which now renders nothing unless a `onRegenerate` handler is passed — i.e. it's just the Regenerate Story button's home now, not a nav bar) and `ConversationView.jsx` (inline row removed directly). New `FooterNav.jsx` — a `position: fixed` bottom bar (4 buttons: Back/Mode/Topics/History, 60px min-height, `env(safe-area-inset-bottom)` padding for notched phones), rendered once in `App.jsx` so it's present on every screen including the mode selector and history dashboard, not just inside a session. `App.jsx` gained `pb-20` on its outer container so the fixed footer doesn't overlap the last bit of scrollable content. **Preserving save-on-exit was the hard part:** both `ListeningStoryView` and `ConversationView` used to have their *own* Back button internally, wired to view-specific save-then-navigate logic (`handleBackWithSave` / `handleBack`) — removing that button from inside the view meant the new *external* FooterNav somehow still needed to trigger that same save logic, not just navigate away and silently drop an in-progress session. Solved with `forwardRef` + `useImperativeHandle` on both view components (`back: handleBackWithSave` / `back: handleBack`), a single shared `activeViewRef` in `App.jsx` (only one of the two views is ever mounted at a time, so one ref suffices — React nulls it out automatically on unmount), and `FooterNav`'s Back/Mode/Topics/History handlers all call `activeViewRef.current?.back?.()` first when a session view is active, before falling back to generic mode/scenario navigation. Verified this actually works (not just "doesn't crash"): completed a Listening session, clicked FooterNav's Back, then checked History — the session was there, confirming the save fired correctly through the ref rather than being silently skipped.

**Decisions made without an explicit spec, Prompt #013:** (1) A caught, real test-authoring bug worth remembering: an early test mock fabricated plain-object fake Spanish voices for `getVoices()` to return, and Chromium's real `utterance.voice` setter rejected them (`Failed to convert value to 'SpeechSynthesisVoice'`) since real voice objects have no public constructor a mock can imitate — traced this back by checking what this specific headless environment's *real*, unmocked `getVoices()` actually returns (confirmed: a genuine empty array, zero TTS voices registered here at all) and fixed the mock to match that reality instead of fabricating fake ones; the app's own try/catch in `applySpanishVoice` was already handling the failure gracefully throughout, so this was purely a test-fidelity fix, not an app bug. (2) A `fullPage: true` Playwright screenshot of the new sticky footer showed it duplicated mid-page, overlapping content — verified this was a known `position: fixed` + full-page-stitching screenshot artifact (not a real rendering bug) by taking a plain viewport screenshot instead, which showed the footer correctly pinned once at the true bottom. (3) **The one thing that could not be verified at all: does the speech actually sound clearer now?** This environment has no audio output/perception capability of any kind — not degraded, not emulated-differently, genuinely absent. Every other round's "couldn't test on a real device" disclosure was about *degree* of realism (emulated mobile viewport vs. physical hardware); this one is a hard capability boundary. Built the fixes faithfully from the spec (rate 0.3x, explicit voice selection, the exact behavioral changes requested) and verified everything checkable in code, but stopped short of committing/deploying, per the prompt's own explicit instruction, until a human actually listens and confirms.

### Shipped in v1.0q — Prompt #014 (target v1.0n, Phase 2.6 continued; shipped together with #013, #015-#017)
- [x] Task 1: Speed buttons reverted — `ListeningStoryView.jsx`'s speed group changed back from Prompt #013's `Normal/Slow/Slower` (0.3/0.2/0.15x) to raw multiplier labels `x1.0/x0.8/x0.5`, default rate back to 0.8x. This round's own framing ("Fix: Speeds too slow... clicks may not be changing playback") is itself the confirmation loop closing on Prompt #013's speech-quality fix — the complaint changed from *slurred* to *too slow*, meaning the voice-selection + rate work actually solved the original problem; only the specific numbers needed dialing back up. `ConversationView.jsx`'s separate Repeat-button rate system (already defaulting to 0.8x) had its slowest tier changed 0.6x → 0.5x and labels unified to the same `x1.0`/`x0.8`/`x0.5` format for consistency, since Task 1's file scope named both components. Re-verified the speed-change handler itself was never actually broken (confirmed via a mid-play rate check using the Replay button to force a guaranteed "actively playing" state, since the fast test mock can otherwise auto-complete a whole story before a naive "click Play" assertion gets to run) — "clicks may not be changing playback" reads as a perception issue from testing during/after a manual-nav stop (nothing audible happening because nothing was playing at that moment), not an actual handler bug.
- [x] Task 2: Comprehension toggle unified — `showMCQ` renamed `showComprehension`, now also gates the `VocabularyMatching` render (previously always shown, ungated, once the story finished) alongside the MCQ Questions section. Both appear/hide together under one button, labeled "✓ Check Comprehension" / "✓ Hide Comprehension"; `Display Transcript` stays as its own independent toggle, untouched — the prompt only described merging the comprehension-check and vocabulary sections.
- [x] Task 3: Vocabulary Matching pills — `VocabularyMatching.jsx`'s answer-option buttons changed from `min-h-[48px]` stacked full-width buttons to small `rounded-full` pills (`px-3 py-1`, `text-xs`, plain border, no fill/bold/shadow) in a `flex flex-wrap` row instead of a grid, matching the prompt's exact styling spec (0.25rem/0.75rem padding, 12-13px font, tight gap). Deliberately smaller than this project's usual 44px tap-target convention — same class of explicit, spec-driven exception as SAC-026's 32px sentence-jump markers.
- [x] Task 4: Word audio icon — new `playWord(text)` in `VocabularyMatching.jsx`: cancels anything currently speaking, builds a fresh utterance for just the word (no story sentence context), applies `applySpanishVoice` + the current playback rate (threaded down as a new `rate` prop from `ListeningStoryView.jsx`, default `0.8` for standalone use/safety). 🔊 icon sits directly beside the large word display.
- [x] Task 5: Manual "Next →" instead of auto-advance — removed the `ADVANCE_DELAY_MS` auto-advance timer entirely from `VocabularyMatching.jsx`'s correct-match path. Correct match now shows "✓ Correct!", the example phrase/sentence (if present), and a "Next →" button all together, staying visible indefinitely until the user clicks Next (`handleNext` clears feedback, unlocks, and advances `currentIdx`). Removed the now-unused `showExample` state entirely (examples are just part of the same persistent block now, not a separately-timed reveal).
- [x] Task 6: Compact title — `ListeningStoryView.jsx`'s standalone `border-l-4 border-primary bg-primary-light` title block removed; a plain `text-small text-ink-muted` subtitle line (`"{scenario} — Listen carefully"`) added at the top of the player-controls card instead, directly above the Replay/Prev/Play/Next/End row, per the prompt's exact requested layout.

**Three real bugs found and fixed via testing (isolated with standalone minimal repro scripts before AND after each fix, not assumed from theory alone):**
1. **Stale autoplay-failure check clobbers a legitimately-finished manual-nav session.** SAC-024's 900ms-after-load check (added Prompt #011) verifies `!speaking && !gapTimeoutRef.current` to decide whether autoplay silently failed. It never accounted for the possibility (introduced by Prompt #013's manual navigation) that the user could reach a genuine, successful 'finished' state via Replay/Prev/Next/End well within that 900ms window — at which point the stale check's condition is *also* true (nothing playing, no gap pending) for a completely different, legitimate reason, and it would incorrectly fire `setAutoplayFailed(true)` + `setPlayStatus('idle')`, yanking the just-shown Comprehension/Vocab toggle row back out of existence (it's gated on `playStatus === 'finished'`). **Fix:** the check now bails immediately if `manualNavRef.current` is true — if the user has already taken manual control, the original "did autoplay even start" question is moot. Confirmed the genuine autoplay-failure path (the actual "Tap to Play" fallback) still works correctly after this change.
2. **Same root cause, opposite direction: the *initial* 300ms autoplay kickoff can clobber a very fast manual-nav click.** If a click on Replay/Prev/Next/End happens within that first 300ms (trivial for an automated test's timing; a human would need to click almost instantly after the page paints), the still-pending kickoff timer fires afterward and unconditionally calls `speakSentenceAt(0)`, silently overwriting the user's navigation back to sentence 1. **Fix:** same guard — bail if `manualNavRef.current` is already true by the time this timer fires.
3. **A stale wrong-answer timer could wipe out a subsequent correct match.** In `VocabularyMatching.jsx`, a wrong guess schedules `retryTimeoutRef` to auto-clear the "Try again!" message after 1200ms. If the *very next* guess is correct, the correct-match branch set `feedback = {correct: true}` but never cancelled that still-pending timer from the previous wrong guess — so ~900-1200ms after the *wrong* click (which could be well under a second after the *correct* one), the stale timer fired anyway and called `setFeedback(null)`, wiping the persistent "✓ Correct!" banner and the Next button out from under a session that had already succeeded. This was hard to isolate — the app's own DOM only showed a symptom ("Next button not found") several test-script layers removed from the actual cause, and required incremental timestamped polling (checking DOM state every 250ms across the relevant window) to catch the exact ~750-1000ms disappearance point before the root cause became obvious. **Fix:** `selectOption` now unconditionally clears `retryTimeoutRef` at the top, before branching on correct/incorrect, so no stale wrong-guess timer can ever survive past the next attempt.

All three share the same underlying lesson: **a timer scheduled to fire based on an assumption about future state needs to re-check whether that assumption still holds when it actually fires** — not just whether the component is still mounted (`isStale()`/cleanup already covered that). Two fresh instances of "did the world change since I was scheduled" bugs and one instance of "did a *different* pending timer from an unrelated earlier action still assume the old state" — worth keeping in mind for any future timer-based UI logic in this codebase.

### Shipped in v1.0q — Prompt #015 (Phase 2.7 audio polish & UX refinements; v1.0m → v1.0o badge, shipped with #013-#014, #016-#017)
- [x] Task 1 (critical): Syllable-loss fix — new `SPEAK_START_DELAY_MS` constant (`speechUtils.js`, started at 75ms) inserted as a `setTimeout` between every `cancel()`/`speak()` pair, guarded by a token check so a delayed `speak()` no-ops if superseded. Applied at all 5 real call sites across `ListeningStoryView.jsx`, `ConversationView.jsx`, `VocabularyMatching.jsx`.
- [x] Task 2: Vocab word auto-play (later corrected in #016 — see below).
- [x] Task 3: Vocab word compacted (28px → 20px), difficulty badge moved inline.
- [x] Task 4: Vocab pills recolored green.
- [x] Task 5: `LoadingSpinner.jsx` gained a `previewWords` prop sourced from the real generated story's vocabulary (later replaced with the animated cycling version in #016/#017 — see below).
- [x] Task 6 (exploratory): Micro-pause punctuation after short words — **reverted in Prompt #016** after a real listen confirmed it sounded unnatural.

### Shipped in v1.0q — Prompt #016 (Phase 2.7 bug fixes & loading animation; v1.0o → v1.0p badge, shipped with #013-#015, #017)
- [x] Task 1: Reverted Prompt #015's micro-pause experiment entirely, confirmed by listening.
- [x] Task 2: Syllable-loss delay raised 75ms → 150ms (Approach A only, per the prompt's own sequential "try A, then B if needed" instruction).
- [x] Task 3: Vocab word auto-play moved from "after correct match" to "on word appearance" — the learner needs to hear it before matching, not as a reward after.
- [x] Task 4: `LoadingSpinner.jsx` rewritten — one animated word at a time (fade+scale) instead of a static list. Real bug caught and fixed during testing: `setTimeout`'s return value can't carry an attached property in a browser (only in Node) — fixed with a closure variable.
- [x] Task 5: Loading message updated to "This usually takes 30 to 40 seconds".

### Shipped in v1.0q — Prompt #017 (Phase 2.7 final polish; v1.0p → v1.0q badge, shipped with #013-#016)
- [x] Task 1: Syllable-loss delay raised again, 150ms → 175ms.
- [x] Task 2A: Loading-animation word interval slowed 700ms → 1000ms.
- [x] Task 2B: 5 distinct animation styles added (fade+scale, zoom bounce, slide up+fade, spin in, pulse glow), cycling per word.
- [x] Task 2C: Loading animation loops indefinitely (unbounded `tick` counter driving both word and animation-style selection via modulo) instead of stopping once the word list is exhausted — verified directly against a synthetic word list over a real ~7s browser session, confirmed on desktop and mobile.

**Deploy note:** All five rounds (#013-#017) sat at the commit/deploy gate together since none had been individually shipped — Vinay confirmed locally and explicitly requested the deploy; they shipped as one commit (`ffb990b`) and one production push (Railway backend + Netlify frontend), verified live at v1.0q via a real Playwright check against the production URLs.

---

## Notes for Claude Code Sessions

**Prompt Numbering:** This project uses SAC- prefix for PENDING items (backlog), separate from Prompt numbers (work sent to Claude Code). A single Prompt might implement multiple SAC- items.

**Testing:** Every Prompt's response should include concrete UI testing steps and reported results. Example: "Opened app, selected 'Introducing Yourself', clicked mic, said 'Hola me llamo Vinay', Claude responded with 'Mucho gusto! ¿De dónde eres?' + feedback 'Good introduction!' ✅"

**Staging:** Production deployment complete as of v1.0k — see https://spanish-audio-chat.netlify.app (frontend) and https://spanish-audio-chat-production.up.railway.app (backend). Auto-deploy-on-push not yet configured (SAC-017) — deploys are currently manual (`netlify deploy --prod`, `railway up`).
