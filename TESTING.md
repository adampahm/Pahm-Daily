# Pemeriksaan v1.3.0 — 4 Oktober 2026

- 14 pengujian aplikasi: storage versi lama, quota/rollback, konflik tab, CRUD/pengulangan, JSON/ICS dan reminder.
- 23 pengujian sinkron kalender: 18 regresi + 5 baru untuk provider backend, reload, perpanjangan, 401, konkurensi dan pembatalan.
- 10 pengujian autentikasi backend dan browser adapter: memakai SQLite nyata (`node:sqlite`) dengan respons Google simulasi. OAuth state, PKCE, kode sekali pakai dan masa berlaku, pembatasan origin/akun, penyimpanan terenkripsi, refresh, revocation, serta disconnect/refresh race lolos.
- Service worker: pemasangan 10 aset core, cache berdasarkan scope, offline dan aktivasi update lolos dengan mock.
- Browser nyata: aplikasi v1.3.0 dimuat, Pengaturan terbuka tanpa console error, kode login yang tidak valid ditolak, viewport 390x844 tidak melebar horizontal (documentWidth 375).
- JavaScript syntax dan validasi aset/ID HTML diperiksa sebelum ZIP dibuat.

Belum diuji: Google OAuth dengan akun nyata, penerbitan Cloudflare, batas CPU Worker Free, pemindahan konteks login Safari/Home Screen iPhone, reminder iPhone fisik. Pengguna perlu memasang konfigurasi terlebih dahulu, lalu mengikuti uji login/reload/lebih dari satu jam dalam panduan.

Tidak ada Client Secret atau token pengguna yang digunakan pada pengujian. Paket tidak memuat rahasia produksi. Source worker yang disertakan tidak mencetak kredensial ke console; matikan invocation logs sebelum OAuth nyata.

Jalankan dari folder paket memakai Node 24+:

```text
node app/tests/app.test.cjs
node app/tests/google-calendar.test.cjs
node app/tests/service-worker.test.cjs
node backend/test.mjs
```
