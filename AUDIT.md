# Tambahan v1.3.0

Backend baru menggunakan Web Crypto AES-GCM, OAuth state/PKCE, pembatasan satu email, origin eksplisit, kredensial sesi acak 256-bit disimpan sebagai hash, kode koneksi sekali pakai, dan expiry 90 hari. Jadwal tetap berada di perangkat dan Google. Frontend tidak menerima refresh token atau Client Secret. Pengujian backend menggunakan SQLite nyata dan Google simulasi. Lihat TESTING.md pada akar paket untuk batas validasi.

# Audit Fahmi Daily v1.0 → v1.1.0

Semua source dibaca sebelum modifikasi: index.html, styles.css, app.js, manifest.webmanifest, service-worker.js, README.md; dimensi PNG diperiksa dan ikon utama dilihat. Aplikasi dipertahankan, bukan dibuat ulang. Ikon 180/192/512 benar dan identik secara byte dengan versi asli, sehingga tidak perlu generator ikon.

| File | Temuan awal | Perubahan |
| --- | --- | --- |
| index.html | Meta Apple, viewport-fit, bottom nav sudah ada; belum ada hint standalone/.ics/statistik | Hint iOS, modal Cara Pasang, tombol Backup Data/Pulihkan Backup, status offline/update, panduan reminder/Calendar, statistik minggu ini |
| styles.css | Safe area hanya atas/bawah; week view scroll horizontal; beberapa tap target <44px | Safe area keempat sisi, week grid dua kolom, target sentuh diperbesar, input 16px, VisualViewport form, body lock ketika dialog, reduced motion |
| app.js | localStorage v1; error read jatuh ke default; write tidak ditangani; import hanya memeriksa dua array | Key/schema tetap v1, validasi penuh backup, data rusak tidak ditimpa, rollback saat write gagal, salinan sebelum restore, deteksi write tab lain, file share/download lokal |
| app.js | Filter diterapkan ke reminder dan bentrok; edit series memakai tanggal occurrence; form baru dapat tetap disabled setelah edit satu kejadian | Reminder/bentrok memakai semua kategori, event batal/selesai dikecualikan dari bentrok, edit all memakai data awal series, reset recurrence enabled, penghapusan kategori memperhatikan exception |
| app.js | Reminder ditandai terkirim sebelum notification berhasil; scope dialog Escape dapat meninggalkan Promise | Tandai reminder setelah notifikasi berhasil, hanya proses saat terlihat, scope cancel selesai; tidak menambahkan backend |
| app.js | Belum ada calendar export/standalone detector | ICS satu kejadian, UTC, CRLF, escape text, UTF-8 folding 75 octet, VALARM; deteksi matchMedia/navigator.standalone |
| manifest.webmanifest | Standalone/path relatif sudah benar; any+maskable mengklaim safe zone tanpa audit khusus | Tambah id relatif, pertahankan start_url/scope/display/theme/background; purpose any sesuai desain ikon saat ini |
| service-worker.js | Cache v1, menghapus semua cache origin, forced skipWaiting, runtime cache setiap request, HTML fallback juga untuk JS/image | Cache unik per scope/release; core lengkap; aktivasi lewat tombol; cleanup terbatas; navigasi shell konsisten; hanya asset dikenal; notificationclick scope aplikasi |
| README.md | Petunjuk hosting beberapa pilihan; keterbatasan notifikasi sudah disebut | Pilih GitHub Pages, langkah Windows/HTTPS/subpath, backup/pindah origin, update, Calendar/Mail, Web Push terpisah, checklist |

File tambahan: `.nojekyll`, `AUDIT.md`, `TESTING.md`, `tests/app.test.cjs`, `tests/service-worker.test.cjs`. Semua perubahan berada dalam project final di outputs. Jadwal kuliah awal dan seluruh fitur lama dipertahankan. Statistik belum ada pada source asli, sehingga ditambahkan sebagai ringkasan minggu ini.

Tidak menambahkan script pihak ketiga, cloud storage, analytics, secret, atau login. Jadwal runtime tidak diupload. GitHub Pages mempublikasikan source termasuk data kuliah awal yang sudah ada dalam source; tinjau sebelum upload. Backup/perangkat baru tetap perlu transfer JSON manual. LocalStorage tidak menjanjikan perlindungan terhadap penghapusan data browser/eviction perangkat.

## Tambahan v1.2.0 — Google Calendar

Integrasi opsional dengan scope calendar.app.created, kalender khusus, token hanya di memori, pemulihan ID kalender, sinkron satu arah, pengulangan dan pengecualian, reminder, serta jeda setelah restore. Konfigurasi lokal terpisah dari backup jadwal.

18 pengujian Google Calendar dengan mock lolos: idempotensi, kegagalan jaringan, offline, kedaluwarsa, isolasi akun/event, kuota dan tab usang, restore, serta pemulihan kalender. 14 pengujian aplikasi lama dan pengujian service worker tetap lolos. OAuth dan Calendar akun nyata belum diuji karena Client ID belum tersedia.
