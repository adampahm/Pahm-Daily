# Fahmi Daily v1.9.0 — kalender dan tampilan

## Temuan dan batas perbaikan

Pengguna memastikan hanya Kalender bawaan iPhone yang menampilkan satu kegiatan; Google Calendar menampilkan semua kegiatan. Pengujian kode tidak menemukan batas satu jadwal atau kegiatan tertimpa. Setiap kegiatan baru memakai ID unik; seluruh acara ditulis ke satu kalender tersimpan. Penyebab spesifik pada iPhone belum terverifikasi: akun, pilihan kalender, tanggal atau pembaruan Apple Calendar perlu diperiksa di perangkat.

Ada dua masalah antarmuka yang diperbaiki: filter kategori memengaruhi Hari Ini tanpa indikator, dan label Tambahkan ke Kalender dapat dianggap sinkron seluruh jadwal padahal hanya mengekspor satu kejadian ICS. Status sukses sebelumnya juga terlalu menyiratkan iPhone pasti mengikuti Google.

## Perubahan

- Indikator Filter aktif dengan jumlah kegiatan terlihat/total dan Reset Filter di Hari Ini; pencarian/filter di Kalender dapat direset sekaligus.
- Pesan kegiatan tersembunyi dibedakan dari tidak ada kegiatan. Filter tidak menghapus data dan tidak membatasi Google sync.
- Setelah menyimpan, tanggal kalender mengikuti tanggal kegiatan.
- Menu ICS dinamai Ekspor kegiatan (.ics), untuk satu kejadian.
- Koneksi Kalender menampilkan jumlah acara/rangkaian pada sinkron terakhir; ID kalender tujuan tetap di Lihat Detail. Jumlah rangkaian tidak sama dengan jumlah kemunculan berulang.
- Panduan iPhone tertutup secara default. Status sukses hanya mengonfirmasi pengiriman ke Google; tidak mengklaim Apple Calendar sudah menerima semuanya.
- Sinkron yang sudah ada tetap otomatis, digabung 600 ms, serialized, dicoba ketika kembali online. Saat aplikasi kembali terlihat dan online, perubahan dicoba lagi. Satu arah; perubahan Google tidak diimpor. Tidak menjanjikan sinkron saat PWA ditutup.
- Tidak menghapus duplikat atau membuat ulang kalender. Backend Cloudflare tidak berubah.

## Perbaiki tampilan iPhone

1. Di Google Calendar web dengan akun yang sama, buka salah satu kegiatan yang tidak muncul di iPhone. Periksa nama kalender dan tanggalnya. Kegiatan yang dahulu diimpor lewat ICS mungkin ada di kalender lain.
2. Di iPhone: Pengaturan → App → Kalender → Akun Kalender (iOS lama: Pengaturan → Kalender → Akun). Pilih akun Google yang sama dan pastikan Kalender aktif.
3. Buka Kalender iPhone → Kalender di bagian bawah. Centang Fahmi Daily di bawah akun Google tersebut, lalu Selesai. Periksa tanggal kegiatan yang tadi dipilih.
4. Jika ada beberapa kalender Fahmi Daily, cocokkan ID di aplikasi → Koneksi Kalender → Lihat Detail dengan Google Calendar web → Setelan kalender → Integrasikan kalender. Jangan menghapus kalender atau menyambungkan ulang hanya untuk mencoba.
5. Bila masih hanya satu kegiatan, kirim tangkapan layar daftar Kalender pada iPhone dan nama/tanggal satu kegiatan yang tidak tampil. Perbaikan kode ini tidak dapat mengatur akun kalender iPhone secara langsung.

Sumber: https://support.google.com/calendar/answer/99358?co=GENIE.Platform%3DiOS&hl=id dan https://support.apple.com/id-id/guide/iphone/iph3d1110d4/ios

## Update GitHub Pages

1. Backup Data melalui Pengaturan → Data pada aplikasi yang dipakai sekarang.
2. Ekstrak FahmiDaily-v1.9.0-Calendar.zip.
3. Buka repositori https://github.com/adampahm/Pahm-Daily dan folder tempat index.html lama berada.
4. Add file → Upload files: unggah semua isi hasil ekstrak termasuk icons; timpa file nama sama. Jangan unggah ZIP atau menambah folder pembungkus.
5. Commit dan tunggu GitHub Pages/Actions selesai hijau.
6. Gunakan pintasan yang sama → Pengaturan → Aplikasi & Penyimpanan → Periksa Update → Perbarui Aplikasi bila tersedia. Tutup/simpan formulir dahulu.
7. Periksa versi v1.9.0, jadwal tersimpan, dan Koneksi Kalender.

Jangan hapus penyimpanan, pintasan, atau koneksi Google. Pertahankan URL lama. Paket belum dipublikasikan oleh agent.

## Pengujian

22 skenario aplikasi, 28 Google Calendar, 19 cuaca, pemeriksaan service worker, serta 10 backend lulus. Skenario baru: lima kegiatan satu hari, beberapa tanggal, jadwal harian berulang, reload, ID unik, filter dan pencarian, reset filter, perubahan waktu, perubahan digabung, offline → online, dan satu kalender tanpa duplikasi. Google diuji melalui simulasi API; iPhone fisik belum diuji. Browser viewport 390×844 dan 1280×900 diperiksa. Data lama, backup, pengingat, cuaca dan sinkron tetap kompatibel.
