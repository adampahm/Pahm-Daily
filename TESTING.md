# Verifikasi v1.5.0
- 20 tes aplikasi: regresi data/backup/pengingat, metadata Outdoor dan koordinat, ambang, exception berulang, pembatalan sesuai scope.
- 27 tes Calendar dengan Google dimock: regresi OAuth/sinkron dan pembaruan waktu/pembatalan Outdoor; metadata cuaca tidak menduplikasi acara.
- 11 tes cuaca dengan forecast/notifikasi dimock: rentang per jam/ujung parsial, kode hujan/badai, null/unknown, threshold, zona waktu berbeda, out-of-range, cache/offline, input lokasi, request bersamaan, konfirmasi tindakan, respons lama, izin lokasi ditolak, notifikasi sekali dan status selesai/dibatalkan.
- 10 tes backend/authentication dengan SQLite nyata, Google dimock. Backend tidak berubah.
- Service worker: 12 aset inti, offline di subpath, update, cache sesuai scope; API eksternal tidak dicache.
- Browser memakai API Open-Meteo nyata: pencarian Bandung, prakiraan hujan per jam, dialog hujan dan alternatif bebas bentrok, Ubah Waktu ke 19:00–20:00 dan simpan. Tampilan iPhone/desktop diperiksa.
- Tidak melakukan login Google produksi di pengujian versi ini, serta tidak menguji push/notifikasi pada iPhone fisik. Geolocation denial diuji memakai simulasi.
- JS syntax, ID HTML, aset, manifest, integritas ZIP diperiksa.
Screenshot pratinjau lokal menggunakan jadwal contoh dan data prakiraan yang dapat berubah; bukan tampilan akun Google produksi.
