# Phrolova's Tic Tac Toe

Aplikasi web Tic Tac Toe frontend + backend dengan lawan AI bernama **Phrolova**. Phrolova adalah konduktor gothic yang puitis, misterius, melankolis, dan elegan. Game memakai tema merah-hitam, dialog dramatis, sistem skor, mode match, pilihan simbol, dan difficulty AI dari random sampai minimax optimal.

## Fitur

- Web app dengan HTML, CSS, JavaScript vanilla.
- Backend Node.js + Express.
- Komunikasi frontend/backend via REST API.
- Player vs Phrolova.
- Realtime online Multiplayer 1 vs 1 via Supabase Realtime.
- Pilihan simbol X atau O.
- Difficulty: Easy, Normal, Hard, Impossible, dan Maestro of the Lost Beyond.
- Minimax optimal untuk mode Impossible.
- Mode match Best of 3 dan Best of 5.
- Skor menang, kalah, dan seri.
- Player Skill: Insight Move, Undo Move, dan Harmony Shield.
- Phrolova AI Skill System: Perfect Cadence, Crimson Interruption, Symphony Prediction, dan Echo Manipulation.
- Maestro of the Lost Beyond: boss mode sengaja tidak adil dengan ability Resonance Override, Hecate's Shadow, dan Symphony of Rebirth.
- Restart/reset game.
- Random matchmaking, chat, AFK win rule, dan match history untuk mode Multiplayer.
- Multiplayer juga memiliki background music, click SFX, dan Player Skills yang tersinkron melalui Supabase.
- Dialog Phrolova dengan gaya formal, puitis, dan metafora musik.
- UI gothic merah-hitam, responsive, hover effect, animasi klik, dan highlight kemenangan.
- Audio manager dengan placeholder dan fallback aman jika file audio belum tersedia.
- Unit/integration test otomatis dengan Jest + Supertest.

## Struktur Folder

```text
/client
  index.html
  css/style.css
  js/app.js
  js/multiplayer.js
  js/supabaseConfig.js
  assets/images/
  assets/audio/

/server
  server.js
  routes/gameRoutes.js
  controllers/gameController.js
  services/
    minimaxService.js
    aiDifficultyService.js
    playerSkillService.js
    phrolovaSkillService.js
    maestroAbilityService.js
  data/scoreStore.js

/tests
  minimax.test.js
  difficulty.test.js
  gameApi.test.js
  playerSkill.test.js
  skillApi.test.js
  phrolovaSkill.test.js

/supabase
  schema.sql

package.json
README.md
UI_PROMPT.md
```

## Cara Install

```bash
npm install
```

## Cara Run

```bash
npm start
```

Lalu buka browser:

```text
http://localhost:3000
```

## Cara Test

```bash
npm test
```

## Multiplayer Setup with Supabase

Mode Multiplayer berjalan langsung dari frontend dan tidak memakai Express backend, sehingga bisa dipakai saat deploy ke GitHub Pages.

Langkah setup:

1. Buat project baru di Supabase.
2. Buka SQL Editor Supabase, lalu jalankan isi file `supabase/schema.sql`.
3. Di menu Realtime Supabase, enable Realtime untuk tabel:
   - `multiplayer_rooms`
   - `multiplayer_messages`
