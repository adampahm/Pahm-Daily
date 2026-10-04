# Fahmi Daily PWA — v1.1.0 untuk iPhone

Modifikasi langsung dari FahmiDaily-PWA-v1.0.zip; bukan aplikasi baru. Tetap static HTML/CSS/JS, tanpa build, backend, login, analytics, script pihak ketiga, atau database cloud. Data jadwal tetap lokal. Source asli tidak diubah di Downloads.

## Sebelum memperbarui aplikasi lama

1. Di aplikasi lama, ekspor backup JSON dan simpan salinannya di tempat aman.
2. Untuk update yang mempertahankan data, gunakan URL, akun browser, dan perangkat yang sama. Key localStorage tetap `fahmiDailyPWA.v1` dan format data tetap versi 1.
3. Jika berpindah dari localhost Windows ke URL HTTPS/iPhone, data **tidak berpindah otomatis**. Gunakan Pengaturan → Pulihkan Backup pada iPhone. Safari dan Home Screen juga dapat memiliki penyimpanan berbeda; periksa isi dari aplikasi yang terpasang dan pulihkan bila perlu.
4. Jangan hapus data situs, uninstall aplikasi, atau mengubah domain sebelum membuat backup.

## Fitur yang dipertahankan

- Hari Ini, Kalender harian/mingguan/bulanan, Pengaturan, kategori bawaan/kustom.
- Tambah/edit/hapus kegiatan, tanggal, jam mulai/selesai, lokasi, catatan.
- Pengulangan harian, mingguan, hari tertentu, batas akhir; edit/hapus satu kejadian atau seluruh rangkaian.
- Status selesai/dibatalkan, deteksi bentrok, pencarian dan filter kategori.
- Reminder 10 menit, 30 menit, 1 hari; backup/restore JSON; jadwal kuliah awal tetap sama.

Ditambahkan: statistik minggu ini (jumlah, selesai, dibatalkan), ekspor satu kejadian ke .ics dengan alarm, bantuan pemasangan, deteksi standalone, status cache offline, pemeriksaan update, dan permintaan penyimpanan persisten. Kalender mingguan memakai dua kolom agar tidak perlu scroll horizontal.

## Menjalankan di Windows

Extract ZIP, buka PowerShell pada folder `FahmiDaily-PWA` yang berisi `index.html`, lalu:

```powershell
python -m http.server 8080
```

Jika perintah python tidak tersedia tetapi Python Launcher sudah terpasang, gunakan `py -m http.server 8080`. Buka **http://localhost:8080/**. Hindari membuka index.html melalui file://. `localhost` dipercaya untuk service worker di komputer itu saja; alamat HTTP IP LAN tidak menggantikan HTTPS untuk pengujian PWA iPhone.

Tunggu Pengaturan menunjukkan **Cache offline siap** sebelum mencoba offline. Bila versi baru muncul, simpan/tutup semua form, buat backup, kemudian tekan Perbarui Aplikasi. Ctrl+C menghentikan server lokal.

## Deploy HTTPS gratis dari Windows — GitHub Pages

Metode yang dipilih: GitHub Pages dengan repository public dan file static pada root. Tidak membutuhkan Mac, Xcode, npm, atau App Store.

1. Masuk ke GitHub dan buat repository public bernama `FahmiDaily-PWA` (buat README awal agar branch main tersedia).
2. Di repository, pilih **Add file → Upload files**. Upload **isi** folder FahmiDaily-PWA: index.html, app.js, styles.css, manifest.webmanifest, service-worker.js, README.md, AUDIT.md, TESTING.md, folder icons/ dan tests/. Jangan upload ZIP sebagai pengganti file. index.html harus di root repository, bukan dalam folder FahmiDaily-PWA tambahan.
3. Tambahkan `.nojekyll` yang disertakan. Jika File Explorer menyembunyikannya, pilih Add file → Create new file, isi nama `.nojekyll`, biarkan isi kosong, lalu commit.
4. Commit ke `main`. Buka **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**.
5. Tunggu deployment berhasil. Salin URL yang ditampilkan Pages, biasanya `https://USERNAME.github.io/FahmiDaily-PWA/`. Pakai URL HTTPS ini dengan trailing slash. Aktifkan **Enforce HTTPS** ketika tersedia.
6. Buka URL di Safari iPhone, tunggu cache siap, dan ikuti petunjuk pemasangan di bawah.

Semua asset, manifest, scope, dan start_url memakai path relatif. Service worker terdaftar di folder aplikasi sehingga deployment pada subpath berfungsi. Tidak perlu mengubah kode untuk nama repository berbeda.

