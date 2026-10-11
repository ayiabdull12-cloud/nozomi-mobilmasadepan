# WarungRaya

Aplikasi berbahasa Indonesia untuk mencatat barang, stok, penjualan, dan keuangan satu warung. React + Vite untuk antarmuka, Express dan SQLite untuk penyimpanan di server. Desain menyesuaikan desktop dan ponsel. Berkas HTML Nozomi sebelumnya tetap tersimpan.

## Menjalankan

Gunakan Node.js 24 (minimal 22.13) dan npm. Dari direktori repositori:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

Perintah ini menjalankan Vite pada port 5173 serta API pada port 3001. Untuk build dan server produksi lokal:

```sh
npm run build
npm start
```

Server produksi menyajikan antarmuka dan API di port 3001. Secara bawaan API hanya mendengarkan loopback. Situs publik membutuhkan reverse proxy HTTPS, penyimpanan persisten, dan konfigurasi autentikasi di bawah. Publikasi lingkungan cloud bukan deployment website.

Database dibuat otomatis di `data/warung.sqlite`. Folder data diabaikan Git dan **harus dipertahankan** ketika aplikasi diperbarui atau lingkungan dipulihkan. Proses aplikasi perlu dimulai ulang di setiap tugas cloud; proses hidup tidak ikut disimpan dalam snapshot. Jangan membuat Git worktree tambahan untuk tugas cloud yang sudah terisolasi.

## Menggunakan aplikasi

1. **Pengaturan**: ubah nama warung, pemilik, alamat, telepon, slogan, saldo awal, dan pesan struk. Data contoh diberi label; hapus melalui konfirmasi setelah siap memakai data sendiri. Penghapusan mencakup semua catatan yang ada ketika mode contoh masih aktif, termasuk tambahan sendiri. Unduh cadangan terlebih dahulu.
2. **Barang & stok**: tambah nama, kode unik, kategori, satuan, harga modal, harga jual, stok awal, dan batas stok menipis. Nama, kategori, harga, satuan, dan batas stok dapat diedit. Barang stok nol dapat diarsipkan tanpa menghapus riwayat penjualan.
3. **Kasir & penjualan**: cari nama/kode barang, tambah ke keranjang, pilih pembayaran, lalu simpan. Uang tunai divalidasi dan kembalian dihitung. Stok dan pemasukan tercatat dalam satu transaksi database. Struk dapat dicetak atau diunduh.
4. **Restok**: tombol Stok mencatat pembelian dan pengeluaran sekaligus. Modal baru menggunakan rata-rata tertimbang stok lama dan biaya pembelian. Penyesuaian fisik stok tidak otomatis mencatat biaya; barang rusak dapat dicatat sebagai biaya secara terpisah.
5. **Keuangan**: catat, ubah, atau hapus pemasukan/pengeluaran manual; catatan otomatis dari kasir dilindungi dari perubahan. Modal pemilik tersedia sebagai kategori tersendiri. Filter periode dan pencarian tersedia, beserta ekspor CSV.
6. **Laporan**: grafik arus kas, rincian laba/rugi, margin, serta barang terlaris. Pilih hari ini, 7 hari terakhir, bulan ini, semua waktu, atau rentang tanggal sendiri.
7. **Cadangan**: unduh database SQLite yang konsisten melalui Pengaturan. JSON untuk membaca data dan CSV untuk mengolah laporan juga tersedia.

Harga/nominal dalam rupiah bulat; jumlah stok dalam unit bulat. Untuk penjualan timbang, tetapkan satuan kemasan seperti 100 gram sebagai satu unit. Aplikasi ini satu warung per database, tanpa manajemen cabang atau peran karyawan. Gunakan database dan akses yang terpisah untuk masing-masing warung.

### Arti angka laporan

