# Fahmi Daily v1.3.0 — pemasangan Cloudflare

Worker Anda: https://fahmi-daily-api.fajarxxx055.workers.dev

Aplikasi Anda: https://adampahm.github.io/Pahm-Daily/

Database Anda: fahmi-daily-db, binding **DB**. Binding sudah terlihat pada screenshot Anda. Paket ini belum dipasang ke Cloudflare atau GitHub oleh Codex. Server yang terpasang sebelumnya masih Hello World.

## 1. Simpan cadangan

Di aplikasi lama pilih Pengaturan → Backup Data. Simpan JSON dan pastikan file dapat ditemukan. Tetap memakai URL dan perangkat/browser yang sama agar jadwal dan tautan kalender lama dipertahankan.

Paket berisi:

- `backend/schema.sql`: tabel database, tidak menghapus data yang sudah ada.
- `backend/worker.mjs`: seluruh kode Worker yang ditempel ke Cloudflare.
- `backend/buat-kunci.html`: pembuat kunci lokal tanpa koneksi jaringan.
- `backend/wrangler.jsonc`: konfigurasi untuk pengguna CLI; tidak diperlukan untuk pemasangan dashboard ini.
- `app/`: aplikasi baru yang nanti diunggah ke lokasi website lama.

## 2. Buat tabel D1

1. Buka Cloudflare → Storage & databases → D1 SQL Database.
2. Pilih **fahmi-daily-db**, lalu tab **Console**.
3. Di Windows, klik kanan `backend/schema.sql` → Open with → Notepad. Salin seluruh isinya.
4. Tempel pada editor SQL D1 lalu **Execute / Run**. Jika editor hanya menerima satu perintah, jalankan masing-masing perintah yang diakhiri titik koma secara berurutan.
5. Pada Tables, pastikan ada `oauth_flows`, `oauth_completions`, `sessions`, dan `rate_limits`.

SQL memakai CREATE TABLE IF NOT EXISTS; menjalankannya lagi tidak menghapus jadwal atau koneksi yang sudah ada.

## 3. Tambahkan callback Google pada Client ID lama

1. Buka Google Cloud Console → pilih project **Adam daily** → Google Auth Platform → Clients.
2. Buka **Web client yang sudah dipakai oleh Fahmi Daily v1.2.0**. Gunakan Client ID yang sama agar akses kalender lama dipertahankan.
3. Biarkan Authorized JavaScript origins berisi `https://adampahm.github.io`.
4. Pada **Authorized redirect URIs**, tambahkan persis:

   ```text
   https://fahmi-daily-api.fajarxxx055.workers.dev/oauth/callback
   ```

5. Klik Save. Callback berbeda dari origin: callback memang memakai path `/oauth/callback`.
6. Siapkan **Client ID** dan **Client Secret** milik Web client tersebut. Jika Secret lama tidak dapat dilihat lagi, periksa file kredensial yang Anda simpan; jika tidak ada, gunakan fasilitas menambah/merotasi secret pada client yang sama sesuai tampilan Google. Jangan membuat project baru atau mengubah Client ID sembarangan.
7. Pastikan Google Calendar API aktif. Scope tetap `openid`, email, dan `https://www.googleapis.com/auth/calendar.app.created`. Akun Google yang akan dihubungkan harus ada sebagai Test user selama mode Testing.

Client Secret diperlukan oleh server versi ini; masukkan hanya ke Cloudflare Secrets. Jangan tempel ke source website, GitHub, screenshot, atau chat.

## 4. Buat kunci dan isi konfigurasi Worker

1. Buka file `backend/buat-kunci.html` di browser laptop.
2. Klik **Buat kunci acak 256-bit**. Salin hasilnya dan simpan salinan di pengelola kata sandi. Halaman ini tidak mengirim kunci ke jaringan.
3. Buka Cloudflare → Compute → Workers & Pages → **fahmi-daily-api** → **Settings**.
4. Pada **Runtime variables and secrets**, klik **Add variable**. Tambahkan empat nilai berikut:

| Name | Type | Value |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Text | Client ID Web yang sama dengan aplikasi lama |
| `GOOGLE_CLIENT_SECRET` | Secret | Client Secret dari Google |
| `TOKEN_ENCRYPTION_KEY` | Secret | Hasil dari pembuat kunci lokal |
| `ALLOWED_GOOGLE_EMAIL` | Text | Email akun Google Calendar yang Anda gunakan |

Email Google Calendar dapat berbeda dari akun Cloudflare. Jangan menyalin contoh email. Server sengaja membatasi login ke satu email milik Anda.

5. Simpan / Deploy perubahan jika diminta.
6. Pastikan binding `DB` tetap mengarah ke **fahmi-daily-db**.
7. Pada **Settings → Observability**, matikan **Logs / Include Invocation logs** sebelum mencoba login. URL callback mengandung kode OAuth sementara; hindari merekam URL ini dalam log. Kode Worker tidak menulis token atau data login ke console. Jangan aktifkan layanan logging pihak ketiga pada endpoint OAuth.

## 5. Pasang kode Worker

1. Buka `backend/worker.mjs` dengan Notepad, lalu salin seluruh isinya.
2. Pada halaman Worker Cloudflare, klik **Edit code** di kanan atas.
3. Buka file utama yang saat ini berisi `export default` dan `Hello World` (biasanya `worker.js` atau `index.js`).
4. Ganti seluruh kode contoh itu dengan isi `worker.mjs`. Nama file di editor boleh tetap; kode ini memakai format module Worker.
5. Klik **Deploy**.
6. Buka:

   ```text
   https://fahmi-daily-api.fajarxxx055.workers.dev/health
   ```

7. Pastikan respons menyebut `"version":"1.3.0"`, `"ready":true`, dan `"tablesReady":true`.

Jika `tablesReady:false`, periksa SQL dan binding DB. Jika tabel siap tetapi `ready:false`, periksa keempat variabel/Secrets. Health tidak menampilkan Secret maupun kunci. Jika masih Hello World, kode belum berhasil diterbitkan. Jika error HTTPS hanya terjadi pada Wi-Fi laptop, gunakan jaringan yang berhasil mengakses Worker; jangan mematikan pemeriksaan sertifikat.

Status ready hanya memeriksa keberadaan konfigurasi dan tabel. Kebenaran Client Secret, izin, dan callback baru terbukti setelah uji login nyata.

## 6. Perbarui website

1. Setelah server ready, unggah **seluruh isi folder `app/`** ke lokasi `index.html` lama pada repository **Pahm-Daily**.
2. Jangan unggah folder backend, kunci, atau Client Secret ke website. Jangan membuat folder `app/` tambahan di dalam URL lama.
3. Commit dan tunggu penerbitan GitHub Pages selesai.
4. Buka Fahmi Daily → Pengaturan → Periksa Update → Perbarui Aplikasi.
5. Pastikan versi **v1.3.0** dan jadwal lama tetap tampil.

## 7. Hubungkan Google sekali untuk server

1. Gunakan Fahmi Daily dari perangkat dan tempat yang biasa dipakai, misalnya ikon Home Screen iPhone. Jangan mulai dari Safari lalu berpindah ke penyimpanan PWA yang berbeda.
2. Buka Pengaturan → Google Calendar otomatis → **Siapkan Koneksi Google**.
3. Client ID akan terisi otomatis dari server. Pastikan sesuai client lama.
4. Tekan **Hubungkan Google**. Selesaikan izin di akun yang sama dengan `ALLOWED_GOOGLE_EMAIL`.
5. Setelah berhasil, kembali ke aplikasi asal. Bila status belum berubah, salin seluruh **kode koneksi** pada halaman hasil login.
6. Pada Fahmi Daily, buka **Masukkan kode jika login tidak kembali otomatis**, tempel kode, lalu **Selesaikan Koneksi**. Kode hanya berlaku 5 menit, sekali pakai, dan terikat pada login yang dimulai dari aplikasi tersebut.
7. Tunggu **Sinkron selesai**.

