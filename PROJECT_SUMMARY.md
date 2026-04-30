# TacTic Sonata Project Summary

TacTic Sonata is a gothic-themed Tic Tac Toe web game with two main play modes:

- **Vs Phrolova**: player versus an AI opponent with multiple difficulties, skills, dialogue, audio, and fallback frontend logic for static hosting.
- **Multiplayer**: realtime online 1 vs 1 using Supabase Realtime, playable from GitHub Pages without the Express backend.

## Main Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Database: Supabase Postgres
- Realtime: Supabase Realtime
- Frontend deploy: GitHub Pages
- Backend deploy: Render
- Testing: Jest + Supertest

## Core Features

- Cinematic title screen and mode select screen.
- Player vs Phrolova AI mode.
- Multiplayer online mode with random matchmaking.
- Gothic red-black UI theme.
- Sound effects, background music, Phrolova voice lines, and avatar/video assets.
- Phrolova welcome dialog and `phrolova_welcome.mp3` when entering Vs Phrolova mode.
- AI difficulty levels:
  - Easy
  - Normal
  - Hard
  - Impossible
  - Maestro of the Lost Beyond
- Player skills:
  - Insight Move
  - Undo Move
  - Harmony Shield
- Phrolova skills:
  - Perfect Cadence
  - Crimson Interruption
  - Symphony Prediction
  - Echo Manipulation
- Maestro boss abilities:
  - Resonance Override
  - Hecate's Shadow
  - Symphony of Rebirth

## Vs Phrolova Mode

Vs Phrolova can run in two ways:

1. **With Express backend**
   - Frontend calls `/api/game/...`.
   - Backend stores game and score state in memory.
   - Suitable for local development and Render deployment.

2. **Static fallback mode**
   - Used when hosted on GitHub Pages without backend.
   - Frontend runs local game logic, minimax, score, reset, moves, and skills.
   - Keeps the game playable even if Express API is unavailable.

Backend API URL can be configured with:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://your-render-backend.onrender.com";
```

When entering Vs Phrolova from the mode select screen, the UI shows a themed welcome dialog:

```text
Welcome, wanderer, to this humble grid. I am Phrolova, the silent conductor of souls... come, let us begin our solemn symphony of life and death.
```

The welcome audio is:

```text
client/assets/audio/phrolova_welcome.mp3
```

It plays once when entering Vs Phrolova and respects the Sound On/Off toggle.

## Multiplayer Mode

Multiplayer is isolated from Phrolova AI logic and does not use Express.

It uses:

- `client/js/multiplayer.js`
- `client/js/audioManager.js`
- `client/js/skillManager.js`
- `client/js/supabaseConfig.js`
- Supabase tables from `supabase/schema.sql`

Multiplayer features:

- Username input
- Random matchmaking
- Waiting room
- Auto start when two players join
- X/O assignment
- Random first turn
- Realtime board sync
- Realtime chat
- Background music and click SFX:
  - `assets/audio/background.wav`
  - `assets/audio/click.wav`
  - multiplayer sound toggle
- Player Skills synced through Supabase:
  - Insight Move: 2 uses, highlights a recommended cell.
  - Undo Move: 1 use, rolls back the player's latest move before the opponent replies.
  - Harmony Shield: 1 automatic shield, cancels one opponent winning move.
- 20-second AFK rule
- Win/draw/AFK result handling
- Match history, latest 5 matches

If Supabase config is missing, UI shows:

```text
Supabase is not configured yet.
```

## Supabase Tables

Defined in:

```text
supabase/schema.sql
```

Tables:

- `multiplayer_rooms`
  - room status, players, board, turn, skills, move history, winner, result, timestamps
  - includes `skill_state` and `move_history`
- `multiplayer_messages`
  - realtime chat messages per room
- `multiplayer_history`
  - completed match records

Realtime should be enabled for:

- `multiplayer_rooms`
- `multiplayer_messages`

`multiplayer_history` is queried normally and does not need realtime.

## Important Files

```text
client/index.html
client/css/style.css
client/js/app.js
client/js/audioManager.js
client/js/skillManager.js
client/js/multiplayer.js
client/js/supabaseConfig.js
client/assets/audio/phrolova_welcome.mp3
server/server.js
server/routes/gameRoutes.js
server/controllers/gameController.js
server/data/scoreStore.js
server/services/minimaxService.js
server/services/playerSkillService.js
server/services/phrolovaSkillService.js
server/services/maestroAbilityService.js
supabase/schema.sql
README.md
```

## Deployment Summary

### Frontend

Deploy `client/` to GitHub Pages.

GitHub Pages hosts:

- UI
- Vs Phrolova static fallback
- Supabase Multiplayer frontend

### Backend

Deploy the Express app to Render.

Render commands:

```bash
npm install
npm start
```

Backend health check:

```text
https://your-render-app.onrender.com/api/game/status
```

### Supabase

1. Create Supabase project.
2. Run `supabase/schema.sql`.
3. Enable Realtime for `multiplayer_rooms` and `multiplayer_messages`.
4. Fill `client/js/supabaseConfig.js`:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-public-key";
```

Never expose the Supabase service role key in frontend code.

If the database already existed before multiplayer skills were added, run this SQL in Supabase:

```sql
alter table public.multiplayer_rooms
  add column if not exists skill_state jsonb not null default '{"player_x":{"insight":2,"undo":1,"shield":"ready"},"player_o":{"insight":2,"undo":1,"shield":"ready"}}'::jsonb;

alter table public.multiplayer_rooms
  add column if not exists move_history jsonb not null default '[]'::jsonb;
```

## Current Data Storage

- Vs Phrolova backend mode: in-memory Node.js state.
- Vs Phrolova static fallback: in-memory browser state.
- Multiplayer online: Supabase Postgres.

## Validation Commands

```bash
node --check client/js/app.js
node --check client/js/audioManager.js
node --check client/js/skillManager.js
node --check client/js/multiplayer.js
node --check client/js/supabaseConfig.js
npm test
```

Current automated test suite:

- Jest
- Supertest
- 7 test suites
- 51 tests

## Notes

- GitHub Pages cannot run Express, so backend must be deployed separately.
- Multiplayer works on GitHub Pages because it talks directly to Supabase.
- Updating GitHub updates GitHub Pages and can trigger Render auto deploy, but Supabase schema changes must be run manually in Supabase SQL Editor.
- For demo, Supabase RLS can be disabled or loose as described in `schema.sql`.
- For production, RLS policies should be tightened.
