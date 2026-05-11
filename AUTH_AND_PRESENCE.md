# TacTic Sonata - Register/Login and Online Status

Dokumen ini menjelaskan fitur Register/Login dan Status Online/Offline pengguna pada project TacTic Sonata.

## Ringkasan

TacTic Sonata memiliki dua sistem user:

- **Auth System** untuk register, login, logout, dan session user.
- **Presence System** untuk menampilkan status user secara realtime: online, offline, searching, dan in match.

Auth berjalan melalui backend Express. Presence berjalan melalui Supabase Realtime di frontend.

## Register/Login

Fitur register/login muncul sebagai screen pertama sebelum Title Screen.

User dapat:

- membuat akun baru;
- login dengan email dan password;
- logout dari aplikasi;
- tetap login setelah page reload selama token masih valid.

## Register Flow

Input register:

- username
- email
- password
- confirm password

Validasi frontend dan backend:

- username minimal 3 karakter;
- email harus valid;
- password minimal 6 karakter;
- confirm password harus sama dengan password;
- username harus unique;
- email harus unique.

Saat register berhasil:

1. Backend membuat user.
2. Password di-hash.
3. Backend membuat JWT token.
4. Frontend menyimpan token di `localStorage`.
5. User masuk ke Title Screen.
6. Presence user di-set menjadi `online`.

## Login Flow

Input login:

- email
- password

Saat login berhasil:

1. Backend memvalidasi email dan password.
2. Backend mengirim JWT token.
3. Frontend menyimpan token di `localStorage`.
4. Username tampil di header.
5. User masuk ke Title Screen.
6. Presence user di-set menjadi `online`.

## Logout Flow

Saat user klik Logout:

1. Frontend memanggil `/api/auth/logout`.
2. Presence user di-set menjadi `offline`.
3. Token dihapus dari `localStorage`.
4. User kembali ke Auth Screen.

Karena JWT bersifat stateless, logout utamanya dilakukan di sisi client dengan menghapus token.

## Session Restore

Saat page reload:

1. Frontend membaca token dari `localStorage`.
2. Frontend memanggil:

```text
GET /api/auth/me
```

3. Jika token valid, user tetap login.
4. Jika token invalid atau expired, token dihapus dan user kembali ke Login Screen.

## Auth Backend

Endpoint auth:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

File backend auth:

```text
server/controllers/authController.js
server/routes/authRoutes.js
server/data/userStore.js
server/config/loadEnv.js
```

Dependency:

```text
bcryptjs
jsonwebtoken
```

Password tidak pernah disimpan plain text. Backend menyimpan hash password.

## Auth Storage Saat Ini

Untuk development/demo, akun disimpan di:

```text
server/data/users.json
```

File ini dibuat otomatis saat register pertama kali.

Catatan penting:

- Cocok untuk demo.
- Tidak ideal untuk production.
- Pada Render free, file bisa hilang saat redeploy/restart.
- Untuk production, sebaiknya pindahkan user store ke Supabase/PostgreSQL.

## JWT Secret

Backend membutuhkan environment variable:

```text
JWT_SECRET=change_this_secret
```

Contoh `.env`:

```text
JWT_SECRET=tactic_sonata_auth_secret_2026_private
PORT=3000
```

Jika `JWT_SECRET` tidak di-set, server memakai secret sementara saat runtime. Token lama akan invalid jika server restart.

Untuk deploy Render, set `JWT_SECRET` di menu Environment.

## Supabase Auth Schema

Schema auth ada di:

```text
supabase/auth_schema.sql
```

Tabel:

```text
users
```

Kolom:

```text
id
username
email
password_hash
created_at
```

Catatan:

- Tabel ini disiapkan untuk production database.
- Auth backend saat ini masih memakai `server/data/users.json`.
- Supabase `users` table belum dipakai langsung oleh backend auth.
- Jangan enable Realtime untuk tabel `users`.
- Jangan expose `password_hash` ke frontend.

## API Base URL

Frontend diarahkan ke backend Render melalui:

```html
<script>
  window.TACTIC_SONATA_API_BASE_URL = "https://tactic-sonata.onrender.com";
</script>
```

Script ini ada di:

```text
client/index.html
```

Posisinya harus sebelum:

```html
<script src="js/auth.js"></script>
<script src="js/app.js"></script>
```

## User Presence / Online Status

Presence system menampilkan status user secara realtime, terutama di Multiplayer.

Status yang tersedia:

- `online`
- `offline`
- `searching`
- `in_match`

Tampilan status muncul di:

- header user info;
- Multiplayer Find Match;
- Multiplayer Game;
- Your Profile panel;
- Opponent Profile panel.

## Arti Status

### Online

User sudah login dan berada di aplikasi/menu.

Contoh:

```text
Dwiki - Online
```

### Searching

User sedang mencari match Multiplayer setelah klik Find Match.

Contoh:

```text
Dwiki - Searching
```

### In Match

User sudah masuk room Multiplayer dan match sedang berjalan.

Contoh:

```text
Opponent - In Match
```

### Offline

User logout, menutup tab, atau heartbeat sudah tidak aktif lebih dari 45 detik.

Contoh:

```text
Opponent - Offline
```

## Presence Schema

Schema presence ada di:

```text
supabase/presence_schema.sql
```

Tabel:

```text
user_presence
```

Kolom:

```text
id
user_id
username
status
current_room_id
last_seen
updated_at
```

Status valid:

```text
online
offline
searching
in_match
```

## Realtime Tables

Realtime yang perlu di-enable di Supabase:

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

Alasan:

- `multiplayer_rooms` perlu realtime untuk sync board dan turn.
- `multiplayer_messages` perlu realtime untuk chat.
- `user_presence` perlu realtime untuk status online/offline.
- `users` tidak perlu realtime karena berisi data sensitif seperti `password_hash`.
- `multiplayer_history` tidak perlu realtime karena hanya data arsip hasil match.

## Presence Frontend

File utama:

```text
client/js/presence.js
```

Fungsi penting:

```js
setUserOnline(username, userId)
setUserOffline()
setUserSearching()
setUserInMatch(roomId)
setUserOnlineAfterMatch()
subscribePresence()
```

## Presence Flow

Saat user login:

```text
status = online
```

Saat user masuk Multiplayer menu:

```text
status = online
```

Saat user klik Find Match:

```text
status = searching
```

Saat match ditemukan atau dimulai:

```text
status = in_match
```

Saat match selesai atau user kembali ke menu:

```text
status = online
```

Saat user logout:

```text
status = offline
```

Saat tab ditutup:

```text
status = offline
```

Jika update offline saat tab close gagal, UI tetap akan menganggap user offline jika `last_seen` lebih dari 45 detik.

## Heartbeat

Presence memakai heartbeat:

```text
15 detik
```

Setiap heartbeat, frontend meng-update:

```text
last_seen
updated_at
status
current_room_id
```

Fallback offline:

```text
last_seen > 45 detik = offline
```

## UI Indicator

Status memakai dot warna:

```css
online    = hijau
searching = kuning
offline   = merah
in_match  = ungu
```

Class CSS:

```text
presence-dot online
presence-dot searching
presence-dot offline
presence-dot in-match
```

## Supabase Setup

Langkah setup presence:

1. Buka Supabase Dashboard.
2. Masuk ke project `tactic-sonata`.
3. Buka SQL Editor.
4. Jalankan isi:

```text
supabase/presence_schema.sql
```

5. Buka menu Realtime.
6. Enable Realtime untuk:

```text
user_presence
```

Pastikan Realtime final:

```text
multiplayer_rooms      Enabled
multiplayer_messages   Enabled
user_presence          Enabled
users                  Disabled
multiplayer_history    Disabled
```

## Testing Register/Login

Test manual:

1. Buka website.
2. Register akun baru.
3. Pastikan masuk ke Title Screen.
4. Logout.
5. Login ulang dengan email dan password yang sama.
6. Refresh page.
7. Pastikan user tetap login.

Jika gagal:

- cek URL backend Render;
- cek `JWT_SECRET` di Render;
- cek endpoint `/api/auth/me`;
- cek browser console.

Endpoint backend sehat jika:

```text
https://tactic-sonata.onrender.com/api/auth/me
```

mengembalikan:

```json
{
  "success": false,
  "message": "Not authenticated.",
  "data": null
}
```

Response itu normal jika tidak mengirim token.

## Testing Online/Offline

Test manual:

1. Login user A.
2. Buka Supabase Table Editor.
3. Cek tabel `user_presence`.
4. Row user A harus muncul dengan:

```text
status = online
```

5. Klik Multiplayer.
6. Klik Find Match.
7. Status berubah menjadi:

```text
searching
```

8. Masuk match.
9. Status berubah menjadi:

```text
in_match
```

10. Kembali ke menu atau match selesai.
11. Status berubah menjadi:

```text
online
```

12. Logout.
13. Status berubah menjadi:

```text
offline
```

## Testing Realtime Opponent

Untuk test realtime:

1. Buka website di browser A.
2. Login sebagai user A.
3. Buka website di browser B atau incognito.
4. Login sebagai user B.
5. Masuk Multiplayer dengan dua user.
6. Pastikan status opponent berubah realtime:

```text
Searching
In Match
Offline
```

Jika status tidak realtime:

- pastikan `user_presence` sudah Realtime Enabled;
- cek RLS/policy;
- cek console error Supabase;
- cek row `last_seen`;
- refresh kedua browser.

## Security Notes

- Jangan expose Supabase service role key di frontend.
- Frontend hanya memakai anon key.
- Jangan enable Realtime untuk `users`.
- Jangan kirim `password_hash` ke frontend.
- Untuk production, aktifkan RLS pada `user_presence`.
- Untuk demo, RLS boleh disabled agar GitHub Pages mudah test.

## File yang Terlibat

```text
client/index.html
client/css/style.css
client/js/auth.js
client/js/presence.js
client/js/multiplayer.js
server/controllers/authController.js
server/routes/authRoutes.js
server/data/userStore.js
server/config/loadEnv.js
server/server.js
supabase/auth_schema.sql
supabase/presence_schema.sql
README.md
```

## Kesimpulan

Register/Login dan Online/Offline di TacTic Sonata bekerja sebagai dua layer:

- Auth memastikan user punya identitas dan session.
- Presence menunjukkan status user secara realtime, terutama untuk Multiplayer.

Dengan kombinasi JWT auth, Supabase Realtime, heartbeat, dan fallback `last_seen`, UI dapat menampilkan apakah user sedang online, mencari match, berada di match, atau offline.
