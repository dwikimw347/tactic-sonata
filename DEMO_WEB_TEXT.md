# Teks Demo Web TacTic Sonata

## Pembukaan

Halo semuanya. Pada demo kali ini saya akan memperkenalkan **TacTic Sonata**, sebuah web game Tic Tac Toe bertema gothic-musical.

Game ini mengubah permainan Tic Tac Toe sederhana menjadi duel teatrikal melawan karakter bernama **Phrolova**, seorang crimson conductor yang berbicara dengan dialog puitis, memiliki voice line, dan bisa menggunakan berbagai skill untuk memanipulasi permainan.

Selain mode single-player melawan Phrolova, project ini juga memiliki mode **Multiplayer realtime online** menggunakan Supabase.

## Title Screen

Saat website pertama kali dibuka, user tidak langsung masuk ke board. Website menampilkan title screen terlebih dahulu.

Di sini terlihat judul **TacTic Sonata**, subtitle bertema gothic, dan tombol **Start Game**.

Tujuannya adalah membuat game terasa seperti sebuah pertunjukan, bukan hanya halaman game biasa.

Sekarang saya klik **Start Game**.

## Mode Select

Setelah Start Game, user masuk ke halaman pemilihan mode.

Ada dua pilihan:

- **Vs Phrolova**, yaitu mode melawan AI.
- **Multiplayer**, yaitu mode realtime online melawan player lain.

Saya mulai dari mode **Vs Phrolova**.

## Vs Phrolova

Di mode ini, user bermain melawan AI Phrolova.

Layout utama terdiri dari tiga bagian:

- panel kiri berisi profil Phrolova, dialog, tombol control, dan visual Phrolova;
- panel tengah berisi current stage, board Tic Tac Toe, dan player skills;
- panel kanan berisi score dan informasi match.

Saat masuk ke mode ini, Phrolova memberikan dialog welcome. Jika sound aktif, voice line welcome juga akan diputar.

## Game Setup

Sebelum bermain, user bisa mengatur beberapa hal.

Pertama, user bisa memilih simbol:

- X
- O

Kedua, user bisa memilih difficulty:

- Easy
- Normal
- Hard
- Impossible
- Maestro of the Lost Beyond

Ketiga, user bisa memilih match mode, seperti Best of 3 atau Best of 5.

Sekarang saya klik **Begin Match** untuk memulai permainan.

## Gameplay Dasar

Setelah match dimulai, player bisa memilih cell pada board.

Setelah player bergerak, Phrolova akan melakukan move balasan.

Current Stage akan berubah sesuai giliran, misalnya giliran player atau giliran Phrolova.

Dialog Phrolova juga hanya berubah pada kondisi tertentu, yaitu saat Phrolova bergerak, saat Phrolova memakai ability, atau saat game selesai.

Ini dibuat agar dialog tidak berubah secara random setiap player klik tombol biasa.

## Player Skills

Di bawah board terdapat fitur **Player Skills**.

Ada tiga skill utama:

### Insight Move

Insight Move menampilkan rekomendasi langkah terbaik. Skill ini hanya memberi highlight visual dan tidak langsung mengubah board.

### Undo Move

Undo Move digunakan untuk mengembalikan langkah terakhir sesuai aturan mode.

### Harmony Shield

Harmony Shield melindungi player dari satu ancaman kalah langsung.

Skill ini memiliki limit penggunaan, sehingga player harus memakainya secara strategis.

## Phrolova Skills

Phrolova juga memiliki skill sendiri.

Beberapa skill Phrolova adalah:

### Echo Manipulation

Phrolova memilih langkah yang terasa tidak mudah ditebak. Skill ini membuat permainan terasa seperti Phrolova sedang memancing player.

### Perfect Cadence

Phrolova memakai langkah kemenangan saat ada peluang menyelesaikan tiga mark dalam satu garis.

### Crimson Interruption

Phrolova memblokir ancaman player sebelum player bisa menang.

### Symphony Prediction

Phrolova membaca kemungkinan langkah terbaik menggunakan logic prediksi dan minimax.

## Difficulty Maestro of the Lost Beyond

Difficulty paling tinggi adalah **Maestro of the Lost Beyond**.

Mode ini adalah boss mode yang sengaja tidak fair.

Di difficulty ini, Phrolova tidak hanya bermain optimal, tetapi juga memanipulasi board dengan ability khusus.

Ada tiga ability Maestro:

### Hecate's Shadow

Hecate's Shadow dapat menghilangkan sementara mark player.

Jika Phrolova mengisi cell tersebut, mark player tidak kembali.

### Resonance Override

Resonance Override dapat mengubah satu mark player menjadi mark milik Phrolova.

Ability ini membuat board terasa seperti direbut oleh Phrolova.

