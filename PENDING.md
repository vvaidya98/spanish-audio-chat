# PENDING.md — Spanish Audio Chat
## Last updated: 2026-08-24 (v1.0j ship)
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
- [ ] SAC-003: GitHub repo created (private), main branch set up
- [ ] SAC-004: Netlify connected (frontend auto-deploy from GitHub)
- [ ] SAC-005: Railway connected (backend auto-deploy from GitHub)
- [ ] SAC-006: Production API URL tested (not localhost)
- [ ] SAC-007: Final documentation review (README, CLAUDE.md, PENDING.md current)

---

## 🟡 DECIDED BUT NOT YET BUILT

- [ ] SAC-008: Create testing checklist HTML (interactive, per Vinay's testing-checklist convention) for Phase 1 final validation before shipping

---

## 🟢 OPEN QUESTIONS — Decide Before or During Build

- [ ] **SAC-009: Production frontend-to-backend URL routing** — Should frontend use environment variables for API base URL (dev vs prod), or hardcode production URL after deploy? Recommendation: use env var (VITE_API_URL) so same build works in dev and prod.

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

**Next:**
1. SAC-003: Create GitHub repo
2. SAC-004: Deploy frontend to Netlify
3. SAC-005: Deploy backend to Railway
4. SAC-006: Test production URLs
5. SAC-007: Final doc review

---

## 💡 Ideas Parked for Phase 2

- Difficulty selector (absolute beginner → intermediate → advanced)
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

---

## Notes for Claude Code Sessions

**Prompt Numbering:** This project uses SAC- prefix for PENDING items (backlog), separate from Prompt numbers (work sent to Claude Code). A single Prompt might implement multiple SAC- items.

**Testing:** Every Prompt's response should include concrete UI testing steps and reported results. Example: "Opened app, selected 'Introducing Yourself', clicked mic, said 'Hola me llamo Vinay', Claude responded with 'Mucho gusto! ¿De dónde eres?' + feedback 'Good introduction!' ✅"

**Staging:** Localhost testing is complete. Next: GitHub setup, then Netlify + Railway production deploy.
