# Update Fahmi Daily v1.6.0

## Update GitHub Pages
1. Di aplikasi lama, Pengaturan → Backup Data, simpan JSON.
2. Ekstrak FahmiDaily-v1.6.0-Compact.zip. ZIP berisi frontend pada root, siap unggah.
3. Buka https://github.com/adampahm/Pahm-Daily pada branch/folder tempat index.html lama berada.
4. Add file → Upload files: unggah isi hasil ekstraksi ke lokasi yang sama. Sertakan semua file aplikasi, folder icons dan .nojekyll. Jangan menambahkan folder pembungkus atau memindahkan URL aplikasi.
5. Commit, lalu tunggu deployment Pages pada tab Actions berhasil.
6. Di aplikasi: Pengaturan → Periksa Update → Perbarui Aplikasi. Simpan/tutup formulir dahulu.
7. Pastikan versi v1.6.0, data lama tersedia, dan Google kembali Sinkron selesai.

Cloudflare, D1, OAuth Google dan API cuaca tidak memerlukan konfigurasi baru. Backend tetap v1.3.0. Jangan hapus data situs, mencopot aplikasi, atau mengatur ulang koneksi Google untuk update ini.

## Tampilan ringkas
- Peringatan hujan: nama kegiatan, tanggal/jam, “Pertimbangkan mengganti waktu kegiatan”, maksimal dua alternatif waktu, serta tombol Ubah Waktu / Tetap Lanjutkan / Batalkan.
- Probabilitas, curah hujan, alasan prakiraan, zona waktu, dan waktu pemeriksaan berada di Lihat Detail yang tertutup secara default. Atribusi Open-Meteo tetap terlihat kecil.
- Pembatalan tetap meminta konfirmasi. Alternatif tetap berdasarkan data yang tersedia, tanggal/durasi yang sama, antara 06:00–21:00, dan bebas bentrok dengan jadwal lokal.
- Kartu cuaca, notifikasi perangkat, sinkronisasi Google, serta pemberitahuan pembaruan menggunakan pesan pendek. Informasi lengkap tetap dapat dibuka melalui detail.

## Lokasi Saya sebagai bawaan
1. Jadwal baru → pilih Outdoor. Metode bawaan Lokasi Saya; kolom pencarian kota tersembunyi.
2. Jika browser menyatakan izin lokasi sudah diberikan, aplikasi mengambil satu posisi secara otomatis. Tidak ada watchPosition atau pelacakan berkelanjutan.
3. Jika izin belum diberikan atau tidak dapat diperiksa, tekan Gunakan Lokasi Saya. Tombol ini dapat memunculkan permintaan izin sistem.
4. Jika ditolak atau pengambilan posisi gagal, aplikasi membuka Pilih Lokasi Lain untuk pencarian kota. Izin yang diketahui ditolak tidak diminta berulang secara otomatis.
5. Sesudah dipilih, lokasi diringkas menjadi nama dan tombol Ubah. Gunakan Ubah untuk membuka pilihan metode kembali.
6. Ketika mengedit jadwal, koordinat yang tersimpan dipertahankan, termasuk untuk rangkaian berulang dan lokasi perangkat lama. Lokasi tidak mengikuti perpindahan perangkat kecuali pengguna memilih lokasi baru.
7. Indoor tidak memeriksa izin atau mengambil lokasi. Respons lokasi/cuaca yang terlambat diabaikan ketika formulir ditutup, dibuka ulang, berubah ke Indoor, atau metode/lokasi sudah diganti.

Koordinat kegiatan tetap tersimpan di jadwal/backup dan dikirim ke Open-Meteo untuk pemeriksaan. Penjelasan singkat muncul saat pertama memakai lokasi, dan detail privasi selalu tersedia. Status izin browser/iOS dapat berbeda; jika pemeriksaan status tidak didukung, gunakan tombol lokasi atau pencarian manual.

## Pemeriksaan setelah update
- Buat jadwal Outdoor baru: periksa pilihan Lokasi Saya dan pencarian manual yang tersembunyi.
- Coba lokasi perangkat. Jika browser menampilkan permintaan izin, pilih sesuai keinginan. Coba pula Pilih Lokasi Lain → kota → pilih hasil.
- Simpan jadwal, buka kembali, dan pastikan lokasinya tidak berubah otomatis.
- Uji jadwal berisiko hujan: detail tertutup, tindakan mudah ditemukan, maksimal dua alternatif.
- Ubah waktu/status, lalu periksa hasil di Google Calendar.

Pemeriksaan cuaca tetap berjalan hanya saat aplikasi aktif; tidak ada Web Push cuaca saat aplikasi ditutup. Pengingat kalender mengikuti fitur kalender yang sudah ada.

Referensi perilaku izin browser:
https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query
https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
