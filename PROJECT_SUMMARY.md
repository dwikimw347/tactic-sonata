# TacTic Sonata - Complete Project Summary

TacTic Sonata is a gothic-musical Tic Tac Toe web game built around a duel against Phrolova, the crimson conductor, plus a realtime online multiplayer mode powered by Supabase.

The project currently supports:

- A cinematic title screen.
- Mode selection between Vs Phrolova and Multiplayer.
- A full AI game mode with multiple difficulties, player skills, Phrolova skills, voice lines, background music, and static fallback logic.
- A realtime multiplayer mode with matchmaking, chat, synced board state, synced player skills, AFK handling, and match history.
- Static frontend deployment through GitHub Pages.
- Optional Express backend deployment through Render.
- Supabase database and realtime services for online multiplayer.

## Project Identity

- Project name: TacTic Sonata
- Theme: gothic, crimson, musical, ceremonial
- Core genre: Tic Tac Toe with stylized AI and realtime multiplayer
- Main antagonist: Phrolova
- Main tagline: A gothic duel in nine movements
- Visual direction: red-black gothic UI, gold/ivory accents, dramatic but compact game panels
- Audio direction: low background music, clear voice lines, subtle click sound effects

## Main Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Multiplayer database: Supabase Postgres
- Realtime sync: Supabase Realtime
- Frontend static hosting: GitHub Pages
- Backend hosting: Render
- Tests: Jest + Supertest
- Version control: Git + GitHub

## High-Level Architecture

The app is split into three major runtime areas:

1. Frontend UI
   - Located in `client/`.
   - Hosts the title screen, mode select, Vs Phrolova mode, multiplayer setup, multiplayer game screen, audio, and UI state.
   - Can run on GitHub Pages as a static website.

2. Express backend
   - Located in `server/`.
   - Provides `/api/game/...` endpoints for Vs Phrolova mode.
   - Stores Vs Phrolova game state in memory.
   - Can be deployed to Render.

3. Supabase multiplayer backend
   - SQL schema is in `supabase/schema.sql`.
   - Handles multiplayer rooms, chat messages, and match history.
   - Allows multiplayer to work from GitHub Pages without the Express backend.

## Main User Flow

1. User opens website.
2. Title Screen appears.
3. User clicks Start Game.
4. Mode Select appears.
5. User chooses:
   - Vs Phrolova
   - Multiplayer
6. Vs Phrolova opens the AI game screen.
7. Multiplayer opens the username / find match screen.

## Screen Flow

Main screens:

- `titleScreen`
- `modeSelectScreen`
- `gameScreen`
- `multiplayerFindMatchScreen`
- `multiplayerGameScreen`

Navigation rules:

- Title Screen -> Mode Select
- Mode Select -> Vs Phrolova
- Mode Select -> Multiplayer Find Match
- Vs Phrolova -> Mode Select
- Multiplayer Find Match -> Mode Select
- Multiplayer Game -> Find Match
- Multiplayer waiting state can be cancelled
- Multiplayer active match can be left, recording opponent win with result type `left`

The app uses show/hide screen logic instead of reloading the page.

## Vs Phrolova Mode

Vs Phrolova is the single-player AI mode. It can run in two ways.

### Backend API Mode

When the Express backend is available, the frontend uses API calls:

- `GET /api/game/status`
- `POST /api/game/start`
- `POST /api/game/move`
- `POST /api/game/reset`
- `GET /api/game/score`
- skill endpoints handled by the backend routes

Backend mode stores current game, score, match status, skills, and Maestro state in memory.

### Static Fallback Mode

When the backend is unavailable, such as on GitHub Pages, the frontend uses local browser logic in `client/js/app.js`.

Static fallback includes:

- Local game state
- Local board state
- Local score
- Local match tracking
- Local minimax
- Local difficulty behavior
- Local player skills
- Local Phrolova skills
- Local Maestro abilities
- Local no-draw/no-loss Maestro safeguards

This makes Vs Phrolova playable even when `/api/game/start` or `/api/game/move` cannot be reached.

## API Base URL

The frontend can be pointed to a deployed Render backend with:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://your-render-backend.onrender.com";
```

If this value is not set, local development can use `http://localhost:3000`.

GitHub Pages cannot run Express directly, so the backend must be deployed separately if API mode is desired.

## Vs Phrolova Difficulty Levels

The current difficulty list:

