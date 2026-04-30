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
- Back navigation between title/mode/game screens without page reload.
- Centralized Phrolova voice playback so welcome/dialog voices do not overlap.
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

## Latest Updates

- Added Back buttons:
  - Vs Phrolova -> Mode Select
  - Multiplayer Find Match -> Mode Select
  - Multiplayer Game -> Find Match / Cancel Search / Leave Match
- Added click SFX for important local user interactions across Vs Phrolova and Multiplayer.
- Fixed mode audio cleanup:
  - Background music stops when returning to Mode Select.
  - Multiplayer background music stops when leaving the arena.
  - Phrolova voice stops when leaving Vs Phrolova.
- Fixed Phrolova voice overlap:
  - Welcome voice and dialog voices now share one `currentPhrolovaVoice` controller.
  - Starting match, next round, reset, Sound Off, and new dialog playback stop the previous Phrolova voice first.
- Improved Maestro of the Lost Beyond:
  - Maestro no longer behaves like fair Impossible minimax.
  - Backend and GitHub Pages static fallback both use aggressive Maestro ability logic.
  - Hecate's Shadow can trigger from direct threats, fork potential, and developing player lines.
  - Resonance Override can convert for victory, create forks, or steal player momentum.
  - Symphony of Rebirth triggers more aggressively before player wins/draws are finalized.
  - Maestro tracks `shadowCount`, `resonanceUsed`, and `symphonyUsed`.
  - Maestro uses bait / controlled-loss style moves before finishing with stronger play.
- Added dedicated Maestro ability dialog/audio handling:
  - Resonance Override uses `client/assets/audio/phrolova_resonance_override.mp3`.
  - Hecate's Shadow uses `client/assets/audio/phrolova_hecate_shadow.mp3`.
  - Symphony of Rebirth uses `client/assets/audio/phrolova_symphony_of_rebirth.mp3`.
  - Ability dialog/audio has priority over normal playing/win/lose/draw dialog when an ability activates.
  - Ability names are normalized on the frontend so backend/local fallback naming differences still resolve correctly.
- Fixed Maestro ability toast and dialog trigger behavior:
  - Added `#abilityToast` below the board with timed show/hide styling.
  - `showAbilityToast()` uses one timer controller so Symphony of Rebirth and other ability notices do not get stuck.
  - `handlePhrolovaTurn()` centralizes Phrolova dialog updates.
  - Player cell clicks no longer retrigger old Maestro ability dialogs from stale game state.
  - Dialog changes are limited to Phrolova move, Maestro ability activation, or end-state win/lose/draw.
- Fixed Maestro Hecate/fallback AI flow:
  - Hecate's Shadow is no longer blocked by Resonance/Symphony prerequisites.
  - Hecate can trigger consistently from broader threat lines and is capped to avoid endless spam.
  - Added forcing strategy so Maestro can intentionally create a player threat when Hecate has not appeared yet.
  - Maestro decision priority is now: Maestro abilities -> normal Phrolova skills -> minimax fallback.
  - The same Hecate/forcing/fallback behavior exists in the GitHub Pages static fallback.

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

All Phrolova voice lines now use one shared controller in `client/js/app.js`, so only one Phrolova voice can play at a time.

Maestro ability voice lines are mapped in `client/js/app.js` through `MAESTRO_ABILITY_DIALOGS` and use the same shared Phrolova voice controller:

```text
client/assets/audio/phrolova_resonance_override.mp3
client/assets/audio/phrolova_hecate_shadow.mp3
client/assets/audio/phrolova_symphony_of_rebirth.mp3
```

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
- Back/leave controls:
  - Back to Mode Select from Find Match
  - Cancel Search while waiting
  - Leave Match while playing, with opponent win recorded as `left`
  - Back to Find Match after finished games
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
  - `result_type` supports `win`, `draw`, `afk`, and `left`

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
client/assets/audio/phrolova_resonance_override.mp3
client/assets/audio/phrolova_hecate_shadow.mp3
client/assets/audio/phrolova_symphony_of_rebirth.mp3
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

If the database existed before Leave Match support, also run the latest constraint migration in `supabase/schema.sql` so `result_type = 'left'` is accepted.

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

Latest validation run:

```bash
node --check server/services/maestroAbilityService.js
node --check server/controllers/gameController.js
node --check client/js/app.js
npm.cmd test
```

Result: 7 test suites passed, 51 tests passed.

## Notes

- GitHub Pages cannot run Express, so backend must be deployed separately.
- Multiplayer works on GitHub Pages because it talks directly to Supabase.
- Updating GitHub updates GitHub Pages and can trigger Render auto deploy, but Supabase schema changes must be run manually in Supabase SQL Editor.
- For demo, Supabase RLS can be disabled or loose as described in `schema.sql`.
- For production, RLS policies should be tightened.
