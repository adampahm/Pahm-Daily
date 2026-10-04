# Pengujian v1.1.0 — 4 Oktober 2026

Pengujian dilakukan di Windows dan browser desktop pada URL subfolder `http://localhost:8080/FahmiDaily-PWA/`. Tidak ada iPhone fisik tersambung. Daftar ini membedakan pemeriksaan nyata browser dari pengujian logika yang memakai mock.

## Hasil

| Pemeriksaan | Hasil / batas |
| --- | --- |
| JavaScript | `node --check app.js` dan `node --check service-worker.js` lolos |
| Manifest / ikon | JSON valid, standalone, id/start_url/scope relatif; ikon PNG 180/192/512, file asli identik |
| Aset / subpath | Semua link lokal dan core service worker tersedia; aplikasi nyata dibuka di subfolder |
| Service worker registration | Browser nyata menampilkan Cache offline siap |
| Offline | Server lokal dihentikan, browser reload tetap memuat aplikasi, kalender, dan jadwal yang tersimpan |
| Update | Worker baru memunculkan Perbarui Aplikasi; setelah aktivasi/reload jadwal uji tetap ada |
| Tambah/edit/persist | Browser nyata menambah kegiatan lengkap, mengedit judul, reload mempertahankan kegiatan; console tanpa error fatal |
| Responsive | Pemeriksaan DOM dan screenshot pada viewport 320×568, 375×812, 390×844; documentWidth tidak melebihi viewport, week view dua kolom; form tidak keluar lebar layar |
| Data / storage | 14 pengujian logika lolos, termasuk data lama, corrupt storage, quota, stale tab, exception, add/edit/move/delete, validasi backup, restore rollback |
| Kalender berulang | Logika daily/weekly/custom/until dan edit/hapus one/all lolos; tanggal awal series dan form disabled regression lolos |
| Filter / statistik | Pencarian/filter diperiksa logika; browser menampilkan ringkasan minggu dan kalender; bentrok tetap membaca kategori tersembunyi |
| Backup JSON | Generator File JSON dan restore roundtrip diuji dalam harness; invalid JSON/schema/atribut berbahaya ditolak; beforeRestore diperiksa |
| ICS | Generator diuji: UTC, stable UID, judul/lokasi/catatan, text escaping, CRLF, UTF-8 line folding 75 octet, VALARM 10/30/1440 menit |
| Reminder | Mock permission/delivery menguji filter diabaikan, sukses tidak dikirim ulang, kegagalan boleh dicoba lagi, pause saat hidden |
| Standalone | Unit test deteksi iOS/navigator.standalone; manifest ditinjau. Mode Home Screen iPhone nyata belum diuji |
| Cache isolation | Harness worker menguji cleanup scope sendiri, tidak menghapus cache aplikasi lain, navigasi offline, asset dikenal, request luar scope/POST diabaikan, notifikasi fokus aplikasi sendiri |

**Belum terverifikasi end-to-end:** instalasi Safari/Home Screen, notch/Dynamic Island/Home Indicator, keyboard/picker iOS, restart perangkat, native Share → Save to Files, impor Apple Calendar dan delivery alarm di perangkat. Event download browser in-app tidak selesai dalam batas waktu saat tombol kalender dicoba; isi file .ics diverifikasi melalui generator, bukan dianggap telah berhasil diimpor. Lakukan checklist iPhone di README setelah deploy. Tidak ada klaim reminder saat aplikasi tertutup.

## Menjalankan ulang pengujian logika di Windows

Memerlukan Node.js 20+; tidak diperlukan untuk menjalankan aplikasi. Dari folder project:

```powershell
node --check app.js
node --check service-worker.js
node tests/app.test.cjs
node tests/service-worker.test.cjs
```

Harness memakai Node VM dengan DOM/localStorage/Cache/Notification mock. Ini memeriksa logika produksi tanpa menambahkan test hook atau library pihak ketiga ke browser. Worker test memeriksa aset sebenarnya dari project. Pengujian browser/iPhone manual tetap diperlukan.

## Uji update/offline manual

1. Jalankan server, buka aplikasi, tunggu Cache offline siap.
2. Tambah/edit kegiatan, reload dan pastikan tetap ada.
3. Hentikan server (Ctrl+C), reload dan buka kalender. Data dan shell harus tetap tersedia.
4. Nyalakan server, ubah satu label dan VERSION worker, buka Periksa Update.
5. Tutup form, Perbarui, cek label baru serta kegiatan lama. Jangan gunakan ulang nama cache release.
6. Pada perangkat iPhone lakukan mode pesawat dan restart setelah pemasangan, lalu periksa backup/restore dan alarm Calendar.