- Easy - wandering notes
- Normal - guarded melody
- Hard - sharp refrain
- Impossible - perfect requiem
- Maestro of the Lost Beyond - Phrolova fully commands the grid

Important behavior:

- Easy, Normal, and Hard use probabilistic Phrolova skill behavior.
- Impossible uses optimal minimax-style play.
- Maestro is intentionally unfair boss mode.
- Maestro is designed so Phrolova should not lose or draw.

## Phrolova Normal Skills

Normal Phrolova skill concepts:

- Perfect Cadence
  - Prioritizes winning moves.
- Crimson Interruption
  - Blocks player threats.
- Symphony Prediction
  - Uses minimax prediction.
- Echo Manipulation
  - Uses deceptive/randomized movement.

These skills are used by normal difficulties and can also be used as fallback behavior inside Maestro mode when no Maestro ability is currently needed.

## Maestro of the Lost Beyond

Maestro is the final boss difficulty. It is intentionally unfair and lore-driven.

Goals:

- Phrolova always wins.
- No draw result.
- No player win result.
- If the game approaches draw or player win, Maestro abilities intervene.
- If abilities are already used, anti-draw move selection keeps a winning path open.
- AI can bait and manipulate the player instead of playing only fair minimax.

## Maestro Ability Priority

The Maestro pipeline is:

1. Detect critical loss or draw danger.
2. Use Maestro abilities to intervene.
3. Use normal Phrolova skills if no Maestro ability triggers.
4. Use anti-draw minimax/fork-forcing fallback.

Critical states include:

- Player has a direct win threat.
- Player can create a fork.
- Board is nearly full.
- Phrolova has no clean winning path.
- Player just completed a winning line.
- The board state is drifting toward draw.

## Maestro Ability 1 - Resonance Override

Resonance Override converts one player mark into Phrolova's mark.

Usage:

- Can be used once per game.
- Used to convert for immediate win.
- Used to create forks.
- Used to deny player momentum.
- Used to break draw symmetry.
- Used to reopen Phrolova winning paths.

Effect:

- Converts one player cell.
- Marks ability as used.
- Adds move history.
- Returns ability metadata for UI/audio/dialog.

Frontend effect class:

```text
resonance-override
```

Dedicated ability dialog:

```text
With a wave of my baton, I attune the frequencies of this grid.
```

Dedicated audio:

```text
client/assets/audio/phrolova_resonance_override.mp3
```

## Maestro Ability 2 - Hecate's Shadow

Hecate's Shadow temporarily removes one player mark.

Usage:

- Triggers on direct threats.
- Triggers on fork potential.
- Triggers on developing player lines.
- Can be forced by Maestro bait strategy.
- Can emergency-remove a completed player line.

Normal shadow behavior:

- A player mark is removed temporarily.
- Phrolova moves.
- If Phrolova does not occupy the shadow cell, the player mark is restored.
- If Phrolova occupies the shadow cell, the player mark does not return.

Emergency completed-line behavior:

- If player already formed a full winning line, Hecate can remove one mark from that line.
- In this case, Phrolova must occupy the shadow cell.
- This prevents player win from being finalized.

Frontend effect class:

```text
hecate-shadow
```

Dedicated ability dialog:

```text
Hecate standeth at the crossroads of fate...
```

Dedicated audio:

```text
client/assets/audio/phrolova_hecate_shadow.mp3
```

## Maestro Ability 3 - Symphony of Rebirth

Symphony of Rebirth rolls the board back and gives Phrolova a bonus mark.

Usage:

- Can be used once per match/session.
- Triggers before player win is finalized.
- Triggers before draw is finalized.
- Triggers when draw is imminent.
- Triggers when Phrolova has no winning path.
- Triggers when player threat is too dangerous.

Behavior:

- Rolls board back using board history.
- Clears temporary effects.
- Resets winner/status back to playing.
- Places Phrolova bonus mark in center if possible.
- If center is occupied, chooses the best available move.
- Does not award player score when it prevents a player win.

Frontend effect class:

```text
symphony-rebirth
```

Dedicated ability dialog:

```text
Death is but prelude... let the melody be reborn.
```

Dedicated audio:

```text
client/assets/audio/phrolova_symphony_of_rebirth.mp3
```

## Maestro State

Maestro state includes:

```js
maestro: {
  resonanceUsed: false,
  symphonyUsed: false,
  shadowCount: 0,
  shadowUsedCount: 0
}
```

Ability usage also includes:

```js
abilityUsage: {
  resonanceOverrideUsed: false,
  symphonyOfRebirthUsed: false
}
```

Temporary effects include:

```js
temporaryEffects: {
  hecateShadow: null
}
```

Board history is stored in:

```js
boardHistory: []
```

## Maestro Winner Safety

Winner detection was tightened so false-positive wins cannot happen.

Rules:

- A winner only exists when one of the 8 winning lines has 3 matching marks.
- A 2-in-a-row threat is never a winner.
- Round finalization validates the final board before recording score.
- Winner checks happen after temporary effects are restored or resolved.
- Hecate emergency behavior can prevent a completed player line from being finalized.

Backend and static fallback both have explicit `checkWinner(board)` logic.

## Player Skills

Player skills are available in Vs Phrolova and Multiplayer.

### Insight Move

Purpose:

- Shows one recommended move.
- Does not mutate game state.
- Highlights a cell visually.

Limit:

- 2 uses per match.

### Undo Move

Purpose:

- Rewinds the player's latest move.

Vs Phrolova:

- Uses local/backend history.

Multiplayer:

- Syncs rollback through Supabase.
- Only allowed before the opponent has moved after the player's latest move.

Limit:

- 1 use per match.

### Harmony Shield

Purpose:

- Prevents one direct losing move.

Vs Phrolova:

- Can block a fatal AI move.

Multiplayer:

- Cancels one opponent winning move.
- Shield state is synced in Supabase.

Limit:

- 1 use per match.

## Dialogue System

Phrolova dialogue is centralized in `client/js/app.js`.

Normal dialogue categories:

- `playing`
- `win`
- `lose`
- `draw`

Each category has 3 possible lines. Only one line is randomly selected per trigger.

Important trigger rules:

- Playing dialogue changes only when Phrolova moves.
- Ability dialogue changes when a Maestro ability activates.
- End-state dialogue changes on win/lose/draw.
- Player clicks do not trigger Phrolova dialogue.
- UI clicks do not trigger Phrolova dialogue.
- Begin Match, Reset, dropdown changes, and symbol choice do not randomize playing dialogue.

Ability dialogue has priority over normal playing dialogue.

## Voice and Audio System

The project has several audio categories:

- Background music
- Click SFX
- Phrolova welcome voice
- Phrolova normal dialogue voice
- Phrolova Maestro ability voice

## Background Music

Asset:

```text
client/assets/audio/background.wav
```

Rules:

- Uses a singleton background music instance.
- Prevents duplicate stacking.
- Loops continuously while inside a game mode.
- Stops when returning to Mode Select.
- Does not play on title screen or mode select.
- Volume has been reduced so voice lines stay clear.

## Click SFX

Asset:

```text
client/assets/audio/click.wav
```

Used on important user interactions:

- Start Game
- Mode selection
- Back buttons
- Begin Match
- Reset
- Sound toggle
- Dropdown changes
- Symbol choice
- Player board click
- Player skills
- Multiplayer Find Match
- Multiplayer Send Chat
- Multiplayer board move
- Multiplayer skill buttons
- Multiplayer leave/back actions

Click SFX respects Sound Off.

## Phrolova Voice Controller

Phrolova voice uses one shared controller:

```js
currentPhrolovaVoice
```

Rules:

- Only one Phrolova voice can play at a time.
- New Phrolova voice stops the previous one.
- Welcome voice and dialogue voice do not overlap.
- Sound Off stops active Phrolova voice.
- Back to Mode Select stops active Phrolova voice.
- Background music is not stopped by the voice controller.

## Welcome Dialogue

When entering Vs Phrolova, the UI displays:

```text
Welcome, wanderer, to this humble grid. I am Phrolova, the silent conductor of souls... come, let us begin our solemn symphony of life and death.
```

Welcome audio:

```text
client/assets/audio/phrolova_welcome.mp3
```

It plays only when entering Vs Phrolova mode, not on Begin Match, Reset, player move, or AI move.

## UI and Layout

Main visual requirements currently implemented:

- Title screen appears before the game.
- Mode select appears after Start Game.
- Vs Phrolova keeps its board-centered layout.
- Left panel contains opponent/profile/dialog/control/video elements.
- Player Skills remain inside the main board boundary.
- Current Stage text is clamped so long text does not overflow.
- Dropdown options use dark gothic styling.
- Control buttons are compact and centered.
- Phrolova video appears under the left control buttons.
- Mobile layout has been optimized for better full-page display and stacking.

Key visual asset:

```text
client/assets/video/phrolova-edit.mp4
```

The video:

- Autoplays.
- Loops.
- Is muted.
- Uses `playsinline`.
- Does not block clicks.
- Is visually subtle.

## Multiplayer Mode

Multiplayer is realtime online 1 vs 1 using Supabase. It does not depend on the Express backend.

Main files:

- `client/js/multiplayer.js`
- `client/js/audioManager.js`
- `client/js/skillManager.js`
- `client/js/supabaseConfig.js`
- `supabase/schema.sql`

## Multiplayer Flow

1. User selects Multiplayer from Mode Select.
2. User enters username.
3. User clicks Find Match.
4. App searches for a waiting room.
5. If room exists, user joins it.
6. If no room exists, app creates a waiting room.
7. When two players are present, room becomes playing.
8. Board state syncs through Supabase Realtime.
9. Game ends by win, draw, AFK, or leave.
10. Match history is saved.

## Multiplayer Username Rules

- Username is required.
- Minimum length: 2 characters.
- Maximum length: 16 characters.
- Invalid username shows a small UI error.

## Multiplayer Room State

Supabase stores:

- Room id
- Status
- Player X name
- Player O name
- Player X id
- Player O id
- Current turn
- Board
- Winner
- Result type
- Last move time
- Skill state
- Move history

## Multiplayer Turn Rules

A player can move only if:

- Room status is `playing`.
- Game is not finished.
- It is their turn.
- The clicked cell is empty.

After a valid move:

- Board updates in Supabase.
- Winner/draw is checked in frontend.
- Current turn switches if game continues.
- `last_move_at` updates.
- Move history updates.

Realtime updates from the opponent do not play local click SFX.

## Multiplayer AFK Rule

There is no normal turn timer, but there is an AFK rule.

Rules:

- If a player does not move for 20 seconds during their turn, they lose by AFK.
- Opponent wins.
- Result is recorded as `afk`.
- History entry is inserted.
- Clients validate `last_move_at` to avoid stale AFK finishes.

## Multiplayer Chat

Features:

- Realtime chat per room.
- Sender name is shown.
- Message max length is 120 characters.
- Text is rendered safely using text content, not raw HTML.
- Messages auto-scroll.
- Messages persist during the match.

## Multiplayer Player Skills

Multiplayer skills are synced through Supabase in `skill_state`.

Default structure:

```json
{
  "player_x": {
    "insight": 2,
    "undo": 1,
    "shield": "ready"
  },
  "player_o": {
    "insight": 2,
    "undo": 1,
    "shield": "ready"
  }
}
```

Move history is stored in:

```json
[]
```

Skill rules:

- Insight is visual only and does not update the room board.
- Undo rolls back through Supabase.
- Shield is synced so both clients see spent/ready status.
- Skills are source-of-truth from Supabase, not only local UI state.

## Supabase Configuration

Frontend config file:

```text
client/js/supabaseConfig.js
```

Expected placeholder:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Important:

- Use the anon public key only.
- Do not expose the service role key.
- If config is missing, UI shows:

```text
Supabase is not configured yet.
```

If Supabase cannot be reached or policies block access, UI can show:

```text
Unable to reach Supabase. Check configuration and policies.
```

## Supabase Tables

Defined in:

```text
supabase/schema.sql
```

### multiplayer_rooms

Purpose:

- Stores active/waiting/finished multiplayer rooms.

Important fields:

- `id`
- `status`
- `player_x`
- `player_o`
- `player_x_id`
- `player_o_id`
- `current_turn`
- `board`
- `winner`
- `result_type`
- `skill_state`
- `move_history`
- `created_at`
- `updated_at`
- `last_move_at`

Expected statuses:

- `waiting`
- `playing`
- `finished`
- `cancelled`

Expected result types:

- `win`
- `draw`
- `afk`
- `left`

### multiplayer_messages

Purpose:

- Stores room chat messages.

Important fields:

- `id`
- `room_id`
- `sender_id`
- `sender_name`
- `message`
- `created_at`

### multiplayer_history

Purpose:

- Stores completed match results.

