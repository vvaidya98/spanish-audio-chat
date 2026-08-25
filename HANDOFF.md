# Spanish Audio Chat — Handoff to Claude Code

**Status:** Project scaffold complete. Ready for Claude Code to take over.  
**Version:** v1.0b (starting point)  
**Workflow:** Two-Claude pattern — design complete, now implementation in Claude Code

---

## What's Done (Claude.ai)

✅ **Project Design & Scope**
- Beginner Spanish conversation practice app
- Audio voice chat interface (Web Speech API)
- Claude initiates conversations, provides feedback
- Scenario-based dialogue (user picks topic)

✅ **Architecture Planned**
- Frontend: React + Vite (Netlify)
- Backend: Node.js + Express (Railway)
- Backend proxy pattern (all API calls via /api/*)
- CORS handled by backend

✅ **Full Project Scaffold**
- All config files (vite.config.js, tailwind.config.js, package.json)
- Backend server (server.js) with two API endpoints
- React component structure (App.jsx, ConversationView.jsx, ScenarioSelector.jsx)
- Documentation (CLAUDE.md, PENDING.md, README.md)
- Deployment ready (Procfile, .gitignore, .env.example)

---

## What's Left for Claude Code

### 1. **Local Setup & Testing**
```bash
# Terminal 1
npm install
npm run dev                  # Frontend on :5173

# Terminal 2 (in new terminal)
npm run backend             # Backend on :3000
```

**Copy .env file locally:**
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

**Test locally:**
- Open http://localhost:5173
- Select a scenario
- Click mic and speak Spanish
- Backend should respond with Spanish + feedback

### 2. **Bug Fixes & Refinements (if needed)**
- [ ] Test speech recognition across browsers
- [ ] Test TTS playback (rate 0.8 quality)
- [ ] Test error states
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Fix any CORS issues that slip through

### 3. **GitHub Setup**
```bash
git init
git add .
git commit -m "Initial scaffold for Spanish Audio Chat v1.0b"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. **Deployment**

**Frontend (Netlify)**
1. Connect GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy

**Backend (Railway)**
1. Connect GitHub repo to Railway
2. Add environment variable: `ANTHROPIC_API_KEY=sk-ant-...`
3. Railway auto-detects Node.js and runs `npm start` (from Procfile)
4. Deploy

**Update Frontend API URL (for production)**
In `src/components/ConversationView.jsx`, when deployed to production, update fetch URLs from `/api/*` to the Railway backend URL (e.g., `https://your-railway-app.railway.app/api/*`).

Or better: use environment variables for this.

### 5. **Version & Documentation**
- [ ] Update version badge in App.jsx (currently v1.0b)
- [ ] Final review of CLAUDE.md & PENDING.md
- [ ] Move completed Phase 1 tasks to PENDING.md DONE section
- [ ] Commit & tag as v1.0b

---

## Key Files to Know

| File | Purpose |
|---|---|
| `CLAUDE.md` | Technical memory — read this first |
| `PENDING.md` | Roadmap & backlog |
| `package.json` | npm dependencies & scripts |
| `server.js` | Express backend (API endpoints) |
| `src/App.jsx` | React root component |
| `src/components/ConversationView.jsx` | Main conversation UI |
| `src/components/ScenarioSelector.jsx` | Topic picker |
| `vite.config.js` | Frontend dev server + API proxy |
| `.env.example` | Template for secrets (copy to .env) |
| `.gitignore` | Never commit .env or node_modules |

---

## Known Quirks to Watch

1. **CORS Issue (Fixed by Backend Proxy)**
   - Initial HTML artifact hit CORS error
   - Solution: All API calls now go through /api/* backend endpoints
   - Frontend never talks directly to Anthropic API

2. **Web Speech API Quirks**
   - Chrome/Edge: works great
   - Firefox: less reliable
   - iOS Safari: needs HTTPS (test in production)
   - Spanish language pack required on some systems

3. **TTS Speech Rate**
   - Currently set to 0.8x (slower)
   - May need tweaking per device
   - Find in `ConversationView.jsx`: `utterance.rate = 0.8`

4. **Claude Model String**
   - Using `claude-opus-4-8` (stable as of Jan 2025)
   - If API calls fail silently, check this first
   - Both frontend and backend use this model

---

## Next Phase (After v1.0b Ships)

See PENDING.md for Phase 2 roadmap:
- Session persistence (IndexedDB)
- User progress tracking
- Difficulty levels
- Vocab hints
- Scoring system

---

## Questions for Claude Code

When you open this in Claude Code, review:
1. Does the backend server.js look right?
2. Does the frontend call the /api/* endpoints correctly?
3. Any bugs or edge cases when testing locally?
4. Any improvements before deploying?

**Then proceed with local testing → GitHub push → Netlify + Railway deployment.**

Good luck! 🚀
