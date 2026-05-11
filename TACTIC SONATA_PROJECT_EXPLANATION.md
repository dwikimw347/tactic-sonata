# TacTic Sonata - Complete Project Explanation

TacTic Sonata adalah game Tic Tac Toe bertema gothic-musical. Pemain memasuki duel sembilan kotak melawan Phrolova, seorang crimson conductor yang berbicara dengan gaya puitis dan teatrikal, atau bermain realtime melawan player lain melalui mode Multiplayer.

Project ini dirancang agar fleksibel untuk dua cara deploy:

- Frontend statis di GitHub Pages.
- Backend Express opsional di Render atau lokal.

Mode Vs Phrolova tetap bisa berjalan tanpa backend karena frontend memiliki fallback game logic lokal. Mode Multiplayer tidak memakai Express backend, melainkan Supabase Realtime agar bisa tetap berjalan dari static hosting.

## Konsep Utama

TacTic Sonata bukan hanya Tic Tac Toe biasa. Seluruh pengalaman dibuat seperti pertunjukan musikal gelap:

- board dianggap sebagai panggung sembilan gerakan;
- setiap mark X/O adalah note dalam komposisi;
- Phrolova berbicara melalui dialog gothic-musical;
- voice line, background music, dan SFX memperkuat suasana;
- skill player dan ability Phrolova membuat permainan terasa dramatis.

Flow dasar game:

1. User membuka website.
2. Title screen menampilkan judul TacTic Sonata.
3. User klik Start Game.
4. User memilih Vs Phrolova atau Multiplayer.
5. Jika memilih Vs Phrolova, user masuk ke game single-player.
6. Jika memilih Multiplayer, user masuk ke matchmaking Supabase.

## Tech Stack

- HTML, CSS, dan vanilla JavaScript untuk frontend.
- Node.js dan Express untuk backend opsional.
- Jest dan Supertest untuk test.
- Supabase Realtime untuk multiplayer online.
- Supabase Postgres untuk room, chat, skill state, dan match history.
- GitHub Pages untuk frontend static deploy.
- Render untuk backend Express jika ingin API online.

## Struktur Project

```text
client/
  index.html
  css/style.css
  js/app.js
  js/audioManager.js
  js/skillManager.js
  js/multiplayer.js
  js/supabaseConfig.js
  assets/audio/
  assets/images/
  assets/video/

server/
  server.js
  routes/gameRoutes.js
  controllers/gameController.js
  services/
    minimaxService.js
    aiDifficultyService.js
    phrolovaSkillService.js
    playerSkillService.js
    maestroAbilityService.js

supabase/
  schema.sql

tests/
  difficulty.test.js
  gameApi.test.js
  maestroAbility.test.js
  minimax.test.js
  phrolovaSkill.test.js
  playerSkill.test.js
  skillApi.test.js

README.md
PROJECT_SUMMARY.md
PROJECT_EXPLANATION.md
```

## Mode Vs Phrolova

Mode Vs Phrolova adalah mode single-player melawan AI. Mode ini bisa memakai backend Express jika tersedia, tetapi tetap playable di GitHub Pages melalui local fallback di `client/js/app.js`.

Fitur utama:

- pilihan difficulty;
- pilihan simbol X/O;
- board interaktif;
- match mode;
- score;
- player skills;
- Phrolova skills;
- Maestro boss abilities;
- dialog dan voice line Phrolova;
- background music dan SFX;
- fallback local AI jika API backend tidak tersedia.

Jika API backend aktif, frontend mengirim request ke endpoint seperti:

```text
POST /api/game/start
POST /api/game/move
POST /api/game/reset
GET  /api/game/status
GET  /api/game/score
```

Jika API gagal, frontend tidak berhenti. Game akan berpindah ke mode local fallback, sehingga tombol Begin Match tetap memulai game meskipun website dibuka dari GitHub Pages.

## Difficulty

TacTic Sonata memiliki lima difficulty:

- Easy - wandering notes
- Normal - guarded melody
- Hard - sharp refrain
- Impossible - perfect requiem
- Maestro of the Lost Beyond - Phrolova fully commands the grid

### Easy

Easy cenderung memberi move yang lebih sederhana dan tidak selalu optimal. Mode ini dibuat agar player bisa merasakan game tanpa tekanan besar.

### Normal

Normal mulai memakai strategi yang lebih masuk akal, tetapi masih memberi ruang untuk player menang.

### Hard

