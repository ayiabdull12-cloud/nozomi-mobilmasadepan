# Aynetpremium

Toko online terpisah dari WarungRaya. Nama toko awal **Aynetpremium**, nomor DANA awal **085156840563**; seluruh identitas dan pembayaran dapat diubah di panel pemilik. Isi nama pemilik rekening DANA sesuai yang tampil di aplikasi sebelum membuka checkout. Unggah QRIS resmi milik Anda; aplikasi tidak membuat QRIS pembayaran palsu.

## Versi perangkat

`downloads/aynetpremium/Aynetpremium.html` adalah satu file aplikasi untuk mencoba di komputer Chrome/Edge. Katalog, pembeli, dan pemilik pada browser yang sama menggunakan IndexedDB yang sama. Kata sandi contoh `demo-toko` hanya pemisah tampilan; bukan pengamanan toko publik. File lokal belum dapat diuji langsung pada Chromium cloud karena kebijakan navigasi `file://`; pengujian browser memuat HTML yang sama melalui fixture HTTP internal, tanpa API server dan aset luar.

Versi perangkat tidak menyinkronkan pesanan antarperangkat. Jangan menerbitkan HTML demo ini sebagai toko sungguhan. Data pelanggan dan cadangan JSON harus disimpan secara pribadi. Menghapus data browser dapat menghapus data toko. ZIP perangkat berisi HTML dan panduan, bukan akun hosting.

## Versi server untuk pelanggan

Node.js rekomendasi 24.19.0 (minimal 22.13). Dari folder utama repositori:

```sh
npm ci
npm run build:toko
# Buat ecommerce/.env berdasarkan ecommerce/.env.example.
# Isi SHOP_ADMIN_PASSWORD minimal 12 karakter.
npm run start:toko
```

`npm run dev:toko` menjalankan API dan Vite untuk pengembangan. `npm run test:toko` menjalankan pengujian domain; `npm run test:toko:e2e` memerlukan build server dan demo serta Chromium. Database toko berbeda dari database WarungRaya. Server tanpa konfigurasi password hanya berjalan sebagai contoh pada loopback; jangan gunakan password demo untuk toko publik.

Untuk hosting Node.js:

- Build: `npm ci && npm run build:toko`.
- Start: `node ecommerce/server.js`.
- Isi `SHOP_HOST=0.0.0.0`, `SHOP_PORT` sesuai port layanan (default 3003), `SHOP_DEMO=false`, `SHOP_ADMIN_PASSWORD` unik minimal 12 karakter, dan `SHOP_PUBLIC_URL=https://alamat-toko-anda`.
- Simpan `SHOP_DATABASE_PATH` di volume persisten (misalnya `/data/aynetpremium.sqlite`). Jangan menaruh database pada filesystem sementara.
- HTTPS diperlukan untuk sesi pemilik pada alamat publik. Kata sandi tidak ditaruh pada HTML, GitHub, atau chat.
- Dockerfile khusus tersedia melalui `docker build -f Dockerfile.ecommerce ...`; build container belum diuji di lingkungan ini. Jangan memakai Dockerfile WarungRaya untuk menjalankan toko.

Belum ada alamat toko publik yang dipasang dari sesi ini. Penyimpanan kode di GitHub tidak otomatis mengaktifkan hosting.

## Alur pembayaran dan stok

Produk dapat berisi harga jual, modal per unit, stok bebas jual, kategori, deskripsi, foto unggahan/URL, serta tautan produk. Tautan produk adalah tautan publik untuk informasi. Pilihan jenis produk mencakup barang fisik dan digital/layanan. Produk digital dapat memiliki tautan akses terpisah yang disembunyikan dari katalog dan pesanan belum lunas; tautan ditampilkan kepada pembeli setelah konfirmasi. Tautan eksternal yang sudah diterima pembeli tetap mengikuti kontrol akses penyedia tautan tersebut. Pesanan yang seluruh isinya digital tidak memakai ongkos kirim; pesanan campuran mengikuti pengiriman barang fisik.

Pembeli mengisi keranjang dan data kontak, memilih ambil di toko atau pengiriman dengan ongkir tetap, lalu memilih QRIS/DANA. Server menghitung harga dari database, menahan stok secara atomik, dan membuat pesanan dengan batas 24 jam. Permintaan checkout dengan kode sama tidak menggandakan pesanan. Tautan pelacakan bersifat rahasia dan hanya diberikan kepada pembeli terkait.

QRIS ditampilkan sebagai gambar milik pemilik dan pembeli memasukkan nominal. DANA berupa transfer manual ke nomor penerima, bukan integrasi API/deep link DANA. Pembeli dapat mengunggah bukti atau menulis nama pengirim dan waktu. Status berubah menjadi perlu diperiksa, tanpa menambah pendapatan. Pemilik memeriksa rekening dan mengonfirmasi uang diterima; baru penjualan, HPP, dan laporan tercatat. Mengonfirmasi ulang tidak menggandakan keuangan. Sistem ini tidak memvalidasi keaslian QRIS atau foto bukti; cocokkan penerima dan nominal pada aplikasi pembayaran.

Pesanan belum lunas dapat dibatalkan; stok dikembalikan sekali. Pesanan kedaluwarsa dilepas ketika API berikutnya mengakses toko. Pesanan lunas bisa ditandai diproses/dikirim/selesai dan diisi nomor resi. Pembatalan/refund setelah lunas belum didukung; memerlukan rekonsiliasi tersendiri. Harga, modal, akun penerima, serta tautan akses digital disimpan saat checkout, sehingga perubahan produk tidak mengubah pesanan lama. Formulir produk menggunakan revisi agar penyimpanan formulir lama tidak menimpa perubahan stok akibat pesanan baru.