- Pemasukan/pengeluaran adalah arus kas tercatat, termasuk modal pemilik dan pembelian stok.
- Saldo kas = saldo awal + semua pemasukan − semua pengeluaran, untuk semua metode pembayaran; saldo ini belum merupakan rekonsiliasi rekening bank atau saldo per dompet.
- Laba bersih = penjualan lunas + pemasukan lain − HPP barang terjual − biaya operasional. Modal pemilik dan pembelian stok tidak langsung dihitung dalam laba.
- HPP dan harga jual disimpan saat penjualan, sehingga perubahan harga berikutnya tidak mengubah laporan penjualan sebelumnya.
- Laporan belum mencakup pajak, penyusutan, piutang, refund/retur, dan biaya MDR Midtrans secara otomatis. Biaya MDR yang dibebankan penyedia dapat dicatat manual sebagai pengeluaran. Penjualan lunas belum dapat dibatalkan/di-refund lewat aplikasi; pembatalan QRIS tersedia untuk transaksi tertunda.
- Tanggal bisnis menggunakan Asia/Jakarta; transaksi demo bukan hasil usaha nyata.

## Midtrans QRIS otomatis

QRIS manual dapat digunakan tanpa kredensial: pelanggan membayar QRIS warung yang sudah ada, pemilik memastikan dana diterima, lalu mencentang konfirmasi sebelum menyimpan penjualan. Aplikasi tidak menyatakan dana sudah diterima hanya berdasarkan pilihan metode QRIS.

Untuk QRIS otomatis:

1. Pastikan QRIS aktif di akun Midtrans dan gunakan **Server Key sandbox** terlebih dahulu.
2. Masukkan konfigurasi ke `.env` yang diabaikan Git, atau sistem konfigurasi rahasia server. Jangan memasukkan nilai ke browser, source code, instruksi setup tersimpan, atau chat:
   - `MIDTRANS_SERVER_KEY`: kunci server mentah untuk autentikasi API **dan** perhitungan tanda tangan SHA-512. Placeholder rahasia proxy tidak dapat dipakai untuk perhitungan tanda tangan lokal; diperlukan injeksi rahasia ke proses server secara aman.
   - `PUBLIC_BASE_URL`: alamat HTTPS aplikasi yang dapat dijangkau Midtrans.
   - `APP_PASSWORD`: kata sandi akses pemilik; saat alamat publik diaktifkan, kata sandi wajib ada. Browser meminta HTTP Basic, nama pengguna `warung`. Gunakan HTTPS untuk akses publik.
   - `MIDTRANS_PRODUCTION=false` untuk sandbox.
3. Atur **Payment Notification URL** di dashboard Midtrans ke `<PUBLIC_BASE_URL>/api/qris/webhook`. Endpoint notifikasi tidak memakai Basic Auth; tanda tangan notifikasi dan status pembayaran diverifikasi terhadap Midtrans.
4. Izinkan koneksi HTTPS keluar ke `api.sandbox.midtrans.com` (sandbox) dan `api.midtrans.com` (produksi).
5. Mulai ulang server. Pengaturan menampilkan mode integrasi. Jalankan transaksi sandbox, pindai QRIS dengan alur tes resmi Midtrans, dan periksa perubahan status, stok, dan kas. Notifikasi duplikat tidak boleh menggandakan pemasukan.
6. Setelah alur sandbox terverifikasi, ganti ke Server Key produksi dan `MIDTRANS_PRODUCTION=true`, kemudian mulai ulang. Credential valid, aktivasi QRIS akun, pengaturan notifikasi, dan jaringan produksi harus diperiksa pada akun yang sebenarnya.

Transaksi otomatis mereservasi stok, tetapi belum mencatat pemasukan sebelum status `settlement` terverifikasi. Notifikasi membutuhkan tanda tangan SHA-512 valid, lalu server membaca status resmi, memeriksa order ID, nominal, dan jenis pembayaran. Pembayaran tertunda bisa diperiksa dan dibatalkan dari riwayat penjualan. Pembatalan melepaskan stok setelah penyedia mengonfirmasi statusnya. Jika charge timeout, aplikasi mempertahankan reservasi agar pembayaran yang mungkin sudah dibuat tidak menjadi penjualan ganda. Jika status penyedia belum tersedia, selesaikan masalah provider sebelum melepaskan reservasi. Pengiriman notifikasi wajib dapat dijangkau supaya pembayaran tetap tercatat ketika browser ditutup.

Saat ini kode integrasi diuji dengan data tiruan; pembayaran nyata dan sandbox akun pengguna belum diverifikasi. Kunci, URL HTTPS, dan akses akun harus diberikan melalui konfigurasi aman. Dokumentasi resmi: https://docs.midtrans.com/docs/qris

