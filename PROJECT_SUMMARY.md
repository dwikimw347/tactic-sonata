# TacTic Sonata - Project Summary

TacTic Sonata adalah game Tic Tac Toe bertema gothic-musical. Pemain masuk ke duel sembilan kotak melawan Phrolova, sang crimson conductor, atau bermain realtime 1 vs 1 melalui mode Multiplayer.

Project ini dibangun sebagai web app statis dengan dukungan backend opsional. Mode Vs Phrolova tetap bisa dimainkan di GitHub Pages melalui logic lokal di frontend, sementara backend Express dapat dipakai saat development lokal atau deploy Render. Mode Multiplayer berjalan dengan Supabase Realtime sehingga tetap bisa digunakan dari GitHub Pages tanpa Express backend.

## Core Concept

TacTic Sonata bukan sekadar Tic Tac Toe biasa. Game ini memakai tema panggung musikal gelap, dialog puitis Phrolova, voice line, background music, sound effect, serta skill khusus yang membuat permainan terasa seperti duel teatrikal.

Alur utama:

1. Player membuka title screen.
2. Player menekan Start Game.
3. Player memilih Vs Phrolova atau Multiplayer.
4. Vs Phrolova masuk ke duel melawan AI.
5. Multiplayer masuk ke matchmaking online realtime.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend opsional: Node.js + Express
- Multiplayer realtime: Supabase Realtime
- Database multiplayer: Supabase Postgres
- Frontend deploy: GitHub Pages
- Backend deploy: Render
- Testing: Jest + Supertest

## Game Modes

### Vs Phrolova

Mode single-player melawan AI Phrolova. Mode ini punya:

- difficulty Easy, Normal, Hard, Impossible, dan Maestro of the Lost Beyond
- player skills
- Phrolova skills
- dialog Phrolova
- voice line Phrolova
- background music dan SFX
- fallback logic lokal agar tetap playable di GitHub Pages

Jika backend Express tersedia, mode ini bisa memakai API `/api/game/...`. Jika backend tidak tersedia, frontend otomatis memakai local game logic.

### Multiplayer

Mode realtime online 1 vs 1 memakai Supabase. Player memasukkan username, mencari room, lalu bermain melawan player lain secara live.

Fitur multiplayer:

- random matchmaking
- realtime board sync
- realtime chat
- player X/O assignment
- current turn sync
- AFK rule 20 detik
- match history
- player skills tersinkron lewat Supabase

## Difficulty

Difficulty yang tersedia:

- Easy - wandering notes
- Normal - guarded melody
- Hard - sharp refrain
- Impossible - perfect requiem
- Maestro of the Lost Beyond - Phrolova fully commands the grid

Impossible adalah mode fair optimal berbasis minimax.

Maestro of the Lost Beyond adalah boss mode yang sengaja tidak adil. Phrolova memakai ability khusus untuk mencegah draw atau kekalahan, memanipulasi board, dan menjaga agar ia hampir selalu menang. Pada versi terbaru, Maestro memakai sistem phase-based forcing agar Hecate's Shadow, Resonance Override, dan Symphony of Rebirth muncul dalam satu match sebelum Phrolova masuk ke fase finishing. Ability Maestro juga bersifat unlimited/no cooldown sehingga Phrolova dapat terus memakai manipulasi board saat game menuju draw atau player win.

## Phrolova Skills

Phrolova memiliki beberapa skill utama:

- **Echo Manipulation**  
  Phrolova memilih langkah yang terasa tidak sepenuhnya logis atau sulit ditebak. Skill ini memberi kesan bahwa ia sedang menipu ritme permainan dan memancing player masuk ke posisi buruk.

- **Perfect Cadence**  
  Phrolova menemukan langkah kemenangan ketika ada peluang menyelesaikan tiga mark dalam satu garis. Ini adalah final note yang mengakhiri ronde untuk Phrolova.

- **Crimson Interruption**  
  Phrolova memblokir ancaman player sebelum player bisa menang. Skill ini membuat langkah player terasa dipotong atau disenyapkan.

- **Symphony Prediction**  
  Phrolova membaca kemungkinan langkah berikutnya dan memilih move terbaik memakai logic prediksi/minimax. Ini adalah skill paling strategis untuk menjaga board tetap menguntungkan.

## Maestro Abilities

Pada difficulty Maestro of the Lost Beyond, Phrolova memiliki ability khusus:

- **Resonance Override**  
  Mengubah satu mark player menjadi mark Phrolova. Pada Maestro terbaru, ability ini bisa dipakai berkali-kali untuk menghancurkan fork, membuka winning path, atau mencegah draw.