Jika pindah perangkat/browser dan metadata kalender lama tidak ada, pulihkan backup jadwal lebih dahulu, lalu isi ID kalender lama sebelum Siapkan Koneksi. ID bisa dilihat di Google Calendar web → Settings → kalender Fahmi Daily → Integrate calendar. Jangan menyinkronkan beberapa perangkat dengan data lokal berbeda ke kalender yang sama.

## 8. Uji sebelum mengandalkan fitur

1. Buat satu jadwal uji dan pastikan masuk ke kalender Fahmi Daily pada Google/iPhone.
2. Reload aplikasi. Tambah atau edit jadwal uji; harus tersinkron tanpa menekan Hubungkan Google kembali.
3. Setelah lebih dari satu jam, edit lagi. Server seharusnya memperbarui token otomatis.
4. Uji keadaan offline: perubahan tetap lokal, lalu dicoba lagi ketika aplikasi aktif dan online.
5. Uji reminder pada iPhone dengan jadwal 20 menit ke depan dan reminder 10 menit. Bunyi/getaran mengikuti pengaturan iOS.

## Batas penggunaan

- Koneksi perangkat berlaku maksimal **90 hari**, atau lebih singkat bila Google membatalkan izin. Login ulang tetap mungkin diperlukan.
- Pada OAuth **External / Testing**, refresh token untuk izin kalender umumnya berlaku **7 hari**. Untuk pemakaian jangka panjang, tinjau Audience → Publish app / In production dan persyaratan Google yang ditampilkan. Mengubah status saja bukan jaminan verifikasi atau izin permanen. Jika sebelumnya mendapat token Testing, hubungkan ulang setelah status berubah untuk memperoleh izin baru.
- Backend memperbarui token ketika diperlukan. Tidak ada proses yang membuat iPhone menjalankan PWA saat ditutup. Perubahan lokal dikirim ketika aplikasi aktif dan online; event yang sudah ada di Google tetap tersedia untuk pengingat kalender.
- Jadwal, kategori dan catatan dikirim langsung dari aplikasi ke Google, bukan disimpan dalam database backend ini. D1 menyimpan kredensial terenkripsi (termasuk identitas akun), sesi perangkat berbentuk hash, serta data OAuth sementara. IP untuk pembatasan percobaan disimpan sebagai hash dalam bucket waktu.
- Token Google jangka pendek hanya di memori browser. Refresh token dan Client Secret tidak dikirim ke browser. Browser menyimpan kredensial sesi perangkat terpisah dari backup; kredensial ini memberi akses ke token kalender dan harus diperlakukan sebagai rahasia. Hanya gunakan source aplikasi yang Anda percayai pada origin GitHub Pages tersebut.
- **Hentikan Sinkron** menghentikan sinkron lokal dan menghapus sesi perangkat ini dari server saat online. Event kalender tetap ada. Pencabutan seluruh izin aplikasi dapat dilakukan melalui pengaturan akun Google.
- Jangan mengganti kunci enkripsi tanpa rencana migrasi: koneksi lama tidak lagi dapat dibaca. Backup JSON tidak mencadangkan kredensial Google.
- Paket dirancang untuk Workers Free + D1 Free. Pengujian runtime Cloudflare, batas CPU, Google nyata, dan Safari iPhone tetap perlu dilakukan setelah pemasangan. Pantau Usage sebelum memperluas penggunaan.

## Referensi

- Cloudflare D1: https://developers.cloudflare.com/d1/get-started/
- Cloudflare Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Google server OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Masa berlaku refresh token: https://developers.google.com/identity/protocols/oauth2#expiration
