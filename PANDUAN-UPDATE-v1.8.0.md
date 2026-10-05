# Update Fahmi Daily v1.8.0

## Perubahan

- Jam dan menit dipisahkan. Ketik angka langsung, atau pilih saran jam 00–23 dan menit 00–59 jika browser menampilkannya. Angka dinormalkan menjadi dua digit saat keluar dari kolom.
- Jadwal baru memakai waktu selesai +1 jam. Setelah selesai diubah manual, perubahan mulai tidak mengubahnya lagi. Editor jadwal lama mempertahankan waktu tersimpan secara persis.
- Waktu selesai wajib setelah waktu mulai. Jadwal saat ini hanya satu tanggal; mulai 23.00 atau setelahnya meminta selesai pada hari yang sama tanpa berputar ke hari berikutnya.
- Tombol menu hanya titik tiga dengan area sentuh minimal 44×44, nama aksesibilitas Menu jadwal.
- Alternatif cuaca mempertahankan durasi hingga menit persis dan memperbarui kolom jam/menit bersama nilai jadwal. Memilih alternatif berarti memilih kedua waktu secara manual.
- Data, backup, pengingat, cuaca, konfigurasi kalender dan backend tetap kompatibel. Tidak ada perubahan kunci penyimpanan atau reset koneksi.

## Update GitHub Pages

1. Di aplikasi yang dipakai sekarang: Pengaturan → Data → Backup Data. Simpan JSON.
2. Ekstrak FahmiDaily-v1.8.0-Time.zip.
3. Buka https://github.com/adampahm/Pahm-Daily dan folder yang sekarang berisi index.html.
4. Add file → Upload files. Unggah seluruh isi hasil ekstrak beserta icons. Timpa file nama sama; jangan unggah ZIP dan jangan buat folder pembungkus baru.
5. Commit changes. Tunggu deployment GitHub Pages/Actions hijau.
6. Buka aplikasi dari pintasan yang sama → Pengaturan → Aplikasi & Penyimpanan → Periksa Update. Tutup atau simpan formulir, lalu Perbarui Aplikasi bila tersedia.
7. Periksa versi v1.8.0, jadwal lama, dan status Koneksi Kalender. Coba kegiatan baru dengan mulai 14.07: selesai 15.07. Ubah selesai 16.12, lalu ubah mulai 15.07: selesai harus tetap 16.12.

Jangan hapus pintasan, data situs atau koneksi Google. Jangan membuat kalender baru untuk update. Cloudflare tidak perlu diubah. Pembaruan ini tidak membersihkan duplikat kalender yang sudah dibuat sebelumnya.

## Verifikasi

21 pengujian aplikasi, 27 Google Calendar, 19 cuaca, pemeriksaan service worker, dan 10 backend dijalankan. Skenario mencakup +1 jam/manual/edit lama, jam dan menit tidak valid, tengah malam, backup/restore, pengingat, sinkron idempotent serta perubahan event tanpa duplikasi. Tampilan dan input diuji melalui browser pada viewport 390×844 serta 1280×900; Safari pada iPhone fisik dan OAuth Google nyata belum diuji langsung. Backend diuji dengan SQLite nyata dan respons Google simulasi.

Paket Time berisi frontend siap unggah. Paket Cloudflare menyertakan sumber lengkap dan backend lama yang tetap sama. Tangkapan layar terpisah: waktu-iPhone, waktu-desktop, dan agenda-iPhone.
