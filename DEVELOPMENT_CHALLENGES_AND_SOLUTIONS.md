# TacTic Sonata - Development Challenges and Solutions

Dokumen ini merangkum tantangan pengembangan TacTic Sonata dan solusi yang diterapkan selama proses iterasi project.

Fokus dokumen:

- masalah yang muncul selama pengembangan;
- penyebab teknis yang ditemukan;
- solusi yang dipilih;
- pelajaran yang bisa dipakai untuk pengembangan berikutnya.

## 1. Layout Board Terpotong di Resolusi Laptop

### Tantangan

Pada beberapa device laptop atau viewport pendek, grid Tic Tac Toe terpotong. Board tidak tampil penuh, beberapa cell hilang, dan panel tengah terlihat clipping.

Masalah terlihat terutama pada resolusi seperti:

- 1366x768
- 1280x720

### Penyebab

Beberapa CSS memaksa layout agar tidak scroll:

- `height: 100vh`
- `overflow: hidden`
- board memakai ukuran berbasis tinggi yang terlalu besar
- parent panel memotong konten anak

Kombinasi ini membuat board tidak punya ruang cukup saat layar pendek.

### Solusi

Board diubah menjadi lebih responsif:

- memakai `aspect-ratio: 1 / 1`;
- ukuran board memakai `min(...)`;
- cell memakai `min-width: 0` dan `min-height: 0`;
- parent board dibuat `overflow: visible`;
- body boleh scroll vertical jika layar terlalu pendek.

Breakpoint laptop pendek juga ditambahkan agar board, avatar, video, dan skill panel mengecil secara proporsional.

### Pelajaran

Untuk UI game desktop, memaksa `no scroll` bisa terlihat rapi di satu resolusi, tetapi mudah menyebabkan clipping di viewport pendek. Lebih baik izinkan scroll kecil daripada memotong elemen utama.

## 2. Avatar atau Video Phrolova Tidak Muncul

### Tantangan

Gambar/video Phrolova di panel kiri sempat tidak muncul atau terlihat terpotong.

### Penyebab

Masalah muncul dari beberapa hal:

- path asset harus benar relatif dari `client/index.html`;
- parent panel memiliki `overflow: hidden`;
- tinggi parent terlalu kecil;
- image/video memakai ukuran yang tidak stabil;
- efek visual seperti opacity, filter, atau mask bisa membuat video terlihat hilang saat debugging.

### Solusi

Path video dipastikan memakai:

```text
assets/video/phrolova-edit.mp4
```

Video dibuat dengan tag:

```html
<video autoplay loop muted playsinline preload="auto">
  <source src="assets/video/phrolova-edit.mp4" type="video/mp4">
</video>
```

CSS dibuat lebih aman:

- `object-fit: contain`;
- `pointer-events: none`;
- ukuran max-height responsif;
- parent diberi min-height;
- efek visual dikurangi saat debugging.

### Pelajaran

Saat media tidak muncul, jangan langsung berasumsi file rusak. Cek path, parent height, overflow, opacity, filter, dan Network 404.

## 3. Player Skills Keluar dari Border

### Tantangan

Panel Player Skills sempat menembus garis border kuning container utama.

### Penyebab

Masalah bukan hanya width. Ada kombinasi:

- board terlalu besar;
- parent terlalu pendek;
- panel skills berada terlalu bawah;
- overflow parent memotong konten;
- spacing antar elemen kurang seimbang.

### Solusi

Panel tengah dibuat lebih stabil:

- center panel memakai flex column;
- Player Skills berada dalam flow normal;
- width skill panel dibuat lebih kecil dari parent;
- board sedikit diperkecil;
- padding bawah parent ditambah;
- skill card dibuat compact.

### Pelajaran

Jika elemen keluar border, jangan hanya mengecilkan width. Cek vertical layout, parent height, absolute positioning, margin negatif, dan flow dokumen.

## 4. Dialog Phrolova Terlalu Sering Berubah

### Tantangan

Dialog “Phrolova Speaks” sempat berubah saat player melakukan aksi biasa seperti klik cell, Begin Match, Reset, atau pilih symbol.

### Penyebab

Pemanggilan `updatePhrolovaDialog("playing")` tersebar di terlalu banyak event handler.

### Solusi

Trigger dialog dipersempit:

- dialog playing hanya dipanggil saat Phrolova bergerak;
- dialog ability dipanggil saat Maestro ability aktif;
- dialog end-state dipanggil saat win/lose/draw;
- dialog tidak berubah saat player move atau klik UI biasa.

Prioritas dialog dibuat:

1. Maestro ability dialog.
2. End-state dialog.
3. Playing dialog.

### Pelajaran

Sistem dialog sebaiknya punya satu pusat kontrol. Jika dialog dipanggil dari banyak event, behavior akan sulit diprediksi.

## 5. Voice Line Phrolova Overlap

### Tantangan

Welcome voice Phrolova bisa overlap dengan voice dialog playing/win/lose/draw jika player langsung mulai match.

### Penyebab

Ada beberapa instance audio voice berbeda:

- welcome audio;
- normal dialogue audio;
- ability audio.

Masing-masing bisa berjalan bersamaan.

### Solusi

Dibuat satu voice controller global:

- `currentPhrolovaVoice`;
- `playPhrolovaVoice(audioSrc, volume)`;
- `stopPhrolovaVoice()`.

Semua voice Phrolova, termasuk welcome dan ability, memakai controller yang sama. Saat voice baru diputar, voice lama dihentikan dulu.

### Pelajaran

Untuk karakter voice line, gunakan satu channel audio khusus. Jangan buat instance terpisah untuk setiap kategori voice.

## 6. Background Music Menumpuk

### Tantangan

Background music terasa makin keras walaupun volume sudah diturunkan.

### Penyebab

Audio background kemungkinan diputar berkali-kali dengan instance berbeda, sehingga suara menumpuk.

### Solusi

Background music dibuat singleton:

- satu instance global;
- play hanya jika `paused`;
- stop dengan pause dan reset currentTime;
- volume diturunkan ke level lebih kecil;
- audio dihentikan saat keluar dari mode game ke menu.

### Pelajaran

Jika volume terasa makin keras, masalahnya belum tentu angka volume. Bisa jadi ada audio stacking.

## 7. GitHub Pages Tidak Bisa Begin Match

### Tantangan

Di lokal game berjalan karena backend Express aktif. Di GitHub Pages, Begin Match gagal karena `/api/game/start` tidak tersedia.

### Penyebab

GitHub Pages hanya static hosting dan tidak menjalankan backend Express.

### Solusi

Frontend diberi local fallback mode:

- start game lokal;
- reset lokal;
- player move lokal;
- AI move lokal;
- minimax lokal;
- difficulty lokal;
- score lokal.

Jika API backend gagal, game tetap playable di browser.

### Pelajaran

Static hosting membutuhkan fallback client-side jika fitur utama tidak boleh bergantung penuh pada backend.

## 8. API Base URL untuk Render

### Tantangan

Frontend perlu tahu backend Render berada di URL berbeda.

### Penyebab

Jika frontend di GitHub Pages memakai relative `/api/...`, request akan menuju domain GitHub Pages, bukan Render.

### Solusi

