# Update Fahmi Daily v1.7.0

Versi ini menyederhanakan Pengaturan menjadi lima menu, mengganti pemilih waktu dengan interval 5 menit, memindahkan status sinkronisasi ke Koneksi Kalender, dan memakai ikon navy–putih. Pengaturan cuaca ada di Pengingat. Cara instalasi iPhone dihapus dari antarmuka.

## Langkah update GitHub Pages

1. Buka aplikasi lama → Pengaturan → Data → Backup Data. Simpan file JSON.
2. Ekstrak FahmiDaily-v1.7.0-Minimal.zip.
3. Buka repositori https://github.com/adampahm/Pahm-Daily dan folder yang sekarang berisi index.html.
4. Pilih Add file → Upload files. Unggah semua isi hasil ekstrak, termasuk folder icons. Jangan unggah ZIP atau membungkusnya dalam folder tambahan. Timpa file dengan nama sama.
5. Commit perubahan dan tunggu proses GitHub Actions/Pages selesai hijau.
6. Buka https://adampahm.github.io/Pahm-Daily/ → Pengaturan → Aplikasi & Penyimpanan → Periksa Update. Tutup formulir, lalu tekan Perbarui Aplikasi jika muncul.
7. Periksa versi v1.7.0 di Aplikasi & Penyimpanan. Periksa jadwal dan buka Koneksi Kalender untuk status sinkronisasi.

Data tetap menggunakan penyimpanan lama. Jangan hapus data situs, ganti URL aplikasi, atau menghapus aplikasi untuk menjalankan update. Cloudflare dan konfigurasi Google tidak perlu diubah.

## Ikon iPhone

File apple-touch-icon dan manifest sudah diperbarui. Ikon yang telah dipasang di layar utama mungkin tetap memakai gambar lama; ikon lama tidak menghalangi pembaruan aplikasi. Coba tutup dan buka kembali aplikasi dahulu. Jangan menghapus aplikasi atau data hanya untuk mengganti ikon. Bila ingin mencoba pintasan baru, buat backup terlebih dahulu, tambahkan dari URL yang sama di Safari tanpa menghapus pintasan lama, lalu periksa jadwal dan koneksi sebelum memakainya. Jika data berbeda pada pintasan baru, pertahankan aplikasi lama; pemulihan backup memerlukan pemeriksaan tujuan kalender sebelum sinkronisasi.

## Verifikasi

21 pengujian aplikasi, 27 Google Calendar, 19 cuaca, dan pemeriksaan service worker lulus. Termasuk backup/restore, waktu lama 09.03/10.07 tetap utuh, pengingat pada event kalender yang sama, dan sinkron tanpa duplikasi. Tampilan diuji pada viewport 390×844 serta 1280×900; bukan pengujian langsung Safari pada iPhone fisik. Login Google nyata tidak dijalankan dalam pratinjau ini.

## Isi paket

Paket Minimal berisi frontend siap unggah. Paket Cloudflare berisi frontend, backend yang tetap sama, dokumentasi, dan pengujian. Tangkap layar tersedia terpisah di folder outputs.