## Cadangan dan pemulihan

Cadangan dari Pengaturan menggunakan `VACUUM INTO` untuk salinan database konsisten, termasuk ketika database memakai WAL. Jangan menyalin hanya `warung.sqlite` ketika server masih berjalan tanpa menyertakan jurnalnya.

Untuk memulihkan cadangan SQLite:

1. Hentikan semua proses API yang memakai database tersebut.
2. Simpan database lama **beserta** `-wal` dan `-shm` jika ada sebagai cadangan terpisah.
3. Verifikasi file cadangan melalui SQLite `PRAGMA integrity_check;` dan pastikan berkas berasal dari sumber tepercaya.
4. Ganti `data/warung.sqlite` dengan cadangan; pindahkan jurnal lama bersama database lama supaya tidak diterapkan ke cadangan.
5. Mulai aplikasi dan periksa nama warung, barang, penjualan, dan saldo.

Cadangan JSON merupakan ekspor untuk pemeriksaan; aplikasi tidak menyediakan impor JSON.

## Validasi

```sh
npm test
npm run build
npm run test:e2e
```

Tes domain mencakup stok, transaksi atomik, snapshot HPP, QRIS manual, settlement idempoten, pembatalan reservasi, validasi nominal, perhitungan laba, dan persistensi database. Tes pembayaran memeriksa tanda tangan dan pencocokan status dengan data tiruan; tidak menggantikan pengujian sandbox akun Midtrans. Tes browser mencakup inventaris, kasir, catatan keuangan, pengaturan, dan tampilan ponsel. Chromium tersedia di lingkungan cloud pada `/usr/bin/chromium`; di mesin lain gunakan `CHROMIUM_PATH` untuk lokasi browser yang sesuai. Browser test menggunakan database terpisah di `/tmp` sehingga tidak mengubah data aplikasi.

## Versi web satu berkas, tanpa server

`npm run build:portable` menghasilkan `/workspace/warung-delivery/WarungRaya.html`. Untuk mesin di luar cloud, lokasi keluaran dapat diubah dengan `PORTABLE_OUTPUT_DIR`. Buka berkas tersebut di Chrome/Edge/Firefox desktop: semua JavaScript, grafik, dan font sudah disertakan sehingga tidak membutuhkan internet atau instalasi Node.js.

Versi ini memakai penyimpanan browser pada perangkat tersebut. Data tidak otomatis tersinkron dengan server atau perangkat lain. Pengaturan menyediakan ekspor JSON dan pemulihan dengan konfirmasi serta validasi isi cadangan. Jangan menghapus data browser, menggunakan mode privat, atau memindahkan berkas sebelum mengunduh cadangan. Pembukaan HTML lokal di HP bergantung pada kemampuan browser/manajer berkas.

Fitur barang, stok, kasir, keuangan manual, grafik, laba/rugi, struk, pengaturan, serta QRIS manual berfungsi. QRIS otomatis tidak tersedia di berkas mandiri karena membutuhkan server dan notifikasi Midtrans. Server Key tidak pernah dimasukkan ke HTML. Versi server tetap tersedia dengan SQLite dan integrasi Midtrans yang telah dijelaskan di atas.

Paket `WarungRaya-siap-pakai.zip` berisi HTML mandiri dan petunjuk penggunaan. Browser cloud memblokir navigasi `file://`, sehingga tes memuat byte HTML yang sama sebagai halaman statis melalui fixture HTTP. Tes offline memastikan tidak ada permintaan aset atau API; pembukaan file lokal pada browser pengguna perlu browser yang mengizinkan HTML/JavaScript lokal.

## Paket server untuk hosting

`Dockerfile` menyiapkan build Node.js 24.19.0 dan runtime tanpa dependensi pengembangan. Pasang volume persisten pada `/data`, gunakan reverse proxy HTTPS, dan isi `APP_PASSWORD` serta `PUBLIC_BASE_URL` di konfigurasi aman hosting. `MIDTRANS_SERVER_KEY` diperlukan hanya bila ingin QRIS otomatis. Berkas container tersedia sebagai konfigurasi deployment; build container belum diverifikasi dalam tugas ini. Website publik belum dideploy karena tidak ada koneksi akun hosting yang tersedia dalam sesi.