## Keuangan

Penjualan terkonfirmasi termasuk ongkir diterima. Laba kotor = penjualan − HPP barang terjual. Laba bersih = laba kotor + pemasukan lain − biaya operasional. Harga modal dihitung dari snapshot saat checkout; masukkan harga modal yang benar sebelum produk dijual. Tidak ada perhitungan pajak, biaya provider, ongkir dibayar, penyusutan, atau refund otomatis: catat biaya terkait manual.

Catatan manual bisa ditambah, diubah, dan dihapus. Penjualan otomatis tidak dapat dihapus manual. Pembelian stok, modal pemilik, penarikan pemilik, dan aset hanya memengaruhi arus kas agar harga modal stok tidak dibebankan dua kali. Pengisian Pembelian stok tidak otomatis mengubah stok produk. Arus kas yang ditampilkan adalah perubahan dari catatan yang tersedia, bukan saldo rekening bank.

Laporan mempunyai rentang tanggal (Asia/Jakarta), grafik penjualan/laba, produk terlaris, dan ekspor CSV. Pengaturan menyediakan cadangan JSON untuk arsip; pulihkan server dari backup SQLite yang dibuat saat proses dihentikan atau dengan mekanisme SQLite backup, bukan dari file JSON melalui UI. Backup bisa berisi data kontak pelanggan dan bukti pembayaran. Hapus data contoh menghapus seluruh produk/pesanan/catatan saat mode contoh, termasuk tambahan, tetapi mempertahankan pengaturan.

## Batas penggunaan

Satu pemilik/toko, satu proses server SQLite. Katalog publik tidak memuat harga modal atau daftar pelanggan; panel memerlukan sesi HttpOnly dan CSRF. Nomor pesanan bukan akses pelacakan: pelacakan memerlukan token acak. Login dan checkout dibatasi per IP. Belum menyediakan multiadmin, akun pembeli, tarif ekspedisi dinamis, email otomatis, atau pembayaran otomatis. Admin logout/restart server mengakhiri sesi. Foto maksimal 2 MB per unggahan; banyak foto/bukti akan memperbesar database dan cadangan.

## Tampilan, berbagi, dan Google

Pelanggan membuka `/toko` atau `/` tanpa login. Halaman awal secara default menampilkan nama toko dan katalog langsung. Login hanya diperlukan di `/pemilik`; hash lama `#pemilik` tetap didukung untuk file demo. Pemilik dapat mengubah logo, banner, warna, jumlah kolom katalog, tampilan katalog/banner sambutan, pengumuman, penutupan pesanan baru, metode pembayaran aktif, dan batas waktu pembayaran 1–168 jam. Perubahan ini mempertahankan produk, pesanan, dan data keuangan yang ada. Nama, harga, dan stok produk tetap diatur melalui menu Produk.

Toko server mengirim HTML berisi nama dan produk sebelum JavaScript berjalan. Produk punya halaman `/produk/{id}/{nama-produk}`, judul/description/canonical, Open Graph, dan data terstruktur Product/Offer berharga IDR. Gambar produk unggahan tersedia melalui endpoint media publik. Harga modal, data pembeli, token pelacakan, dan tautan digital setelah bayar tidak ditaruh di HTML publik atau sitemap. Produk yang diarsipkan menjadi HTTP 404 dan dikeluarkan dari sitemap. Perubahan nama produk mengarahkan URL lama ke URL baru.

Pada Pengaturan → Bagikan toko, pemilik dapat menyalin tautan `/toko`, membagikan lewat perangkat/WhatsApp, dan membuat QR untuk membuka toko. QR tautan toko berbeda dari QRIS pembayaran. Tombol tersedia setelah `SHOP_PUBLIC_URL` diisi dengan **origin HTTPS domain publik**, tanpa path/query/username, misalnya origin domain milik pemilik. Aplikasi tidak membuat alamat publik dari localhost, file demo, atau GitHub. Pengaturan domain/port/password/database adalah variabel server, bukan URL bebas di formulir toko. Server menghormati `SHOP_PORT`, lalu `PORT` hosting jika tidak disetel, lalu 3003. Di balik reverse proxy yang tepercaya, set `SHOP_TRUST_PROXY` sesuai jumlah hop (1–3) atau `loopback` agar pembatasan percobaan login/checkout memakai IP pembeli; jangan mengaktifkan trust proxy pada server langsung yang menerima header dari internet.

`/robots.txt` dan `/sitemap.xml` disediakan otomatis. Pengindeksan memerlukan `SHOP_PUBLIC_URL`, `SHOP_DEMO=false`, data contoh sudah dihapus, dan pilihan "Izinkan Google mengindeks toko dan produk" aktif. Demo/perangkat/instalasi tanpa alamat publik memakai noindex dan sitemap kosong. Halaman pemilik, API, dan URL pelacakan pesanan diberi instruksi noindex; endpoint katalog/sesi publik diizinkan untuk membantu rendering oleh crawler. Judul/deskripsi pencarian dan kode verifikasi HTML-tag Google Search Console dapat diisi dari Pengaturan.

Setelah domain/hosting tersedia, sambungkan DNS dan HTTPS, pasang volume database persisten, isi pengaturan server, mulai ulang aplikasi, lengkapi identitas pembayaran serta produk nyata, lalu uji dari perangkat pelanggan. Verifikasi domain di Google Search Console, kirim `sitemap.xml`, dan minta pengindeksan. Belum ada domain/hosting pada sesi ini; belum ada situs didaftarkan atau diindeks Google. Google menentukan waktu muncul dan posisi pencarian. Fitur SEO tidak menjamin toko langsung muncul di hasil pencarian.