Hard lebih agresif dalam membaca ancaman, mencari peluang menang, dan memblokir player.

### Impossible

Impossible memakai minimax optimal. Mode ini fair, tetapi sangat kuat. Jika kedua pihak bermain optimal, hasilnya biasanya draw.

### Maestro of the Lost Beyond

Maestro adalah boss mode yang sengaja tidak fair. Phrolova tidak hanya bermain optimal, tetapi memanipulasi board dengan ability khusus. Tujuannya bukan sekadar bermain bagus, melainkan memberi kesan bahwa player sedang melawan karakter yang menguasai aturan permainan.

Maestro menggunakan prioritas:

1. Maestro abilities.
2. Normal Phrolova skills.
3. Minimax fallback.

Versi terbaru memakai `maestroUsage` dan phase-based forcing agar semua ability Maestro muncul dalam satu match.

## Phrolova Normal Skills

Phrolova memiliki skill normal yang bisa muncul di beberapa difficulty.

### Echo Manipulation

Echo Manipulation adalah langkah yang terasa menipu atau tidak sepenuhnya logis. Skill ini dipakai untuk memancing player masuk ke posisi yang buruk, memecah pola, atau membuat board terasa sulit dibaca.

### Perfect Cadence

Perfect Cadence adalah skill finishing. Jika Phrolova punya kesempatan menang dengan tiga mark dalam satu garis, ia dapat mengambil langkah tersebut sebagai final note.

### Crimson Interruption

Crimson Interruption dipakai untuk memblokir ancaman player. Jika player hampir menang, Phrolova memotong ritme itu sebelum garis kemenangan selesai.

### Symphony Prediction

Symphony Prediction memakai pembacaan move terbaik, termasuk minimax, untuk menjaga board tetap menguntungkan bagi Phrolova.

## Maestro Abilities

Maestro of the Lost Beyond memiliki tiga ability utama. Ability ini dibuat sebagai boss mechanic, bukan permainan fair.

### Resonance Override

Resonance Override mengubah satu mark player menjadi mark Phrolova. Ability ini dipakai untuk:

- menghancurkan fork player;
- membuka winning path;
- membalik momentum;
- memecah posisi yang menuju draw;
- membuat board terasa seperti direbut oleh Phrolova.

Pada versi terbaru, Resonance Override tidak lagi jarang muncul. AI memiliki fase khusus `forceResonance` untuk memastikan ability ini aktif dalam satu match.

### Hecate's Shadow

Hecate's Shadow menghilangkan sementara satu mark player. Jika cell shadow itu kemudian diisi oleh Phrolova, mark player tidak kembali.

Ability ini dipakai untuk:

- mematahkan ancaman 2-in-a-row;
- menghapus momentum player;
- memberi Phrolova ruang untuk membuat move berikutnya;
- memancing player merasa hampir menang, lalu menghancurkan garis tersebut.

Maestro memiliki fase `forceShadow` agar Hecate's Shadow muncul lebih awal dalam match.

### Symphony of Rebirth

Symphony of Rebirth memutar ulang board ke snapshot 2-3 turn sebelumnya, lalu memberi Phrolova advantage baru. Ability ini memakai `maestroHistory` untuk membaca manipulasi sebelumnya.

Jika Resonance Override atau Hecate's Shadow pernah memanipulasi mark tertentu, Symphony of Rebirth dapat mengunci hasil manipulasi itu menjadi keuntungan permanen untuk Phrolova.

Ability ini dipakai untuk:

- membatalkan draw;
- membatalkan player win;
- mengembalikan game ke posisi yang menguntungkan Phrolova;
- mengubah manipulasi lama menjadi dominasi permanen.

Maestro memiliki fase `forceRebirth` agar Symphony of Rebirth juga muncul dalam satu match.

## Phase-Based Maestro AI

AI Maestro melacak penggunaan ability melalui:

```js
maestroUsage = {
  resonanceUsed: false,
  shadowUsed: false,
  rebirthUsed: false
}
```

Dari state tersebut, Maestro bergerak melalui fase:

```text
forceShadow -> forceResonance -> forceRebirth -> finish
```

### forceShadow

Phrolova berusaha menciptakan atau menunggu kondisi agar Hecate's Shadow bisa aktif. Jika player belum punya ancaman, AI dapat memilih setup move yang membuka peluang player, lalu menggunakan Shadow untuk merusaknya.

### forceResonance

Phrolova mencari mark player yang bisa dikonversi. Jika belum ada target bagus, AI memainkan setup move agar player meninggalkan mark strategis yang bisa direbut.

