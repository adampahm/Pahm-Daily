# Verifikasi v1.4.0

- 17 tes aplikasi: data v1, backup/restore, pengingat 5 menit/kustom, batas 28 hari, bawaan tidak mengubah jadwal lama, pengecualian berulang, lokal 0/28 hari dan deduplikasi.
- 26 tes Google Calendar dengan Google dimock: regresi OAuth/sinkron, pembaruan pengingat memakai ID yang sama tanpa POST/DELETE, normalisasi waktu Google, retry respons PUT hilang, waktu sinkron terakhir setelah reload.
- 10 tes backend/browser authentication dengan SQLite nyata dan Google dimock. Kode backend tidak berubah.
- Tes service worker: instalasi atomik, cache sesuai scope, offline, update, sumber eksternal tidak dicache.
- Browser: viewport 320,390,1280 piksel; tidak ada overflow horizontal; bawaan 5 menit, formulir kustom 2 jam, simpan jadwal, penolakan nilai 40321, log tanpa error/warning. Screenshot adalah pratinjau lokal dengan data contoh dan Google belum terhubung.
- JavaScript, ID HTML, aset, manifest dan integritas ZIP diperiksa.

Tes OAuth/Calendar memakai mock, bukan login Google produksi. Pengingat suara pada perangkat fisik dan sinkron versi ini di akun pengguna perlu diperiksa setelah unggah. Integrasi versi 1.3 telah dikonfirmasi berfungsi oleh pengguna.