Important fields:

- `id`
- `room_id`
- `player_x`
- `player_o`
- `winner`
- `result_type`
- `started_at`
- `ended_at`

## Supabase Realtime

Realtime should be enabled for:

- `multiplayer_rooms`
- `multiplayer_messages`

Realtime is not required for:

- `multiplayer_history`

History is queried normally.

## Supabase Migration Notes

If the database existed before multiplayer skills were added, run:

```sql
alter table public.multiplayer_rooms
  add column if not exists skill_state jsonb not null default '{"player_x":{"insight":2,"undo":1,"shield":"ready"},"player_o":{"insight":2,"undo":1,"shield":"ready"}}'::jsonb;

alter table public.multiplayer_rooms
  add column if not exists move_history jsonb not null default '[]'::jsonb;
```

If the database existed before Leave Match support, make sure `result_type = 'left'` is allowed by the latest schema constraint.

For demo use, RLS can be disabled or made permissive as described in `supabase/schema.sql`.

For production, RLS should be tightened.

## Important Files

Frontend:

```text
client/index.html
client/css/style.css
client/js/app.js
client/js/audioManager.js
client/js/skillManager.js
client/js/multiplayer.js
client/js/supabaseConfig.js
```

Backend:

```text
server/server.js
server/routes/gameRoutes.js
server/controllers/gameController.js
server/data/scoreStore.js
server/services/minimaxService.js
server/services/playerSkillService.js
server/services/phrolovaSkillService.js
server/services/maestroAbilityService.js
```

Database:

```text
supabase/schema.sql
```

Docs:

```text
README.md
PROJECT_SUMMARY.md
```

Tests:

```text
tests/difficulty.test.js
tests/gameApi.test.js
tests/skillApi.test.js
tests/phrolovaSkill.test.js
tests/playerSkill.test.js
tests/minimax.test.js
tests/maestroAbility.test.js
```

## Important Audio Assets

```text
client/assets/audio/background.wav
client/assets/audio/click.wav
client/assets/audio/phrolova_welcome.mp3
client/assets/audio/phrolova_playing_1.mp3
client/assets/audio/phrolova_playing_2.mp3
client/assets/audio/phrolova_playing_3.mp3
client/assets/audio/phrolova_winning_1.mp3
client/assets/audio/phrolova_winning_2.mp3
client/assets/audio/phrolova_winning_3.mp3
client/assets/audio/phrolova_losing_1.mp3
client/assets/audio/phrolova_losing_2.mp3
client/assets/audio/phrolova_losing_3.mp3
client/assets/audio/phrolova_draw_1.mp3
client/assets/audio/phrolova_draw_2.mp3
client/assets/audio/phrolova_draw_3.mp3
client/assets/audio/phrolova_resonance_override.mp3
client/assets/audio/phrolova_hecate_shadow.mp3
client/assets/audio/phrolova_symphony_of_rebirth.mp3
```

## Important Video/Image Assets

```text
client/assets/video/phrolova-edit.mp4
client/assets/images/
```

The old silhouette image was replaced by the Phrolova MP4 video.

## Deployment - Frontend

Frontend is deployed through GitHub Pages.

GitHub Pages hosts:

- Title screen
- Mode select
- Vs Phrolova static fallback
- Supabase multiplayer frontend
- All static assets

GitHub Pages does not run Express.

## Deployment - Backend

Backend can be deployed to Render.

Render build command:

```bash
npm install
```

Render start command:

```bash
npm start
```

Backend health/status endpoint:

```text
https://your-render-app.onrender.com/api/game/status
```

If GitHub and Render are connected and Auto Deploy is enabled, pushing to GitHub can trigger Render redeploy.

## Deployment - Supabase

Supabase setup:

1. Create Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Enable Realtime for `multiplayer_rooms`.
5. Enable Realtime for `multiplayer_messages`.
6. Copy Project URL.
7. Copy anon public key.
8. Fill `client/js/supabaseConfig.js`.
9. Deploy frontend to GitHub Pages.

Supabase Project URL and anon key are found in:

```text
Supabase Dashboard -> Project Settings -> API
```

Use:

- Project URL
- anon public key

Do not use:

- service_role key

## Current Data Storage

Vs Phrolova backend mode:

- In-memory Node.js state.
- State resets when backend restarts.

Vs Phrolova static fallback:

- In-memory browser state.
- State resets on page reload.