Ditambahkan konfigurasi:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://tactic-sonata.onrender.com";
```

Frontend auth dan game API membaca base URL ini.

### Pelajaran

Frontend static dan backend terpisah butuh konfigurasi API base URL yang eksplisit.

## 9. Maestro Difficulty Terlalu Fair

### Tantangan

Maestro of the Lost Beyond awalnya terasa seperti Impossible biasa karena terlalu bergantung pada minimax. Ability Maestro jarang aktif.

### Penyebab

AI hanya reaktif:

- menunggu kondisi ability;
- cepat menang dengan minimax;
- tidak sengaja membuat kondisi untuk ability.

### Solusi

Maestro dibuat phase-based:

```text
forceShadow -> forceResonance -> forceRebirth -> finish
```

State tracking:

```js
maestroUsage = {
  shadowUsed: false,
  resonanceUsed: false,
  rebirthUsed: false
}
```

AI sengaja:

- menunda kemenangan;
- memancing ancaman player;
- membuat target Resonance;
- menciptakan kondisi Rebirth;
- lalu finishing setelah semua ability muncul.

### Pelajaran

Boss AI tidak cukup hanya optimal. Boss AI perlu “dramaturgi”: memancing, menunda, mempermainkan, dan memastikan skill khas terlihat.

## 10. Resonance Override Jarang Aktif

### Tantangan

Resonance Override jarang digunakan karena kondisi trigger terlalu sempit.

### Penyebab

Ability hanya dipakai saat benar-benar optimal atau langsung menang.

### Solusi

Ditambahkan fase `forceResonance` dan helper setup:

- mencari mark player yang bisa dikonversi;
- menciptakan kondisi agar player meninggalkan mark strategis;
- menunda kemenangan jika semua ability belum muncul.

### Pelajaran

Jika skill penting jarang muncul, jangan hanya longgarkan trigger. Tambahkan strategi aktif untuk menciptakan trigger.

## 11. Symphony of Rebirth Kurang Berdampak

### Tantangan

Symphony of Rebirth awalnya hanya rollback board dan tidak memberi momentum besar.

### Penyebab

Rollback tidak terhubung kuat dengan ability lain.

### Solusi

Ditambahkan `maestroHistory`:

- Resonance Override mencatat aksi manipulasi;
- Hecate's Shadow mencatat aksi manipulasi;
- Symphony of Rebirth membaca history ini;
- mark yang pernah dimanipulasi bisa dikunci menjadi milik Phrolova setelah rollback.

### Pelajaran

Ability yang bagus bukan hanya kuat sendiri, tetapi punya sinergi dengan ability lain.

## 12. False Positive Winner

### Tantangan

Game sempat menyatakan Phrolova menang padahal baru ada 2 mark.

### Penyebab

Ada risiko winner detection tercampur dengan heuristic threat detection.

### Solusi

Winner detection dipastikan hanya valid jika ada 3 mark sama dalam satu line:

```js
if (board[a] && board[a] === board[b] && board[a] === board[c]) {
  return board[a];
}
```

Winner hanya dicek setelah ability effect selesai dan board final valid.

### Pelajaran

Heuristic “hampir menang” tidak boleh dicampur dengan logic “sudah menang”.

## 13. Supabase Multiplayer Tidak Jalan

### Tantangan

Multiplayer sempat menampilkan pesan:

```text
Supabase is not configured yet.
```

atau:

```text
Unable to reach Supabase. Check configuration and policies.
```

### Penyebab

Penyebab yang mungkin:

- Project URL atau anon key belum diisi;
- RLS/policy memblokir;
- SQL schema belum dijalankan;
- Realtime belum enabled;
- update belum dipush ke GitHub Pages.

### Solusi

Ditambahkan:

- `client/js/supabaseConfig.js`;
- `supabase/schema.sql`;
- pesan error yang lebih jelas;
- fallback untuk kolom skill jika schema belum dimigrasi;
- dokumentasi setup Supabase.

### Pelajaran

Masalah Supabase perlu dibedakan antara config, schema, policy, dan realtime. Pesan error harus membantu user tahu bagian mana yang salah.

## 14. Multiplayer Player Skills Tidak Sync

### Tantangan

Player Skills di Multiplayer tidak bisa hanya disimpan lokal karena dua player harus melihat state yang sama.

### Penyebab

Realtime game state membutuhkan source of truth bersama.

### Solusi

Skill state disimpan di Supabase:

```text
skill_state
move_history
```

Insight, Undo, dan Harmony Shield diintegrasikan dengan update room.

### Pelajaran

Untuk multiplayer, state gameplay penting harus ada di shared database, bukan hanya local client.

## 15. Auth Register/Login di Static Frontend

### Tantangan

Register/Login tidak bisa berjalan hanya dari GitHub Pages karena membutuhkan backend untuk hash password dan JWT.

### Penyebab

GitHub Pages tidak menjalankan server Express.

### Solusi

Auth dibuat di backend Express:

- `/api/auth/register`;
- `/api/auth/login`;
- `/api/auth/logout`;
- `/api/auth/me`.

Frontend diarahkan ke Render:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://tactic-sonata.onrender.com";
```

### Pelajaran

Auth tidak boleh dilakukan seluruhnya di frontend jika memakai password. Hashing, validasi credential, dan token signing harus di backend.

## 16. Auth Storage Sementara

### Tantangan

Register/Login butuh database user, tetapi project belum memakai Supabase server-side untuk auth.

### Penyebab

Supabase service role key tidak boleh ditaruh di frontend, dan backend perlu adapter database tambahan jika ingin langsung memakai Supabase users table.

### Solusi

Untuk demo, user disimpan di:

```text
server/data/users.json
```

Supabase schema `auth_schema.sql` disiapkan sebagai jalur production.

### Pelajaran

Untuk demo, local file store cukup. Untuk production, user store harus dipindahkan ke database server-side.