### Symphony of Rebirth

Symphony of Rebirth memutar ulang board ke beberapa turn sebelumnya, lalu memberi keuntungan baru kepada Phrolova.

Ability ini membuat Phrolova bisa mencegah draw atau kekalahan.

Pada versi terbaru, Maestro memakai sistem phase-based forcing. Artinya, AI berusaha memastikan Hecate's Shadow, Resonance Override, dan Symphony of Rebirth semuanya muncul dalam satu match.

Setelah semua ability muncul, Phrolova masuk ke fase finishing untuk memenangkan permainan.

## Audio dan Dialog

TacTic Sonata juga memiliki sistem audio.

Ada background music, click sound effect, welcome voice, dialog voice, dan voice khusus ability Maestro.

Voice Phrolova memakai satu controller, sehingga voice lama akan berhenti sebelum voice baru diputar.

Ini mencegah audio overlap atau suara Phrolova menumpuk.

Tombol **Sound On / Sound Off** digunakan untuk mengatur audio.

## Back Navigation

User juga bisa kembali ke Mode Select tanpa reload halaman.

Saat keluar dari mode game, background music dan voice yang sedang berjalan akan dihentikan.

Ini menjaga supaya audio tidak tetap berbunyi saat user sudah kembali ke menu.

## Multiplayer

Sekarang saya masuk ke mode **Multiplayer**.

Mode Multiplayer menggunakan Supabase Realtime.

User dapat memasukkan username, lalu klik **Find Match**.

Jika ada room waiting, user akan masuk ke room tersebut.

Jika belum ada room, sistem akan membuat room baru dan menunggu lawan.

Saat dua player masuk, match dimulai otomatis.

## Multiplayer Gameplay

Dalam Multiplayer, board tersinkron secara realtime.

Jika player pertama memilih cell, player kedua akan langsung melihat perubahan board.

Current turn juga tersinkron, sehingga player hanya bisa bergerak saat gilirannya.

Mode ini juga memiliki chat realtime, match history, AFK rule, dan player skills.

## Chat Multiplayer

Di panel kiri Multiplayer terdapat chat.

User bisa mengirim pesan pendek, dan pesan akan muncul realtime di kedua player.

Pesan dirender sebagai text, bukan HTML, sehingga lebih aman dari input berbahaya.

## Multiplayer Skills

Player Skills juga tersedia di Multiplayer.

Perbedaannya, skill state disimpan di Supabase agar kedua player melihat status yang sama.

Insight Move, Undo Move, dan Harmony Shield tetap bisa digunakan sesuai aturan multiplayer.

## Status Online dan Offline

Project ini juga memiliki fitur status user.

Status yang tersedia adalah:

- Online
- Offline
- Searching
- In Match

Saat user login, status menjadi Online.

Saat user klik Find Match, status menjadi Searching.

Saat masuk match, status berubah menjadi In Match.

Saat logout atau menutup tab, status menjadi Offline.

Status ini disimpan di Supabase melalui tabel `user_presence` dan di-update menggunakan heartbeat setiap 15 detik.

Jika user tidak mengirim heartbeat lebih dari 45 detik, user dianggap Offline.

## Register dan Login

Sebelum masuk ke game, user dapat register dan login.

Register membutuhkan:

- username
- email
- password
- confirm password

Password tidak disimpan sebagai plain text. Backend menggunakan bcrypt untuk menyimpan password dalam bentuk hash.

Session login menggunakan JWT token yang disimpan di localStorage.

Saat halaman di-refresh, frontend akan mengecek token melalui endpoint `/api/auth/me`.

Jika token valid, user tetap login.

## Deployment

Project ini mendukung beberapa layanan deploy.

Frontend dapat dideploy ke GitHub Pages.

Backend Express dapat dideploy ke Render.

Supabase digunakan untuk Multiplayer dan Presence.

Untuk menghubungkan frontend ke backend Render, project memakai konfigurasi:

```js
window.TACTIC_SONATA_API_BASE_URL = "https://tactic-sonata.onrender.com";
```

Dengan setup ini, frontend static tetap bisa menggunakan backend auth dan API game.

## Penutup

Jadi, TacTic Sonata bukan hanya game Tic Tac Toe biasa.

Project ini menggabungkan:

- UI gothic-musical;
- AI difficulty bertingkat;
- boss mode Maestro;
- player skills;
- dialog dan voice Phrolova;
- multiplayer realtime;
- register dan login;
- status online/offline;
- deployment frontend, backend, dan Supabase.

Dengan semua fitur ini, TacTic Sonata menjadi web game sederhana secara aturan, tetapi kaya dalam pengalaman, suasana, dan sistem teknis.

Terima kasih.