### forceRebirth

Phrolova menciptakan kondisi board yang cocok untuk Symphony of Rebirth. Jika perlu, AI sengaja menunda kemenangan atau menciptakan situasi hampir kalah/draw agar Rebirth bisa dipakai.

### finish

Setelah ketiga ability sudah muncul, Phrolova kembali ke dominasi normal:

1. Maestro ability jika masih berguna.
2. Skill normal.
3. Minimax atau anti-draw move.

Dengan sistem ini, Maestro terasa seperti boss yang mempermainkan player, bukan sekadar minimax biasa.

## Player Skills

Player memiliki tiga skill taktis.

### Insight Move

Insight Move menampilkan satu rekomendasi langkah terbaik. Skill ini hanya visual dan tidak langsung mengubah board.

Di Vs Phrolova, rekomendasi dihitung berdasarkan kondisi board. Di Multiplayer, skill state disimpan di Supabase agar sinkron.

### Undo Move

Undo Move mengembalikan langkah terakhir sesuai aturan mode.

Di Vs Phrolova, Undo dapat menghapus langkah player dan respons Phrolova jika sudah terjadi. Di Multiplayer, Undo hanya boleh dipakai sebelum lawan melakukan move berikutnya dan harus meng-update Supabase room state.

### Harmony Shield

Harmony Shield melindungi player dari satu ancaman kalah langsung.

Di Multiplayer, shield tersimpan dalam `skill_state` room. Jika lawan membuat winning move dan shield masih ready, move itu dibatalkan dan shield berubah menjadi spent.

## Multiplayer

Mode Multiplayer adalah realtime online 1 vs 1 dengan Supabase.

Flow Multiplayer:

1. User klik Multiplayer.
2. User memasukkan username.
3. User klik Find Match.
4. Frontend mencari room berstatus waiting.
5. Jika ada room waiting, user join.
6. Jika tidak ada, frontend membuat room baru.
7. Saat dua player ada di room, match dimulai.

Fitur Multiplayer:

- random matchmaking;
- auto assignment X/O;
- random first turn;
- realtime board sync;
- realtime chat;
- AFK rule 20 detik;
- match history;
- player skills tersinkron;
- background music dan click SFX;
- tidak memakai Express backend.

## Supabase Data Model

Supabase memakai tiga tabel utama.

### multiplayer_rooms

Menyimpan state match aktif:

- status room;
- player X dan O;
- board;
- current turn;
- winner;
- result type;
- last move timestamp;
- skill state;
- move history.

### multiplayer_messages

Menyimpan chat selama match:

- room id;
- sender id;
- sender name;
- message;
- created timestamp.

Chat dirender dengan `textContent`, bukan HTML, agar pesan tidak mengeksekusi markup berbahaya.

### multiplayer_history

Menyimpan hasil match:

- match id;
- player X;
- player O;
- winner;
- result type;
- started at;
- ended at.

History user ditampilkan sebagai daftar match terbaru.

## Audio System

TacTic Sonata memakai beberapa jenis audio:

- background music `background.wav`;
- click SFX `click.wav`;
- Phrolova welcome voice;
- Phrolova normal dialogue voice;
- Maestro ability voice.

Background music dibuat singleton agar tidak terjadi audio stacking. Volume BGM dibuat lebih rendah daripada voice supaya dialog Phrolova tetap jelas.

Voice Phrolova memakai satu controller global. Jika voice baru diputar, voice lama dihentikan dulu. Ini mencegah overlap antara welcome voice, dialog playing, win/lose/draw, dan voice ability Maestro.

Sound toggle memengaruhi:

- background music;
- click SFX;
- Phrolova voice.

Saat user kembali ke menu mode select, audio mode game dihentikan agar musik tidak terus berjalan di menu.

## Dialog System

Dialog Phrolova tampil di panel Phrolova Speaks.

Aturan dialog:

- dialog default awal statis dari HTML;
- dialog playing hanya berubah saat Phrolova bergerak;
- dialog ability muncul saat Maestro ability aktif;
- dialog end-state muncul saat win, lose, atau draw;
- dialog tidak berubah saat player klik cell, reset, dropdown, atau skill biasa.

Ability Maestro punya dialog dan audio khusus:

- Resonance Override;
- Hecate's Shadow;
- Symphony of Rebirth.

Jika ability Maestro aktif, dialog ability tidak boleh ditimpa oleh dialog normal playing.

