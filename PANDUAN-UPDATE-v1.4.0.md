# Update Fahmi Daily ke v1.4.0

Paket FahmiDaily-v1.4.0-UI.zip berisi file aplikasi siap unggah ke GitHub Pages.
Server Cloudflare, D1, OAuth Google, dan secret yang sudah berjalan tidak perlu diubah.
Backend tetap versi 1.3.0; antarmuka aplikasi sekarang versi 1.4.0.

## Langkah update

1. Di aplikasi lama, buka Pengaturan → Backup Data. Simpan file JSON di tempat aman.
2. Ekstrak FahmiDaily-v1.4.0-UI.zip di komputer.
3. Buka https://github.com/adampahm/Pahm-Daily dan pilih branch yang digunakan GitHub Pages.
4. Buka folder tempat index.html aplikasi lama berada. Pilih Add file → Upload files.
5. Unggah isi hasil ekstraksi: index.html, app.js, styles.css, google-calendar.js, google-server.js, google-config.js, service-worker.js, manifest.webmanifest, folder icons, dan .nojekyll. Boleh sertakan panduan dan folder tests. Jangan mengunggah folder pembungkus sehingga index.html pindah lokasi. Jangan menambahkan secret ke GitHub.
6. Commit changes dengan pesan: Update Fahmi Daily v1.4.0 UI dan pengingat.
7. Buka tab Actions dan tunggu deployment Pages selesai (hijau).
8. Buka https://adampahm.github.io/Pahm-Daily/ atau aplikasi yang sudah terpasang. Buka Pengaturan → Periksa Update. Tunggu pemberitahuan versi baru, lalu tekan Perbarui Aplikasi. Tutup/simpan formulir sebelum memperbarui.
9. Setelah halaman dimuat ulang, pastikan Pengaturan → Aplikasi & penyimpanan menampilkan v1.4.0. Bila pemberitahuan belum terlihat, tutup lalu buka kembali aplikasi dan periksa update lagi saat online.
10. Pastikan jadwal lama masih ada dan Google kembali Sinkron selesai. Jangan menghapus data situs atau mencopot aplikasi untuk memperbarui.

## Pengingat baru

- Formulir jadwal: Tidak ada, 5 menit, 10 menit, 30 menit, 1 hari, atau Kustom.
- Kustom: angka bulat dan satuan menit/jam/hari. Batas keseluruhan 40.320 menit (28 hari). Angka 0 berarti saat kegiatan dimulai. Angka pecahan dan nilai di luar batas ditolak.
- Pengaturan → Pengingat: pilih bawaan lalu tekan Simpan Pengingat Bawaan. Hanya jadwal baru yang mengikuti bawaan. Jadwal lama mempertahankan pengingat masing-masing.
- Ubah pengingat suatu jadwal lalu simpan. Perubahan pengingat saja memperbarui acara Google dengan ID yang sama.
- Jadwal berulang: pilih Kejadian ini saja atau Seluruh rangkaian sesuai kebutuhan.
- Suara, getaran, volume, dan izin notifikasi mengikuti aplikasi kalender/iPhone. PWA tidak menentukan nada alarm. Notifikasi lokal hanya diperiksa saat aplikasi aktif.

## Cek setelah deployment

1. Tambahkan jadwal uji dengan pengingat 5 menit. Tunggu Sinkron selesai dan periksa acara di kalender.
2. Ubah pengingat menjadi Kustom → 2 Jam. Periksa waktu pengingat acara yang sama dan pastikan tidak ada duplikat.
3. Ubah bawaan menjadi 5 menit. Jadwal lama tidak berubah; formulir jadwal baru langsung memilih 5 menit.
4. Buat backup JSON dan simpan. Koneksi perangkat Google tetap menggunakan penyimpanan yang sudah ada; backup tidak menyertakan credential.

Batas pengingat merujuk dokumentasi Google Calendar:
https://developers.google.com/workspace/calendar/api/v3/reference/events
