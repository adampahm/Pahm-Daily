# Aktivasi Google Calendar — Fahmi Daily v1.2.0

URL aplikasi Anda: https://adampahm.github.io/Pahm-Daily/

Paket ini sudah menyediakan integrasi, tetapi belum terhubung ke akun Google Anda. OAuth Client ID belum diisi. Source ini belum diunggah ke GitHub oleh Codex.

## 1. Perbarui aplikasi

1. Ekspor backup JSON dari aplikasi lama terlebih dahulu.
2. Ekstrak ZIP v1.2.0. Unggah isi folder FahmiDaily-PWA (index.html dan seluruh file pendamping, termasuk google-config.js, google-calendar.js, ikon, dan service-worker.js) ke lokasi yang sama di repository Pahm-Daily. Jangan menambahkan tingkat folder baru.
3. Tunggu GitHub Pages selesai menerbitkan. Buka URL aplikasi yang sama, lalu Pengaturan → Periksa Update → Perbarui Aplikasi bila tersedia. Jangan hapus data situs.
4. Pastikan Pengaturan menampilkan bagian Google Calendar otomatis.

## 2. Buat OAuth Client ID

1. Buka https://console.cloud.google.com/ dan pilih/buat project.
2. Pada APIs & Services → Library, cari Google Calendar API, lalu Enable.
3. Buka Google Auth Platform. Isi Branding (nama aplikasi Fahmi Daily dan email dukungan Anda).
4. Pada Audience pilih External dan gunakan Testing untuk pemakaian pribadi. Tambahkan email Google Anda sebagai Test user. Akun lain yang ingin mencoba juga perlu dimasukkan selama mode Testing.
5. Pada Data Access tambahkan scope openid, email, dan https://www.googleapis.com/auth/calendar.app.created. Nama/menu konsol dapat berubah; cari bagian ekuivalen jika tampilannya berbeda.
6. Pada Clients buat OAuth client dengan tipe Web application.
7. Pada Authorized JavaScript origins masukkan tepat: **https://adampahm.github.io**. Origin tidak memakai /Pahm-Daily/, path lain, atau garis miring penutup. Untuk pengujian lokal opsional, tambahkan http://localhost:8080.
8. Model popup yang dipakai aplikasi tidak memerlukan redirect URI. Salin Client ID yang berakhiran .apps.googleusercontent.com. Jangan memasukkan atau mengirim Client Secret.

Client ID bersifat publik. Anda boleh memasukkannya di Pengaturan, atau mengisi window.FAHMI_GOOGLE_CLIENT_ID pada google-config.js sebelum mengunggah aplikasi. Client ID bukan kata sandi dan tidak memberikan akses kalender tanpa izin akun pengguna.

## 3. Hubungkan dari aplikasi

1. Di Pengaturan, tempel Client ID. Untuk perangkat pertama, biarkan ID kalender pemulihan kosong.
2. Tekan Siapkan Koneksi dan tunggu status siap.
3. Tekan Hubungkan Google. Pilih akun test user dan setujui izin. Jika Google menolak karena konfigurasi origin, akun test user, atau izin, perbaiki konfigurasi di Google Cloud; jangan mencoba melewati pembatasan browser.
4. Aplikasi membuat kalender khusus bernama Fahmi Daily. Jadwal yang sudah ada ikut disalin; berikutnya tambah/edit/hapus jadwal memicu sinkron otomatis saat sesi aktif.
5. Periksa status Sinkron selesai dan buka Google Calendar untuk memastikan judul, jam, pengulangan, serta reminder benar.

## 4. Tampilkan di Kalender iPhone

1. Pada iPhone, buka Pengaturan → Apps → Calendar/Kalender → Calendar Accounts/Akun Kalender → Add Account/Tambah Akun → Google (pada iOS lebih lama menu Kalender dapat langsung berada di Pengaturan).
2. Masuk dengan akun Google yang sama dan aktifkan Kalender.
3. Buka aplikasi Kalender → Calendars/Kalender, lalu centang kalender Fahmi Daily. Tunggu pembaruan akun.
4. Pastikan notifikasi Kalender diizinkan dan periksa pengaturan bunyi, mode Fokus, serta mode senyap. Uji dengan satu kegiatan beberapa menit ke depan sebelum mengandalkan reminder.

Reminder Google dikirim sebagai popup 10 menit, 30 menit, atau 1 hari sebelum kegiatan. Kegiatan selesai tidak memiliki reminder. Bunyi/getaran akhir dikendalikan iOS dan aplikasi kalender; ini tidak membuat alarm pada aplikasi Jam dan tidak menjamin dering dalam mode senyap/Fokus.

## Batas sinkron dan data

- Sinkron satu arah: jadwal lokal adalah sumber utama. Edit di Google/Apple Calendar tidak ditarik ke aplikasi. Gunakan Sinkron Sekarang untuk menyamakan kembali salinan milik aplikasi.
- Sinkron tidak berjalan saat PWA ditutup. Token hanya disimpan di memori: setelah reload, penutupan, atau kedaluwarsa, tekan Siapkan Koneksi bila perlu, lalu Hubungkan Google lagi. Kalender yang sudah tersalin tetap ada dan reminder kalender dapat berjalan tanpa PWA terbuka.
- Offline: jadwal tetap disimpan lokal. Hubungkan kembali saat online untuk mengirim keadaan terbaru.
- Data yang dikirim: judul, tanggal/jam, kategori, lokasi, catatan, pengulangan, dan reminder. Izin hanya meminta pengelolaan kalender yang dibuat aplikasi. Event milik aplikasi yang dihapus secara lokal akan dihapus dari salinannya pada sinkron berikutnya.
- Perubahan jadwal disalin lebih dahulu sebelum salinan lama dihapus; gangguan jaringan dapat meninggalkan duplikat sementara sampai sinkron berikutnya. Google/Apple juga dapat menunda pembaruan tampilan.
- Putuskan Koneksi menghentikan sinkron lokal, tetapi tidak menghapus kalender cloud atau mencabut izin Google. Izin dapat dicabut melalui pengaturan akun Google.
- Backup JSON tidak berisi token/konfigurasi Google. Setelah pemulihan backup, sinkron dijeda; tinjau data lalu tekan Sinkron Sekarang untuk menghindari penghapusan salinan cloud yang tidak disengaja.
- Untuk iPhone/perangkat baru, gunakan Client ID yang sama dan isi ID kalender lama sebelum Siapkan Koneksi. Cari Calendar ID pada Google Calendar web → Settings → pilih Fahmi Daily → Integrate calendar. Pulihkan backup JSON yang sama terlebih dahulu. Jangan membuat kalender baru jika ingin memakai kalender yang sudah ada.
- Hindari menyinkronkan dua perangkat dengan data lokal berbeda ke kalender yang sama: sinkron terakhir dapat menghapus event yang tidak ada di perangkat tersebut. Integrasi ini tidak menyediakan penggabungan data lintas perangkat.
- Jika pembuatan kalender terputus dan statusnya tidak pasti, aplikasi menghentikan percobaan pembuatan ulang agar tidak membuat duplikat. Periksa Google Calendar, lalu gunakan pemulihan ID kalender yang sudah dibuat.

## Referensi resmi

- Google OAuth token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Izin Calendar: https://developers.google.com/workspace/calendar/api/auth
- Google Calendar di Apple Calendar: https://support.google.com/calendar/answer/99358

Pengujian integrasi jaringan memakai mock. OAuth akun nyata, notifikasi iPhone, dan sinkron Apple Calendar perlu diuji setelah Client ID tersedia.