**Privasi hosting:** repository public dan source dapat dilihat orang lain. Source asli memuat jadwal kuliah awal dan lokasinya. Tinjau bagian `defaults()`/`course()` sebelum mempublikasikan bila informasi itu tidak ingin terlihat publik. Jangan upload backup JSON atau secret. Hosting menerima permintaan file aplikasi, tetapi kode tidak mengirim jadwal yang Anda masukkan. Website tidak menghalangi orang lain membuka UI; setiap browser mempunyai data sendiri.

Dokumentasi resmi: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Memasang di iPhone

1. Buka URL HTTPS Fahmi Daily di Safari.
2. Tekan **Share / Bagikan**.
3. Pilih **Add to Home Screen / Tambahkan ke Layar Utama**. Bila tidak terlihat, periksa daftar aksi/Edit Actions.
4. Jika tersedia, aktifkan **Open as Web App / Buka sebagai App**, lalu tekan **Add / Tambah**.
5. Buka Fahmi Daily dari Home Screen, tunggu **Cache offline siap** di Pengaturan.
6. Pulihkan backup lama jika diperlukan, lalu buat backup baru untuk memastikan data benar.

Hint pemasangan hanya muncul pada browser iOS yang belum standalone. Bantuan tetap dapat dibuka dari Pengaturan. App shell mempunyai safe area atas, bawah, kiri, kanan dan input 16px untuk mengurangi auto-zoom Safari.

Dokumentasi Apple: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios

## Backup dan pemulihan

Pengaturan → **Backup Data** membuat JSON lokal. Pada perangkat yang mendukung file sharing, pilih **Save to Files / Simpan ke File** dan lokasi **On My iPhone / Di iPhone Saya** jika ingin cadangan tetap lokal. Browser lain memakai unduhan. Memilih iCloud Drive/email pada lembar Bagikan adalah tindakan Anda sendiri; aplikasi tidak mengupload otomatis.

**Pulihkan Backup** → pilih .json (maksimum 10 MB) → konfirmasi penggantian. File divalidasi sebelum data diganti. Salinan data sebelum restore disimpan lokal sebagai `fahmiDailyPWA.v1.beforeRestore`; ini hanya cadangan tambahan, bukan pengganti export file. Developer dapat mengambil salinan itu dari DevTools → Application → Local Storage → key tersebut, menyimpannya sebagai JSON, lalu mengimpor kembali. Jika kuota tidak cukup untuk salinan dan restore, restore ditolak dan data lama dipertahankan.

Data yang tidak dapat dibaca tidak ditimpa default; penyimpanan diblokir dan banner muncul. Backup Data dapat mengekspor data mentah untuk penyelamatan. File recovery yang rusak mungkin perlu diperbaiki sebelum bisa diimpor. Ketika penyimpanan sama sekali tidak dapat diakses, aplikasi menjelaskan bahwa backup tidak tersedia. Konflik data dari tab lain juga menolak write agar tidak menimpa data baru.

localStorage sesuai untuk ukuran jadwal aplikasi ini, jadi tidak ada migrasi IndexedDB. Penutupan normal, reload, dan restart perangkat tidak sengaja menghapus penyimpanan. Namun browser/OS dapat menghapus data, pengguna dapat menghapus data situs, dan private browsing tidak cocok untuk data permanen. Tombol penyimpanan persisten adalah permintaan kepada browser, bukan jaminan. **Tidak ada janji data browser mustahil hilang: backup tetap diperlukan.**

## Reminder dan Tambahkan ke Kalender

Reminder lokal diperiksa setiap 30 detik saat aplikasi aktif dan ketika kembali terlihat. Izin notifikasi diperlukan dan dukungan browser dapat berbeda. Timer tidak dijamin saat app ditutup, background, layar terkunci, atau iPhone direstart. Izin notifikasi tidak menjadikan timer lokal sebagai background scheduler.

Untuk kegiatan penting:

1. Buka kegiatan melalui menu **••• → Tambahkan ke Kalender**.
2. Aplikasi menghasilkan file `.ics` berisi **satu kejadian yang dipilih**, judul, lokasi, catatan, waktu mulai/selesai UTC hasil konversi zona waktu perangkat, UID stabil, dan VALARM sesuai reminder 10/30/1440 menit.
3. Pilih Kalender jika tersedia pada lembar Bagikan, atau simpan file. File `.ics` dari Blob/Files/Safari **tidak selalu langsung bisa diimpor ke Apple Calendar**.
4. Apple mendokumentasikan impor `.ics` dari lampiran **Mail**. Jika Anda memilih cara itu, kirim file sendiri ke akun Mail Anda, buka lampirannya di Apple Mail, lalu tambahkan event. Pilihan ini melibatkan layanan email; aplikasi tidak mengirim email dan tidak melakukannya otomatis. Jika ingin sepenuhnya lokal dan impor tidak tersedia, masukkan detail kegiatan dan alarm secara manual di Kalender.
5. Periksa judul, tanggal, zona waktu, jam mulai/selesai, kalender tujuan, dan alarm. Dukungan alarm tergantung importer/settings Calendar. Untuk menjaga data lokal, pilih kalender lokal bila tersedia; kalender iCloud/akun lain akan mengikuti sinkronisasi akun itu.