Multiplayer:

- Supabase Postgres.
- Rooms, messages, and history persist according to database state.

## Testing and Validation

Syntax checks:

```bash
node --check client/js/app.js
node --check client/js/audioManager.js
node --check client/js/skillManager.js
node --check client/js/multiplayer.js
node --check client/js/supabaseConfig.js
node --check server/controllers/gameController.js
node --check server/services/maestroAbilityService.js
node --check server/services/minimaxService.js
```

Full test suite:

```bash
npm.cmd test
```

On Windows PowerShell, `npm.cmd test` is safer than `npm test` if script execution policy blocks npm.

Current automated test result:

- 7 test suites passed
- 51 tests passed

Latest additional manual/simulation validation:

- Maestro using first-open player strategy ends with Phrolova win.
- Maestro using center/corner priority player strategy ends with Phrolova win.
- Maestro using last-open player strategy ends with Phrolova win.
- Hecate, Resonance, and Symphony all appear in Maestro simulations.
- False 2-mark winner bug is blocked by strict winner validation.

## Common Troubleshooting

### Begin Match does nothing on GitHub Pages

Cause:

- GitHub Pages cannot run Express.

Expected solution:

- Static fallback should run locally in browser.
- If API mode is needed, deploy backend to Render and set `window.TACTIC_SONATA_API_BASE_URL`.

### Supabase is not configured yet

Cause:

- `client/js/supabaseConfig.js` still has placeholder values.

Fix:

- Add Project URL and anon public key from Supabase Dashboard.

### Unable to reach Supabase. Check configuration and policies.

Possible causes:

- Wrong Supabase URL.
- Wrong anon key.
- Tables were not created.
- Realtime not enabled.
- RLS policies block select/insert/update.
- Browser is loading old GitHub Pages cache.

Fix:

- Confirm config.
- Run `supabase/schema.sql`.
- Enable Realtime for required tables.
- Review RLS/policies.
- Commit and push updated config if appropriate.

### Background music gets louder

Cause:

- Duplicate audio instances.

Current fix:

- Background music uses singleton audio logic.
- Music starts only when entering game modes.
- Music stops when returning to Mode Select.

### Phrolova voices overlap

Cause:

- Welcome and dialog voices were previously separate audio objects.

Current fix:

- All Phrolova voices share one controller.
- New voice stops old voice first.

### Maestro says player won with only 2 marks

Cause:

- Previous winner detection could trust non-final/heuristic state.

Current fix:

- `checkWinner(board)` only accepts 3 matching marks in a winning line.
- Finalization validates board winner before scoring.

## GitHub Update Workflow

Use this from the project folder:

```bash
git status
git add .
git commit -m "Update TacTic Sonata"
git push origin main
```

If the active branch is not `main`:

```bash
git branch
git push origin your-branch-name
```

Recommended commit messages by change type:

```bash
git commit -m "Improve Maestro anti-draw AI"
git commit -m "Update multiplayer Supabase skills"
git commit -m "Polish mobile layout"
git commit -m "Update project summary"
```

After pushing:

- GitHub Pages may take a few minutes to update.
- Render redeploys only if the repo is connected and Auto Deploy is enabled.
- Supabase schema changes still need to be run manually in Supabase SQL Editor.

## Current Latest Change Set

The latest project state includes:

- Stronger Maestro no-draw/no-loss logic.
- Critical-state detection for loss/draw danger.
- Anti-draw move scoring.
- Emergency Hecate response to completed player lines.
- Backend and static fallback parity for Maestro behavior.
- Updated project summary with full architecture and deployment notes.

Files most recently affected:

```text
PROJECT_SUMMARY.md
client/js/app.js
server/controllers/gameController.js
server/services/maestroAbilityService.js
```

## Maintenance Notes

- Keep backend Maestro logic and frontend static fallback Maestro logic in sync.
- Keep Supabase schema and frontend multiplayer expectations in sync.
- Do not expose Supabase service role key in frontend.
- Do not rely on Express backend for GitHub Pages multiplayer.
- Run tests after changing AI, score, minimax, game state, or skill logic.
- Run browser/manual validation after changing layout, audio, navigation, or Supabase flow.
- Avoid changing difficulty behavior unless specifically requested.
- Avoid changing dialog triggers unless testing confirms player clicks do not retrigger Phrolova dialogue.