## Frontend Screens

Frontend memiliki beberapa screen:

- `titleScreen`;
- `modeSelectScreen`;
- `gameScreen`;
- `multiplayerFindMatchScreen`;
- `multiplayerGameScreen`.

Navigasi memakai helper `showScreen()` agar hanya screen aktif yang terlihat.

Flow:

```text
Title Screen
  -> Mode Select
    -> Vs Phrolova
    -> Multiplayer Find Match
      -> Multiplayer Game
```

Tombol Back tersedia untuk kembali dari mode game ke menu yang sesuai tanpa reload halaman.

## Backend Express

Backend Express bertugas menjalankan API mode Vs Phrolova jika tersedia.

Komponen penting:

- `server/server.js` menjalankan Express app.
- `server/routes/gameRoutes.js` mendefinisikan route API.
- `server/controllers/gameController.js` mengatur state game, start, move, reset, score, dan outcome.
- `server/services/minimaxService.js` menyediakan logic minimax.
- `server/services/phrolovaSkillService.js` mengatur skill normal Phrolova.
- `server/services/playerSkillService.js` mengatur player skills.
- `server/services/maestroAbilityService.js` mengatur ability Maestro.

Backend ini opsional untuk deploy. GitHub Pages tetap bisa menjalankan Vs Phrolova tanpa backend karena `client/js/app.js` memiliki fallback lokal.

## Local Fallback

Local fallback adalah logic game di frontend yang aktif jika API backend tidak tersedia.

Tujuannya:

- game tetap playable di GitHub Pages;
- Begin Match tetap bekerja;
- board tetap bisa diklik;
- AI tetap bisa bergerak;
- difficulty dan skill tetap berjalan;
- Maestro behavior tetap mirip dengan backend.

Frontend fallback meniru behavior penting backend, termasuk Maestro phase forcing, Resonance Override, Hecate's Shadow, Symphony of Rebirth, dan player skills.

## Deployment

### GitHub Pages

GitHub Pages dipakai untuk frontend static hosting.

Yang dibutuhkan:

- file dalam folder `client`;
- Supabase config untuk Multiplayer;
- fallback local logic untuk Vs Phrolova.

Jika backend tidak diset, Vs Phrolova tetap berjalan lokal di browser.

### Render

Render dipakai untuk backend Express jika ingin API online.

Command umum:

```bash
npm install
npm start
```

Frontend dapat diarahkan ke backend Render dengan:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://your-render-url.onrender.com";
```

### Supabase

Supabase dipakai untuk Multiplayer.

Setup:

1. Buat project Supabase.
2. Jalankan `supabase/schema.sql`.
3. Enable Realtime untuk `multiplayer_rooms`.
4. Enable Realtime untuk `multiplayer_messages`.
5. Isi `client/js/supabaseConfig.js`.
6. Deploy frontend ke GitHub Pages.

Config:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Jangan gunakan service role key di frontend.

## Testing

Project memakai Jest dan Supertest.

Command:

```bash
npm test
```

Test mencakup:

- minimax;
- difficulty;
- game API;
- player skills;
- Phrolova skills;
- Maestro abilities;
- skill API.

Test penting untuk menjaga agar winner detection tetap akurat, API tetap valid, dan ability Maestro tidak merusak state board.

## Current Status

Project saat ini memiliki:

- single-player Vs Phrolova;
- fallback local mode untuk GitHub Pages;
- multiplayer realtime dengan Supabase;
- player skills di single-player dan multiplayer;
- Phrolova normal skills;
- Maestro boss abilities;
- phase-based Maestro AI;
- audio manager;
- voice line Phrolova;
- click SFX;
- title screen;
- mode select;
- responsive gothic UI;
- backend Express opsional;
- Supabase schema;
- automated tests.

## Catatan Pengembangan

Hal yang perlu dijaga saat update project:

- jangan expose Supabase service role key;
- jangan membuat instance background music berulang;
- jangan trigger dialog Phrolova dari player move;
- jangan mengubah logic difficulty lain saat mengubah Maestro;
- jangan membuat Multiplayer bergantung pada Express backend;
- selalu test setelah mengubah AI, skill, atau game state.

TacTic Sonata sekarang adalah kombinasi antara game Tic Tac Toe, theatrical character AI, realtime multiplayer, dan boss-mode board manipulation. Identitas utamanya adalah duel gothic-musical yang kecil secara aturan, tetapi kaya dalam suasana, dialog, audio, dan manipulasi gameplay.