Ekspor tidak mensinkronkan perubahan. Edit/hapus di Fahmi Daily tidak otomatis mengubah event Calendar; sesuaikan event di Calendar sendiri. Rangkaian berulang tidak diekspor sebagai RRULE, agar exception/hapus kejadian tidak salah tersalin. Ekspor tiap kejadian penting. Hindari duplikasi saat mengekspor ulang; UID stabil tidak menjamin semua importer melakukan upsert.

Apple .ics/Mail: https://support.apple.com/guide/iphone/ipha0d932e96/ios
iCalendar RFC 5545: https://www.rfc-editor.org/rfc/rfc5545

## Opsi Web Push untuk masa depan (tidak diimplementasikan)

Web Push didukung untuk Home Screen web apps pada iOS/iPadOS 16.4+ dengan izin lewat aksi pengguna. Untuk mengirim reminder ketika app tertutup, diperlukan push subscription, endpoint pengirim/backend, kunci VAPID yang private tetap di server, dan scheduler yang mengetahui waktu reminder. GitHub Pages static saja tidak menyediakan bagian itu. Sinkronisasi jadwal/subscription ke layanan tersebut memerlukan persetujuan eksplisit Anda; tidak ada pengiriman atau backend dalam versi ini. Push juga bergantung pada koneksi serta pengaturan perangkat dan bukan alarm native dengan jaminan tepat waktu.

Referensi: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

## Update dari Windows

1. Backup terlebih dahulu. Edit file pada komputer.
2. Bila index.html, app.js, CSS, manifest, atau ikon berubah, ubah `VERSION` di service-worker.js ke nama release baru yang unik. Jangan memakai ulang nama cache release lama.
3. Upload seluruh perubahan dalam **satu commit/release** ke repository yang sama. Jangan ubah domain/scope/key storage.
4. Tunggu deployment sukses. Pada iPhone ketika online, buka Pengaturan → Periksa Update. Setelah paket lengkap tercache, tombol Perbarui muncul.
5. Simpan/tutup form lalu Perbarui Aplikasi; halaman dimuat ulang dan localStorage dipertahankan. Jika update masih menunggu, tutup jendela lain dari aplikasi yang sama lalu buka lagi. Cache release lama milik scope ini dibersihkan ketika worker baru aktif; cache aplikasi lain tidak dibersihkan.

Core memakai cache-first per versi; navigasi memakai index.html dari cache versi yang sama. Install tidak otomatis memaksa worker baru menggantikan form aktif. File core gagal diunduh akan menggagalkan instalasi; versi lama masih dapat dipakai. README/AUDIT/TESTING tidak termasuk shell offline.

## Checklist setelah terpasang

- [ ] Ikon benar; dibuka dari Home Screen tanpa address bar, hint instalasi menghilang.
- [ ] Safe area tidak tertutup notch/Dynamic Island/Home Indicator, portrait dan landscape.
- [ ] Tambah kegiatan dengan kategori/tanggal/jam/lokasi/catatan; edit, selesai/batal, hapus.
- [ ] Tutup/buka ulang, restart iPhone, pastikan jadwal tetap ada.
- [ ] Kalender harian/mingguan/bulanan, pencarian, filter, statistik tampil benar.
- [ ] Daily/weekly/custom recurring: edit/hapus satu kejadian dan seluruh rangkaian; tanggal awal tetap benar.
- [ ] Keyboard: catatan paling bawah bisa diisi, scroll form lancar, Simpan/Batal bisa digunakan.
- [ ] Backup Data → simpan JSON; Pulihkan Backup → cek semua jadwal dan exception.
- [ ] Setelah cache siap, mode pesawat → tutup/buka ulang aplikasi, edit jadwal offline, lalu online lagi.
- [ ] Ekspor .ics: pastikan title/lokasi/catatan/jam dan alarm 10 menit, 30 menit, 1 hari benar di Calendar.
- [ ] Alarm Calendar diuji saat aplikasi PWA ditutup; jangan mengandalkan timer PWA.
- [ ] Deploy update, pastikan prompt tampil dan data tetap ada setelah update.

Lihat **AUDIT.md** untuk temuan/perubahan file dan **TESTING.md** untuk bukti pengujian serta hal yang belum diverifikasi di iPhone fisik.
