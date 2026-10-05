# Verifikasi v1.6.0
- 20 tes aplikasi/data/backup/pengingat/metadata Outdoor dan pembatalan.
- 27 tes Calendar (Google dimock) termasuk kompatibilitas sinkron waktu/status dan tanpa duplikasi akibat metadata cuaca.
- 19 tes cuaca/UI: regresi interval/risk/cache/offline, review tindakan, respons lama, deduplikasi notifikasi; izin granted/prompt/denied/unsupported/tanpa API, GPS gagal, snapshot otomatis sekali, Indoor tanpa geolocation, lokasi tersimpan tetap, izin/GPS terlambat diabaikan, detail tertutup dan maksimal dua alternatif.
- 10 tes backend/authentication, SQLite nyata dan Google dimock. Backend tidak berubah.
- Service worker: 12 aset, offline, subpath, cache scoped, update, sumber eksternal tidak dicache.
- JavaScript syntax, ID HTML/aset, manifest, ZIP diperiksa.
- Browser iPhone/desktop: default Lokasi Saya, pencarian manual, API Open-Meteo nyata untuk Bandung, dialog ringkas, detail tersembunyi, tombol terlihat, pilihan waktu, navigasi dan penyimpanan.
- Izin lokasi/GPS diuji secara simulasi, bukan membaca posisi pengguna atau mengubah izin perangkat. Preview browser mengunci status izin ke prompt, sementara cuaca/pencarian kota menggunakan Open-Meteo nyata. Kode mock ini hanya ada di work/preview16; tidak masuk paket aplikasi.
- Google produksi dan iPhone fisik tidak diuji ulang pada versi ini. Periksa setelah deployment.