## 17. JWT Secret di Render

### Tantangan

Auth membutuhkan JWT secret, tetapi secret tidak boleh hardcoded.

### Penyebab

Hardcoded secret berbahaya dan tidak fleksibel untuk deploy.

### Solusi

Render Environment Variable digunakan:

```text
JWT_SECRET=...
```

Backend juga memiliki `.env` loader untuk local development.

### Pelajaran

Secret harus selalu masuk lewat environment variable, bukan source code.

## 18. Online/Offline Status Pengguna

### Tantangan

Program awalnya hanya punya status match seperti waiting, playing, finished, dan AFK. Belum ada status user online/offline.

### Penyebab

Tidak ada table presence, heartbeat, atau Realtime subscription untuk status user.

### Solusi

Ditambahkan:

- `supabase/presence_schema.sql`;
- table `user_presence`;
- `client/js/presence.js`;
- heartbeat 15 detik;
- fallback offline jika `last_seen` lebih dari 45 detik;
- status `online`, `offline`, `searching`, `in_match`;
- indikator dot di header dan Multiplayer.

### Pelajaran

AFK rule dan online presence adalah dua hal berbeda. AFK berlaku saat match berlangsung, sedangkan presence berlaku untuk status koneksi/user secara umum.

## 19. Realtime Table Mana yang Perlu Enabled

### Tantangan

Tidak semua tabel perlu Realtime, dan mengaktifkan Realtime pada tabel sensitif bisa berisiko.

### Solusi

Realtime yang perlu:

```text
multiplayer_rooms
multiplayer_messages
user_presence
```

Realtime yang tidak perlu:

```text
users
multiplayer_history
```

### Pelajaran

Aktifkan Realtime hanya untuk data yang benar-benar perlu live update. Jangan enable Realtime untuk tabel user auth yang menyimpan data sensitif.

## 20. UI Auth dan Presence Harus Tetap Sesuai Tema

### Tantangan

Login/register dan status online/offline harus ditambahkan tanpa membuat UI terasa berbeda dari tema gothic TacTic Sonata.

### Solusi

Auth screen dibuat sebagai card gothic:

- merah-hitam;
- border crimson/gold;
- tombol glow;
- font konsisten;
- responsive.

Presence indicator dibuat kecil:

- dot warna;
- label singkat;
- tidak mengganggu layout utama.

### Pelajaran

Fitur teknis tetap perlu dipikirkan sebagai bagian dari pengalaman visual. UI auth tidak boleh terasa seperti halaman default terpisah dari game.

## 21. Dokumentasi Bertambah Seiring Kompleksitas

### Tantangan

Project berkembang dari game Tic Tac Toe menjadi aplikasi dengan AI, multiplayer, auth, deployment, Supabase, dan presence. Informasi mudah tercecer.

### Solusi

Ditambahkan beberapa file dokumentasi:

- `PROJECT_SUMMARY.md`;
- `TACTIC SONATA_PROJECT_EXPLANATION.md`;
- `WEB_DEMO_SCRIPT.md`;
- `AUTH_AND_PRESENCE.md`;
- `DEVELOPMENT_CHALLENGES_AND_SOLUTIONS.md`.

### Pelajaran

Semakin banyak fitur, dokumentasi harus dipisah berdasarkan tujuan: summary, explanation, demo script, auth/presence, dan retrospective.

## Kesimpulan

Pengembangan TacTic Sonata banyak berfokus pada menjaga keseimbangan antara:

- gameplay;
- visual;
- audio;
- AI behavior;
- static deployment;
- realtime multiplayer;
- auth;
- presence.

Tantangan terbesar bukan hanya membuat fitur bekerja, tetapi membuat semuanya tetap terasa satu identitas: duel gothic-musical melawan Phrolova.

Solusi yang paling sering berhasil:

- pisahkan logic ke modul khusus;
- jangan campur trigger UI/dialog/audio di banyak tempat;
- gunakan fallback untuk static hosting;
- gunakan shared database untuk realtime multiplayer;
- validasi dengan test dan manual flow;
- dokumentasikan setup karena deployment melibatkan banyak platform.

TacTic Sonata akhirnya berkembang dari Tic Tac Toe sederhana menjadi web game lengkap dengan AI boss mode, multiplayer realtime, auth, online presence, audio-dialog system, dan dokumentasi pendukung.
