# PENDING.md — Conversation Amigo (formerly Spanish Audio Chat)
## Last updated: 2026-08-26 (Prompt #017 built + locally tested, NOT yet deployed — see below)
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

**Built + locally tested, NOT yet deployed — Prompt #013 (target v1.0n, Phase 2.6):**
- Speech quality: explicit Spanish voice selection (new `src/speechUtils.js`) applied at all 4 utterance-creation sites across both views; Listening Mode's default rate lowered 0.5x → 0.3x — see DONE section
- Speed buttons relabeled again: Normal/Slow/Slower = 0.3x/0.2x/0.15x (replaces v1.0m's Slow/Normal/Fast = 0.6x/0.5x/0.4x), no "fast" option — see DONE section
- SAC-031: Sentence navigation redesigned — Replay/Prev/Next/End replace the old ⏮/⏭ + numbered jump markers; Prev/Next/Replay/End now play only the target sentence and stop (no auto-advance gap) — see DONE section
- SAC-032: Header/footer redesign — removed the in-view Back/Change Mode/Diff-Scenario nav row from both `ListeningStoryView`/`ConversationView`; new sticky `FooterNav.jsx` (Back/Mode/Topics/History) on every screen — see DONE section

**Built + locally tested, NOT yet deployed — Prompt #014 (target v1.0n, Phase 2.6 continued):**
- Task 1: Speed buttons reverted again — `x1.0/x0.8/x0.5`, default back to 0.8x (Prompt #013's 0.3x/0.2x/0.15x confirmed the voice-selection fix worked — the complaint flipped from "slurred" to "too slow," so the rates got dialed back up while keeping the voice-selection fix) — see DONE section
- Task 2: "Check Comprehension" now toggles MCQ Questions **and** Vocabulary Matching together under one button (previously Vocabulary Matching wasn't gated behind any toggle at all) — see DONE section
- Task 3: Vocabulary Matching's answer options redesigned from large stacked buttons to small inline pills (flex-wrap, light border, no fill) — see DONE section
- Task 4: 🔊 icon added next to the Spanish word in Vocabulary Matching — plays just that word, no sentence context — see DONE section
- Task 5: Vocabulary Matching's correct-match flow now shows "✓ Correct!" + examples + a manual "Next →" button instead of auto-advancing on a timer — see DONE section
- Task 6: Story title moved from its own prominent bordered block into a small subtitle line at the top of the player-controls box — see DONE section
- **Three real bugs found and fixed during testing** (not test-script artifacts — genuine app races, all confirmed via isolated minimal repro scripts before and after the fix): (1) SAC-024's 900ms autoplay-failure-detector could fire *after* manual navigation had already legitimately reached 'finished', forcibly resetting `playStatus` back to `'idle'` and yanking away the just-shown Comprehension/Vocab toggle UI; (2) the 300ms initial-autoplay-kickoff timer had the same class of bug in the other direction — a very fast manual-nav click within that window got silently overwritten back to sentence 0 once the delayed kickoff fired; (3) in `VocabularyMatching.jsx`, a wrong guess immediately followed by a correct one left the wrong guess's 1200ms auto-clear timer still pending, which later fired and wiped the persistent "✓ Correct!" feedback (and Next button) out from under a genuinely successful match. All three share a root cause worth remembering: **timers scheduled against a specific expected future state need to check whether that state assumption still holds when they finally fire**, not just whether the component is still mounted. See DONE section for the exact fixes.

**Built + locally tested, NOT yet deployed — Prompt #015 (v1.0m → v1.0o, Phase 2.7 audio polish & UX refinements):** Note on version numbering — v1.0n was only ever an internal working label for Prompts #013/#014 (the visible badge never actually left v1.0m since neither shipped); this round jumps the badge straight from v1.0m to **v1.0o** rather than shipping an intermediate v1.0n that was never separately released.
- Task 1 (CRITICAL): Syllable-loss fix — first syllable(s) were getting cut off on Prev/Next/Replay/End, the transcript 🔊 icon, and the vocab word 🔊 icon (e.g. "María va al restaurante" playing as "ía va al restaurante"). Root cause: `speechSynthesis.speak()` was being called immediately after `.cancel()`, before the engine's audio pipeline had finished tearing down the previous utterance. Fixed with a new shared `SPEAK_START_DELAY_MS = 75` constant (`src/speechUtils.js`) — every call site now does `cancel()` → `setTimeout(75ms)` → `speak()`, with a token-guard (existing `utteranceTokenRef` in `ListeningStoryView.jsx`; new `speakTokenRef` added to `ConversationView.jsx` and `VocabularyMatching.jsx`, which didn't have one) so a delayed `speak()` bails out if something newer superseded it during the 75ms window instead of firing a stale/cancelled utterance late. Applied at all 5 real call sites (`speakSentenceAt`, `resumeSentenceFromBoundary`, `playTranscriptSentence` in `ListeningStoryView.jsx`; `playSpanishAudio` in `ConversationView.jsx`; `playWord` in `VocabularyMatching.jsx`). `HoverableText.jsx` was audited per the prompt's file list but has no audio call site at all (word-click shows a text tooltip, no speech) — nothing to change there.
- Task 2: Vocab word now auto-plays automatically ~200ms after a correct match (reuses the existing `playWord`), not just via the 🔊 icon.
- Task 3: Vocab word font size reduced from `text-heading-1` (28px) to a compact `1.25rem` (20px); difficulty badge moved inline next to the word (same flex row as the word + 🔊 icon) instead of on its own line above.
- Task 4: Vocab pills recolored green — `bg-[#e8f5e9] text-[#2e7d32] border-[#81c784]`, hover `bg-[#c8e6c9]` (replaces the neutral border-only pill style from Prompt #014).
- Task 5: `LoadingSpinner.jsx` gained an optional `previewWords` prop — small muted text below the existing spinner/message, listing up to 12 words (filtered to length > 2, skipping trivial short words) from the story once available. Wired only in `ListeningStoryView.jsx`'s loading branch (`story?.vocabulary`, which the existing `loadStory()` flow already populates via `setStory()` partway through the loading period — before the second `/api/story-questions` fetch resolves — so no new data-plumbing was needed). Verified with route-mocked, staggered fetch timings that the preview genuinely appears mid-load, not just at the end. `ConversationView.jsx`'s two `LoadingSpinner` calls are unaffected (no story data to preview there; prop defaults to `[]`).
- Task 6 (EXPLORATORY): Micro-pauses after very short words, to address short-word blurring (the prompt's own example: "y le dan la" reading as one merged slur). New `addMicroPauses(text, maxWordLength=2)` in `speechUtils.js` inserts a comma after any standalone word ≤2 letters that doesn't already end a clause (skips words with existing trailing punctuation). Scoped conservatively to avoid destabilizing the carefully-tuned onboundary/resume-from-boundary system built up over v1.0g/h: `speakSentenceAt` and `resumeSentenceFromBoundary` were both routed through one new `getSpokenText(idx)` helper so they agree on the exact same (padded) text for a given sentence — onboundary charIndex offsets captured while speaking one are otherwise used to slice the other, and padding one but not the other would have shifted resume positions out of sync. `playTranscriptSentence` (no resume/offset tracking) also uses the padded text. Deliberately **not** applied to `ConversationView.jsx` or `VocabularyMatching.jsx` (single words, not sentences — no adjacent-word blur risk there) or to `resumeSentenceFromBoundary`'s risk profile beyond the shared-helper fix above, matching the prompt's own scoping to `ListeningStoryView.jsx`'s sentence playback.
- **This is explicitly the most subjective item in the round** — the prompt itself frames Task 6 as exploratory with a "revert if it sounds worse" escape hatch. Confirmed via mocked-audio testing that a real story sentence containing "y le dan la" (pulled from the actual cached backend data, not a synthetic test fixture) now renders as `"...y, le, dan la, bienvenida..."`, and confirmed via a dedicated boundary-simulation test that mid-sentence speed changes still resume from a correct, sane suffix of the padded text (no skipped/duplicated/garbled content) — but **whether the added pauses actually sound better, worse, or just different is something only Vinay's own ears can judge**.

**Built + locally tested, NOT yet deployed — Prompt #016 (v1.0o → v1.0p, Phase 2.7 bug fixes & loading animation):** This round is a direct response to a real local listen-test of v1.0o — the first time in this arc the human feedback loop actually closed with specific, actionable results instead of "target version, awaiting confirmation."
- Task 1: **Reverted Prompt #015's Task 6 micro-pauses entirely** — confirmed by listening that "y, le, dan la," sounded unnatural. Removed `addMicroPauses()` from `speechUtils.js` and the `getSpokenText()` indirection it required in `ListeningStoryView.jsx` (all 3 call sites — `speakSentenceAt`, `resumeSentenceFromBoundary`, `playTranscriptSentence` — reverted to reading `sentences[idx].spanish` directly again). Confirmed via a real-backend smoke test that the exact previously-padded sentence now speaks unmodified: "Todos aplauden contentos y le dan la bienvenida al nuevo grupo."
- Task 2 (CRITICAL, still open): Confirmed by listening that Prompt #015's 75ms `SPEAK_START_DELAY_MS` was **not enough** — syllables were still clipping. Tried **Approach A** first as instructed: raised the delay to **150ms**. Did not also build Approach B (silent warm-up utterance) or C (split-first-word) preemptively — the prompt's own ordering ("try A first, then B if needed") is itself a listening-gated decision, and stacking untested fixes together would make it impossible to tell which one (if any) actually worked. **150ms is what's running now; Approaches B and C are documented and ready to build immediately in a follow-up round if 150ms still isn't enough on a real listen.**
- Task 3: Fixed vocab word auto-play timing — was playing *after* a correct match (Prompt #015's behavior, now recognized as backwards), now plays automatically when the word first appears (new `useEffect` in `VocabularyMatching.jsx` keyed on `currentIdx`, ~200ms after mount/word-change), before the user has to match it. The 🔊 icon still replays on demand. Real bug caught while wiring this: React's `useEffect` cleanup naturally handles clearing the pending timer on rapid word changes, so the old `autoplayTimeoutRef` ref (needed for the old post-match design) was removed entirely rather than repurposed — one less piece of state to keep in sync.
- Task 4: `LoadingSpinner.jsx` rewritten — instead of Prompt #015's static "12 words joined by a dot" preview line, one word at a time now cycles in with a fade+scale CSS animation (new `.loading-word`/`@keyframes wordAppear` in `index.css`), first word as soon as story data's available, then advancing every 700ms. **Real bug found and fixed during testing:** the first draft tried to stash the `setInterval` ID as a property on the `setTimeout` return value (`startTimer.interval = interval`) to reach it from the cleanup function — this throws in a browser (`Cannot create property 'interval' on number '3'`), because browser timer IDs are plain numbers, not the object Node.js's `setTimeout` returns (which *can* carry properties). Fixed by holding the interval ID in a normal closure variable instead. Caught via the zero-console-errors check, not a listening issue — confirmed the fix by verifying the word actually advances (`restaurante` → `amigo`) after the corrected timing, not just that the error was gone.
- Task 5: Loading message default changed to "This usually takes 30 to 40 seconds" (was "10-15 seconds," which undersold the real generate-story + story-questions round-trip). Only the `LoadingSpinner.jsx` default changed — `ConversationView.jsx`'s two calls pass their own explicit `estimateText` ("a few seconds," accurate for that mode's much lighter API calls) and were left untouched.

**Decisions made without an explicit spec, Prompt #016:** (1) Given Task 2's own instructions frame trying 150ms vs. the warm-up approach as a sequential, listen-gated decision, only Approach A was built this round — not because B is unlikely to be needed, but because I have no way to judge from here whether A alone resolved it, and stacking both would make that unknowable even for Vinay on the next listen. (2) Same fundamental audio-perception limitation as every prior round in this arc — programmatically verified the delay is actually 150ms now (via a mocked-timing test) and that the reverted text is genuinely unpadded again, but whether syllables are actually crisp now is still Vinay's call alone.

**Built + locally tested, NOT yet deployed — Prompt #017 (v1.0p → v1.0q, Phase 2.7 final polish):** Note: this prompt's own text described v1.0p as "being deployed to production" with a separate deploy step for it — no deploy command for v1.0p was given to or run by Claude Code; only the v1.0q work below was built, per the prompt's actual instructions.
- Task 1: Syllable-loss delay fine-tuned again — 150ms (Prompt #016) confirmed still occasionally clipping on a real listen, raised to **175ms**.
- Task 2A: Loading-animation word interval slowed 700ms → 1000ms (`NEXT_WORD_INTERVAL_MS` in `LoadingSpinner.jsx`).
- Task 2B: 5 distinct animation styles added — Fade+Scale, Zoom Bounce, Slide Up+Fade, Spin In, Pulse Glow (new keyframes + `.loading-word-<style>` classes in `index.css`), cycling per word via `ANIMATION_STYLES[tick % 5]` so consecutive words don't repeat the same effect back-to-back.
- Task 2C: Loading animation now **loops indefinitely** instead of stopping after the word list is exhausted — rewrote `LoadingSpinner.jsx`'s internal state from a bounded `wordIdx` to an unbounded `tick` counter, with both the displayed word (`tick % words.length`) and the animation style (`tick % 5`) derived from it via modulo. The `setInterval` that drives `tick` has no exit condition anymore (Prompt #016's version `clearInterval`'d once every word had been shown once) — it simply keeps running for as long as `LoadingSpinner` stays mounted, which is exactly the loading period; the effect's cleanup function stops it automatically the moment the parent stops rendering the spinner (story finished loading), no separate "stop" signal needed.

**Testing note:** verified the looping behavior directly against a synthetic 3-word list over a ~7s observation window — confirmed it correctly cycles `restaurante → amigo → camarero → restaurante → amigo → camarero` (wrapping after the 3rd word) with animation styles advancing `fadeScale → zoomBounce → slideUpFade → spinIn → pulseGlow → fadeScale` (wrapping after the 5th) — both cycles exactly matching their respective modulo lengths, confirmed on both desktop and mobile. One test-script-only false negative caught and correctly diagnosed during this: an assertion checking "did the word list wrap" also asserted the total unique-values count stayed ≤3, but the observation window ran one poll past the story finishing loading, which returned `null` (no `loading-word` element — the spinner had already unmounted) and pushed the unique count to 4; the underlying word/animation cycling data was correct throughout, only the test's own assertion needed the loading-finished edge case accounted for. Not a real app bug, no code change required.

**🛑 BLOCKED on human confirmation before deploy (Prompts #013 through #017 — all still unshipped, all riding together since none has been committed yet):** Everything *programmatically* checkable across all five rounds passed cleanly (zero console errors on desktop + mobile, all task assertions, a real-backend smoke test, one real timer bug caught and fixed in Prompt #016's Task 4). **Waiting on Vinay to confirm locally before any of this gets committed, pushed, or deployed** — nothing has shipped since v1.0m; v1.0n was never its own release, and the badge is now v1.0q.

**Next (after the above is confirmed and shipped):**
1. SAC-017: Connect Netlify + Railway to GitHub for auto-deploy-on-push (currently both are manual CLI deploys)
2. Set a real `VITE_FORMSPREE_URL` so the email capture form goes live (code is shipped but no-ops without it)
3. SAC-030: Difficulty selector (Phase 3+)

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
- [ ] SAC-030: Difficulty selector (A1 Beginner / A1.5-A2 Intermediate / B1+ Advanced)

### Known issues flagged alongside this roadmap — diagnosed 2026-08-25
- **History Dashboard "0 sessions" — root cause: not a bug, an expectation mismatch.** Re-tested against production using Playwright's WebKit engine (Safari's actual rendering/storage engine, iPhone 13 emulation) rather than Chromium: a session saved and completed in one browser context correctly appeared in History (`1 Total Sessions`) in the same context; a **separate, fresh browser context with no prior session correctly showed `0 Total Sessions`**. IndexedDB is per-origin *and* per-browser-profile — sessions completed on one device/browser never appear on another device/browser/incognito window, by design (this was already documented as a known characteristic in CLAUDE.md's IndexedDB section, just not obviously visible reasoning to someone hitting it live). If "0 sessions" was reported on a *device that had actually completed a session earlier*, that would be a real bug and needs a repro with those specifics (which device, which browser, private/regular window, was a session actually completed there beforehand) — not yet confirmed as an actual repro.
- **Audio autoplay — root cause diagnosed from code, NOT verified against a real device (environment limitation, see below).** Both `ConversationView.jsx`'s opening line and `ListeningStoryView.jsx`'s story playback call `speechSynthesis.speak()` from *inside an async chain following a mount effect* (`useEffect` → `await fetch(...)` → `playSpanishAudio()` / `setTimeout(..., 300)` → `speakSentenceAt(0)`), never synchronously inside a click handler. Mobile Safari (and increasingly other mobile browsers) enforce a "user activation" requirement for `speechSynthesis.speak()` — the activation window from the original scenario-selection tap is very likely expired by the time these async calls fire, which would silently no-op the audio with no visible error. Desktop Chrome is historically more lenient here, matching the reported "web auto-plays, mobile doesn't" split. **Could not verify this against a real device or real Safari from this environment** — Playwright's WebKit test build (confirmed via direct check) does not implement `speechSynthesis`/`SpeechSynthesisUtterance` at all, so it can't reproduce or disprove the autoplay-policy theory, only support it via code inspection. The fix either way is the same: add a "Tap to play" fallback control that starts playback from a direct click handler (this is what SAC-024 already targets).

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

### Built + locally tested, NOT yet shipped — Prompt #013 (target v1.0n, Phase 2.6)
- [x] Speech quality — new `src/speechUtils.js` exports `applySpanishVoice(utterance)`: sets `lang = 'es-ES'` then, if `speechSynthesis.getVoices()` has entries, explicitly assigns the first `es-ES` (or any `es-*`) voice via `utterance.voice`, wrapped in try/catch so a failure degrades to lang-only rather than crashing. Applied at all 4 utterance-creation sites (`ListeningStoryView.jsx`'s main sequential playback, resume-from-boundary, and single-sentence transcript playback; `ConversationView.jsx`'s `playSpanishAudio`). Listening Mode's default rate lowered 0.5x → 0.3x (`rate` state and `rateRef`) per the prompt's explicit reasoning that even 0.5x was "racing through words." Conversation Mode's separate rate system (0.8x default, its own Repeat 1x/0.8x/0.6x buttons) deliberately left untouched — the prompt's rate-number references (0.5x → 0.3x) only ever matched Listening Mode's history, and Task 1's file scope only named `ListeningStoryView.jsx`. **Word-level pause fallback (Fix 3) was NOT built** — it's explicitly conditional in the prompt ("if slurring persists after rate reduction + voice selection") and only a human listening to the actual audio can determine that; building it speculatively would be guessing at a fix for a problem that might already be solved by the rate/voice change alone.
- [x] Speed button relabel — `Slow/Normal/Fast` (0.6/0.5/0.4x, shipped last round in Prompt #012) replaced with `Normal/Slow/Slower` (0.3/0.2/0.15x), "Fast" removed entirely — no speed in this app is meant to be fast anymore, all three options are slow-for-clarity tiers.
- [x] SAC-031: Sentence navigation redesign — `ListeningStoryView.jsx`'s old `⏮ Restart / ▶‑⏸ / ⏭ Jump-to-end` plus a row of numbered 1-9 jump-marker buttons (SAC-026, shipped v1.0m) replaced with 5 controls: `🔄 Replay` (restart *current* sentence — a new concept, distinct from the old ⏮'s "restart whole story from sentence 1," which no longer exists in this control row), `⏮ Prev`, `▶‑⏸` (unchanged, global auto-advancing play/pause), `⏭ Next`, `⏩ End`. New shared `manualNavRef` flag, set by Replay/Prev/Next/End (all four route through a new `manualNavigateTo(idx)` helper) and checked in `handleSentenceUtteranceEnd`: when set, the sentence stops after playing instead of gap-then-auto-advancing to the next one — this is the "forces active listening, one sentence at a time" behavior the prompt asked for. `manualNavRef` is only cleared inside `handlePlayPause`'s idle-branch (pressing the *global* Play button is what re-enables normal auto-advance). Real bug fixed while wiring this up: `handlePlayPause`'s idle-branch previously always called `speakSentenceAt(0)` unconditionally (harmless before this round, since 'idle' was only ever reached at the very first mount) — with manual nav now able to leave the app in 'idle' mid-story, this would have silently restarted the whole story from sentence 1 every time the global Play button was pressed after a manual nav; fixed to resume from `indexRef.current` instead. Also handled: if a manually-navigated sentence turns out to be the actual last one, `handleSentenceUtteranceEnd` sets `'finished'` (not `'idle'`) so the Comprehension Check stays reachable via manual navigation, not just via letting the whole story auto-play through — confirmed via test that clicking through to the End button does surface "Check Comprehension."
- [x] SAC-032: Header/footer redesign — removed the in-view Back/Change Mode/Diff-Scenario (or Back-to-Stories) `NavButton` row entirely from both `ListeningStoryView.jsx` (via `ListeningHeader.jsx`, which now renders nothing unless a `onRegenerate` handler is passed — i.e. it's just the Regenerate Story button's home now, not a nav bar) and `ConversationView.jsx` (inline row removed directly). New `FooterNav.jsx` — a `position: fixed` bottom bar (4 buttons: Back/Mode/Topics/History, 60px min-height, `env(safe-area-inset-bottom)` padding for notched phones), rendered once in `App.jsx` so it's present on every screen including the mode selector and history dashboard, not just inside a session. `App.jsx` gained `pb-20` on its outer container so the fixed footer doesn't overlap the last bit of scrollable content. **Preserving save-on-exit was the hard part:** both `ListeningStoryView` and `ConversationView` used to have their *own* Back button internally, wired to view-specific save-then-navigate logic (`handleBackWithSave` / `handleBack`) — removing that button from inside the view meant the new *external* FooterNav somehow still needed to trigger that same save logic, not just navigate away and silently drop an in-progress session. Solved with `forwardRef` + `useImperativeHandle` on both view components (`back: handleBackWithSave` / `back: handleBack`), a single shared `activeViewRef` in `App.jsx` (only one of the two views is ever mounted at a time, so one ref suffices — React nulls it out automatically on unmount), and `FooterNav`'s Back/Mode/Topics/History handlers all call `activeViewRef.current?.back?.()` first when a session view is active, before falling back to generic mode/scenario navigation. Verified this actually works (not just "doesn't crash"): completed a Listening session, clicked FooterNav's Back, then checked History — the session was there, confirming the save fired correctly through the ref rather than being silently skipped.

**Decisions made without an explicit spec, Prompt #013:** (1) A caught, real test-authoring bug worth remembering: an early test mock fabricated plain-object fake Spanish voices for `getVoices()` to return, and Chromium's real `utterance.voice` setter rejected them (`Failed to convert value to 'SpeechSynthesisVoice'`) since real voice objects have no public constructor a mock can imitate — traced this back by checking what this specific headless environment's *real*, unmocked `getVoices()` actually returns (confirmed: a genuine empty array, zero TTS voices registered here at all) and fixed the mock to match that reality instead of fabricating fake ones; the app's own try/catch in `applySpanishVoice` was already handling the failure gracefully throughout, so this was purely a test-fidelity fix, not an app bug. (2) A `fullPage: true` Playwright screenshot of the new sticky footer showed it duplicated mid-page, overlapping content — verified this was a known `position: fixed` + full-page-stitching screenshot artifact (not a real rendering bug) by taking a plain viewport screenshot instead, which showed the footer correctly pinned once at the true bottom. (3) **The one thing that could not be verified at all: does the speech actually sound clearer now?** This environment has no audio output/perception capability of any kind — not degraded, not emulated-differently, genuinely absent. Every other round's "couldn't test on a real device" disclosure was about *degree* of realism (emulated mobile viewport vs. physical hardware); this one is a hard capability boundary. Built the fixes faithfully from the spec (rate 0.3x, explicit voice selection, the exact behavioral changes requested) and verified everything checkable in code, but stopped short of committing/deploying, per the prompt's own explicit instruction, until a human actually listens and confirms.

### Built + locally tested, NOT yet shipped — Prompt #014 (target v1.0n, Phase 2.6 continued)
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

---

## Notes for Claude Code Sessions

**Prompt Numbering:** This project uses SAC- prefix for PENDING items (backlog), separate from Prompt numbers (work sent to Claude Code). A single Prompt might implement multiple SAC- items.

**Testing:** Every Prompt's response should include concrete UI testing steps and reported results. Example: "Opened app, selected 'Introducing Yourself', clicked mic, said 'Hola me llamo Vinay', Claude responded with 'Mucho gusto! ¿De dónde eres?' + feedback 'Good introduction!' ✅"

**Staging:** Production deployment complete as of v1.0k — see https://spanish-audio-chat.netlify.app (frontend) and https://spanish-audio-chat-production.up.railway.app (backend). Auto-deploy-on-push not yet configured (SAC-017) — deploys are currently manual (`netlify deploy --prod`, `railway up`).
