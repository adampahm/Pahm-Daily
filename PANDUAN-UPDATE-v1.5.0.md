# Fahmi Daily v1.5.0 — Cuaca Outdoor

## Update dari versi yang sudah berjalan
1. Buat Backup Data melalui Pengaturan dan simpan JSON.
2. Ekstrak FahmiDaily-v1.5.0-Weather.zip. ZIP ini berisi file frontend pada root, siap unggah.
3. Buka https://github.com/adampahm/Pahm-Daily, pada branch/folder tempat index.html lama berada.
4. Add file → Upload files: unggah isi hasil ekstraksi ke lokasi lama, termasuk weather.js dan weather-ui.js, serta semua file aplikasi lainnya. Pertahankan folder icons dan .nojekyll. Jangan mengunggah folder pembungkus sehingga index.html berpindah lokasi.
5. Commit perubahan dan tunggu tab Actions menunjukkan deployment Pages berhasil.
6. Buka aplikasi → Pengaturan → Periksa Update → Perbarui Aplikasi. Simpan/tutup formulir sebelum memperbarui.
7. Pastikan status aplikasi v1.5.0 dan jadwal lama tetap tersedia. Jangan menghapus data situs atau mengatur ulang koneksi Google.
8. Uji jadwal Outdoor, pencarian kota, dan sinkron Google setelah perubahan waktu/status.

Server Cloudflare/D1 dan OAuth Google tetap menggunakan konfigurasi yang sudah ada. Backend tetap v1.3.0; tidak perlu deploy ulang, API key, akun cuaca, atau secret tambahan untuk penggunaan pribadi nonkomersial.

## Cara menggunakan
1. Tambah/ubah jadwal: isi tanggal dan jam seperti biasa. Jam jadwal tetap mengikuti zona waktu perangkat untuk menjaga kompatibilitas Kalender Google dan data lama.
2. Pilih Jenis kegiatan → Outdoor. Jadwal lama secara efektif Indoor sampai ditandai Outdoor.
3. Masukkan kota lalu Cari Lokasi dan pilih hasil yang tepat. Alternatifnya tekan Gunakan Lokasi Saya; izin hanya diminta saat tombol ditekan. Bila ditolak, gunakan pencarian manual. Koordinat disimpan bersama jadwal/backup dan dikirim ke Open-Meteo ketika diperiksa.
4. Cuaca kegiatan memeriksa seluruh rentang jam. Data cuaca dicocokkan lewat timestamp UTC dan waktu lokasi ditampilkan dengan zona lokasi, termasuk bila lokasi berbeda dari perangkat.
5. Ketika menyimpan jadwal yang berisiko hujan, pilih Ubah Waktu, Tetap Lanjutkan, atau Batalkan Kegiatan. Pembatalan meminta konfirmasi. Jadwal tidak diubah otomatis.
6. Alternatif waktu ditawarkan pada tanggal yang sama antara 06:00–21:00, memakai durasi yang sama, risiko lebih rendah, dan tidak berbenturan dengan jadwal lokal. Jika tidak tersedia, aplikasi menjelaskannya. Memilih alternatif mengisi jam formulir; periksa lalu simpan.
7. Kartu jadwal Outdoor menampilkan status cuaca. Peringatan di bagian atas aplikasi merangkum hingga lima kegiatan berisiko agar mudah dibuka.
8. Pengaturan → Cuaca Outdoor: ambang kemungkinan hujan bawaan 60%, dapat diubah menjadi angka bulat 1–100%. Prediksi kode hujan/gerimis/badai juga memicu peringatan walaupun probabilitas lebih rendah atau tidak tersedia; alasan ditampilkan.

## Data dan batas pemeriksaan
- Penyedia: Open-Meteo Forecast API dan Geocoding API. Atribusi tersedia di kartu cuaca; hasil merupakan interpretasi prakiraan, bukan kepastian.
- Prakiraan diminta hingga 16 hari. Cakupan per jam aktual tetap diperiksa; di luar cakupan atau data tidak lengkap tampil Prakiraan belum tersedia, tidak dianggap aman.
- Curah hujan merupakan jumlah pada jam prakiraan yang bersinggungan dengan kegiatan. Untuk jam parsial, bukan estimasi persis jumlah selama menit kegiatan saja.
- Cache per lokasi berlaku 30 menit, maksimal 10 lokasi. Permintaan bersamaan memakai satu permintaan. Tombol Coba Lagi tetap dibatasi minimal 2 menit untuk data yang baru diambil; setelah itu dapat meminta pembaruan.
- Pemeriksaan mendatang berjalan saat aplikasi dibuka/kembali aktif, setelah jadwal berubah, dan setiap 30 menit selama aplikasi terlihat aktif. Batas 40 kejadian per putaran; kejadian yang belum diperiksa diprioritaskan pada putaran berikutnya. Pemeriksaan otomatis dibatasi minimal 2 menit; pemeriksaan manual/perubahan jadwal memakai cache agar tidak membebani layanan.
- Kegiatan selesai/dibatalkan tidak memicu peringatan. Prakiraan rangkaian berulang diperiksa per tanggal kejadian, hanya yang berada dalam jangkauan.
- Offline/gagal layanan: jadwal tetap dapat disimpan; hasil lama ditandai. Hasil lama tidak memicu notifikasi perangkat baru.
- Tidak ada pelacakan lokasi berkelanjutan. Pencarian nama kota dikirim ke layanan geocoding; koordinat dipakai oleh layanan forecast. Permintaan tidak membawa credential Google.

## Notifikasi
Peringatan di aplikasi selalu tersedia tanpa izin notifikasi. Jika izin notifikasi web sudah diberikan dan didukung perangkat, risiko hujan dapat menghasilkan notifikasi perangkat ketika pemeriksaan berjalan. Notifikasi risiko yang sama untuk kejadian, lokasi dan waktu yang sama tidak dikirim berulang. Jika layanan atau penyimpanan notifikasi gagal, kemampuan perangkat dapat terbatas.

Saat PWA ditutup: tidak ada pemeriksaan cuaca terjadwal dan tidak ada Web Push cuaca pada versi ini. Pengingat kalender yang sudah tersinkron tetap mengikuti kalender. Pemeriksaan saat ditutup memerlukan pekerjaan berikutnya: penyimpanan jadwal/koordinat di backend, scheduler Cloudflare, langganan Web Push/VAPID, serta izin notifikasi dan dukungan iOS untuk PWA yang dipasang. Itu belum dipasang dalam pembaruan ini.

## Ketentuan Open-Meteo (diperiksa 5 Oktober 2026)
Free/Open Access untuk penggunaan nonkomersial: tanpa API key, limit 600 permintaan/menit, 5.000/jam, 10.000/hari, dan 300.000/bulan. Tanpa jaminan uptime. Jika aplikasi dijadikan komersial atau untuk banyak pengguna, tinjau ulang paket berbayar dan kuotanya; credential berbayar harus disimpan di backend, bukan frontend.

Sumber:
- https://open-meteo.com/en/pricing
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api

## Cek setelah update
Tambahkan kegiatan Outdoor dan pilih kota. Uji peringatan saat ada risiko, lalu ubah waktu atau batalkan. Periksa Sinkron selesai dan hasil di Google Calendar. Uji backup JSON; atribut Outdoor dan koordinat ikut tersimpan. Jadwal lama tidak diubah oleh pembaruan.