- **Hecate's Shadow**  
  Menghilangkan sementara satu mark player. Jika Phrolova mengisi cell itu, mark player tidak kembali. Ability ini juga bisa dipakai berulang saat player punya ancaman atau bahkan sudah membentuk garis menang.

- **Symphony of Rebirth**  
  Mengulang state board ke 2-3 snapshot sebelumnya lalu memberi Phrolova bonus mark. Ability ini sekarang no cooldown, lebih sering aktif, dan memakai `maestroHistory` untuk mengunci mark yang sebelumnya terkena Resonance Override atau Hecate's Shadow menjadi milik Phrolova secara permanen.

Maestro memakai ability ini untuk mencegah player menang, mencegah draw, memecah symmetry board, dan menciptakan jalur kemenangan baru. AI melacak penggunaan ability melalui `maestroUsage`: `shadowUsed`, `resonanceUsed`, dan `rebirthUsed`.

Dari state ini, Maestro bergerak melalui fase `forceShadow`, `forceResonance`, `forceRebirth`, lalu `finish`. Selama fase forcing, Phrolova sengaja menunda kemenangan, memancing ancaman player, dan memilih setup move yang membuka kondisi ability berikutnya. Setelah semua ability muncul, AI kembali ke prioritas dominasi normal: Maestro abilities, normal skills, lalu minimax.

Resonance Override dan Hecate's Shadow mencatat aksi manipulasi ke `maestroHistory`, lalu Symphony of Rebirth dapat memutar ulang board sambil mengubah hasil manipulasi tersebut menjadi keuntungan permanen untuk Phrolova. Behavior ini diterapkan di backend Express dan juga fallback lokal frontend untuk GitHub Pages.

## Player Skills

Player memiliki tiga skill:

- **Insight Move**  
  Menampilkan rekomendasi langkah terbaik secara visual.

- **Undo Move**  
  Mengembalikan langkah player terakhir sesuai aturan mode.

- **Harmony Shield**  
  Melindungi player dari satu ancaman kalah langsung.

Di Multiplayer, skill ini disimpan dan disinkronkan melalui Supabase agar kedua player melihat state yang sama.

## Audio and Dialogue

TacTic Sonata memakai:

- background music
- click sound effect
- Phrolova welcome voice
- Phrolova playing/win/lose/draw voice line
- Maestro ability voice line

Sistem voice Phrolova memakai satu controller agar audio tidak overlap. Jika voice baru dimainkan, voice sebelumnya dihentikan dulu. Sound toggle juga mematikan background music, SFX, dan voice sesuai mode.

Dialog Phrolova hanya berubah saat:

- Phrolova bergerak
- Phrolova memakai Maestro ability
- game mencapai win/lose/draw

Dialog tidak berubah hanya karena player klik cell, klik reset, pilih dropdown, atau memilih symbol.

## Multiplayer Backend

Supabase menyimpan:

- room multiplayer
- board state
- player username
- current turn
- chat messages
- skill state
- move history
- match history

Tabel utama:

- `multiplayer_rooms`
- `multiplayer_messages`
- `multiplayer_history`

Realtime perlu diaktifkan untuk:

- `multiplayer_rooms`
- `multiplayer_messages`

## Deployment

Frontend dapat dideploy ke GitHub Pages.

Backend Express dapat dideploy ke Render jika ingin memakai API mode untuk Vs Phrolova.

Supabase diperlukan untuk Multiplayer.

Config Supabase ada di:

```text
client/js/supabaseConfig.js
```

Backend API URL opsional dapat diset dengan:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://your-render-backend.onrender.com";
```

Jika backend tidak tersedia, mode Vs Phrolova tetap berjalan memakai fallback lokal frontend.

## Important Files

```text
client/index.html
client/css/style.css
client/js/app.js
client/js/audioManager.js
client/js/skillManager.js
client/js/multiplayer.js
client/js/supabaseConfig.js
server/controllers/gameController.js
server/services/minimaxService.js
server/services/phrolovaSkillService.js
server/services/playerSkillService.js
server/services/maestroAbilityService.js
supabase/schema.sql
```

## Current Status

Project saat ini sudah memiliki:

- mode Vs Phrolova playable
- mode Multiplayer realtime Supabase
- skill system untuk player
- skill dan ability Phrolova
- Maestro boss AI dengan anti-draw/anti-loss behavior, phase-based forcing untuk semua ability, unlimited ability usage, dan Symphony of Rebirth berbasis `maestroHistory`
- audio, voice, SFX, dan dialog system
- title screen dan mode select
- GitHub Pages static fallback
- Render backend support