4. Isi konfigurasi di `client/js/supabaseConfig.js`:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";
```

5. Deploy folder `client` ke GitHub Pages.
6. Buka game, klik Start Game, lalu pilih Multiplayer.

Catatan keamanan:

- Jangan pernah menaruh service role key di frontend.
- Gunakan anon key saja untuk GitHub Pages.
- `supabase/schema.sql` mematikan RLS untuk demo agar random matchmaking mudah dicoba.
- Untuk production, aktifkan RLS dan buat policy yang lebih ketat untuk insert/select/update room, message, dan history.

Tabel multiplayer:

- `multiplayer_rooms`: state room, board, player, turn, result, dan timestamp AFK.
- `multiplayer_messages`: chat realtime per room.
- `multiplayer_history`: hasil match terakhir untuk history user.

Kolom penting di `multiplayer_rooms`:

- `skill_state`: sisa Insight/Undo dan status Harmony Shield untuk X dan O.
- `move_history`: snapshot board terakhir untuk Undo Move.

Player Skills di Multiplayer:

- **Insight Move**: mengurangi jatah di `skill_state`, lalu menyorot rekomendasi cell secara visual.
- **Undo Move**: rollback move terakhir player sendiri selama lawan belum membalas.
- **Harmony Shield**: otomatis membatalkan satu winning move lawan dan mengubah status shield menjadi `spent`.

## API Endpoint

Semua response memakai format:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Endpoint tersedia:

- `GET /api/game/status`
- `POST /api/game/start`
- `POST /api/game/move`
- `POST /api/game/reset`
- `GET /api/game/score`
- `POST /api/game/match-mode`
- `POST /api/game/difficulty`
- `GET /api/game/skills`
- `POST /api/game/skill/insight`
- `POST /api/game/skill/undo`
- `POST /api/game/skill/shield`

Contoh start game:

```json
{
  "playerSymbol": "X",
  "difficulty": "impossible",
  "matchMode": 3
}
```

Contoh move:

```json
{
  "index": 4
}
```

Index board memakai angka `0` sampai `8` dari kiri ke kanan, atas ke bawah.

## Player Skill System

Logic skill berada di `server/services/playerSkillService.js`.

Skill dibuat sebagai bantuan taktis, bukan tombol menang instan. Semua skill punya limit per game dan hanya aktif pada kondisi valid.

### Insight Move

Insight Move memberi rekomendasi 1 langkah terbaik untuk player dan menyorot cell dengan glow biru.

Cara kerja:

- Maksimal 2 kali per game.
- Hanya bisa dipakai saat game masih berjalan.
- Hanya bisa dipakai saat giliran player.
- Tidak menjalankan move otomatis.
- Memprioritaskan winning move player.
- Jika Phrolova hampir menang, memprioritaskan block.
- Jika tidak ada kondisi khusus, memakai strategi center/corner/minimax dari perspektif player.

Dialog contoh:

```text
Ah... seeking guidance from the silence? How human.
```

### Undo Move

Undo Move membatalkan turn terakhir player.

Cara kerja:

- Maksimal 1 kali per game.
- Tidak bisa dipakai jika belum ada move player.
- Tidak bisa dipakai setelah game selesai.
- Jika Phrolova sudah membalas, Undo menghapus 1 move player dan 1 move Phrolova sekaligus.
- Board, turn, history, dan UI dikembalikan ke state sebelum player bergerak.
- Skor dan progress match tidak diubah.

Dialog contoh:

```text
You wish to rewrite fate? Very well...
```

### Harmony Shield

Harmony Shield adalah skill pasif 1 kali per game yang memberi warning ketika Phrolova punya ancaman menang langsung.

Cara kerja:

- Maksimal aktif 1 kali per game.
- Aktif otomatis saat giliran player dan Phrolova punya 2 simbol dalam 1 line dengan 1 cell kosong.
- Cell yang wajib diblokir diberi efek shield/glow biru.
- Tombol `Use Shield` dapat menempatkan simbol player pada cell block tersebut.
- Tidak menghapus move Phrolova.
- Tidak membuat player menang otomatis; jika block akan menjadi kemenangan instan player, auto shield ditolak agar tetap fair.

Dialog contoh:

```text
You resist the inevitable... admirable.
```

## Cara Test Skill

Semua test skill berjalan bersama test utama:

```bash
npm test
```

Test yang ditambahkan:

- Insight menyarankan winning move.
- Insight menyarankan blocking move.
- Insight tidak memilih cell terisi.
- Undo mengembalikan board dan history.
- Undo tidak mengubah skor.
- Harmony Shield mendeteksi ancaman Phrolova.
- Endpoint skill berjalan dengan format response konsisten.

## Penjelasan Minimax

Minimax berada di `server/services/minimaxService.js`.

Cara kerjanya:

- Mengecek apakah board sudah punya pemenang atau draw.
- Mencoba semua langkah legal untuk AI.
- Mensimulasikan balasan terbaik dari player.
- Memberi skor positif jika AI menang, negatif jika player menang, dan `0` jika seri.
- Memilih langkah dengan skor terbaik.

Scoring dibuat dengan mempertimbangkan kedalaman recursion:

- AI menang cepat lebih disukai: `10 - depth`.
- AI kalah lambat lebih baik daripada kalah cepat: `depth - 10`.
- Draw bernilai `0`.

Karena minimax mengevaluasi seluruh state Tic Tac Toe, mode Impossible tidak dapat dikalahkan jika AI dan player bermain optimal.

## Penjelasan Difficulty AI

Difficulty berada di `server/services/aiDifficultyService.js`.

- **Easy**: 100% random move, tanpa strategi.
- **Normal**: 70% random, 30% logic sederhana untuk block jika player hampir menang.
- **Hard**: 80% minimax, 20% random agar masih ada variasi.
- **Impossible**: 100% minimax optimal.
- **Maestro of the Lost Beyond**: Phrolova fully commands the grid. Mode boss yang sengaja tidak adil: minimax optimal plus ability khusus di luar aturan Tic Tac Toe biasa.

Randomness dibuat berada di service difficulty supaya test bisa menyuntikkan random palsu dan hasilnya deterministik.

## Phrolova AI Skill System

Skill AI Phrolova berada di `server/services/phrolovaSkillService.js`.

Setiap kali Phrolova bergerak, backend memilih satu skill berdasarkan difficulty, kondisi board, peluang menang langsung, ancaman player, dan random chance. Response API `POST /api/game/move` mengembalikan `phrolovaSkill` agar frontend bisa menampilkan nama skill, dialog, efek board, dan sound effect opsional.

Skill Phrolova:

- **Perfect Cadence**: mengambil winning move jika Phrolova bisa menang langsung.
- **Crimson Interruption**: memblokir player jika player hampir menang.
- **Symphony Prediction**: memakai minimax optimal dari `minimaxService.js`.
- **Echo Manipulation**: memilih random move valid agar Phrolova terasa seperti sedang menipu atau bermain-main.

Tabel behavior difficulty:

| Difficulty | Behavior |
| --- | --- |
| Easy | Mostly Echo Manipulation; hanya kadang mengambil win/block. |
| Normal | Campuran random, occasional block, dan minimax. |
| Hard | Perfect win/block, mostly minimax, masih bisa random sekitar 20%. |
| Impossible | Full optimal: win, block, lalu minimax; tidak memakai random. |
| Maestro of the Lost Beyond | Full optimal seperti Impossible, lalu ditambah ability boss yang dapat mengubah, menghilangkan sementara, atau memutar ulang state board. |

Priority skill:

1. Perfect Cadence jika ada winning move.
2. Crimson Interruption jika player punya ancaman menang.
3. Symphony Prediction jika tidak ada kondisi urgent.
4. Echo Manipulation sebagai fallback random sesuai difficulty.

## Catatan Balance Gameplay

- Insight membantu membaca board, tetapi tetap membutuhkan player untuk memilih move.
- Undo hanya 1 kali sehingga berguna sebagai koreksi, bukan cara mengulang game tanpa risiko.
- Harmony Shield memberi perlindungan dari ancaman langsung, tetapi hanya sekali dan bisa tetap kalah jika ada fork atau ancaman ganda.
- Mode Impossible tetap memakai minimax optimal; skill membuat permainan lebih strategis dan manusiawi, bukan menjamin kemenangan.
- Mode Maestro of the Lost Beyond sengaja bersifat unfair/boss mode. Phrolova dapat memakai **Resonance Override** untuk mengubah satu mark player menjadi miliknya, **Hecate's Shadow** untuk membuat ancaman player lenyap sementara, dan **Symphony of Rebirth** untuk rollback board tiga turn serta menambahkan mark Phrolova.

## Audio Placeholder

Frontend mencoba memuat file audio berikut dari `client/assets/audio/`:

- `background.wav`
- `click.wav`
- `ai-move.wav`
- `win.wav`
- `lose.wav`
- `draw.wav`
- `skill.wav`

Jika file belum ada, game tetap berjalan tanpa error. Kamu bisa menambahkan audio sendiri dengan nama file tersebut.

## Catatan Development

- State game dan skor disimpan in-memory di `server/data/scoreStore.js`.
- Jika server di-restart, skor kembali kosong.
- Frontend disajikan oleh Express dari folder `client`.
- Test API memakai Supertest langsung ke instance Express tanpa perlu menjalankan server manual.
