import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createSeed } from '../domain.js';
const temporary=mkdtempSync(resolve(tmpdir(),'aynet-demo-'));
const output=resolve(process.env.SHOP_DEMO_OUTPUT || 'downloads/aynetpremium');
try{
 await build({configFile:false,plugins:[react()],define:{'process.env.NODE_ENV':'"production"'},build:{outDir:temporary,emptyOutDir:true,lib:{entry:resolve('ecommerce/src/main.jsx'),name:'Aynetpremium',formats:['iife'],fileName:()=> 'toko.js'},cssCodeSplit:false,rollupOptions:{output:{inlineDynamicImports:true}},target:'es2020'}});
 const script=readFileSync(resolve(temporary,'toko.js'),'utf8').replace(/<\/script/gi,'<\\/script');
 const cssFile=readdirSync(temporary).find(n=>n.endsWith('.css'));
 const css=readFileSync(resolve(temporary,cssFile),'utf8');
 const seed=JSON.stringify(createSeed(true)).replaceAll('<','\\u003c');
 mkdirSync(output,{recursive:true});
 writeFileSync(resolve(output,'Aynetpremium.html'),`<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#314d3b"><title>Aynetpremium — Toko Online</title><style>${css}</style></head><body><div id="root"></div><noscript>Aktifkan JavaScript untuk membuka toko.</noscript><script>window.__SHOP_DEMO__=${seed};</script><script>${script}</script></body></html>`);
 writeFileSync(resolve(output,'BACA-DULU.txt'),`AYNETPREMIUM — VERSI PERANGKAT\n\n1. Ekstrak ZIP dan buka Aynetpremium.html menggunakan Chrome/Edge di komputer.\n2. Ini versi perangkat untuk mencoba toko dan panel pemilik, bukan website publik. Data hanya tersimpan di browser/perangkat ini. Pesanan tidak dikirim ke perangkat lain.\n3. Klik Kelola toko, masuk menggunakan kata sandi contoh: demo-toko.\n4. Pengaturan sudah berisi nama Aynetpremium dan nomor DANA 085156840563. Isi nama penerima DANA sesuai aplikasi, lalu unggah gambar QRIS resmi milik Anda. Semua dapat diubah.\n5. Tambah produk dengan nama, kategori, harga modal/jual, stok, gambar, dan tautan. Hapus data contoh setelah membuat cadangan bila perlu.\n6. Pelanggan membuat pesanan dan mengirim keterangan/bukti pembayaran. Konfirmasi lunas dari panel hanya setelah dana benar-benar masuk. Bukti bukan konfirmasi otomatis.\n7. Keuangan berisi penjualan lunas, pemasukan/pengeluaran manual, laba rugi, grafik, dan ekspor CSV. Biaya transaksi, ongkir, pajak, dan biaya lain dicatat manual.\n8. Data browser dapat hilang saat dibersihkan, mode privat ditutup, atau berganti profil. Cadangkan JSON melalui Pengaturan.\n\nUntuk menerima pesanan dari pelanggan lain, gunakan versi server dengan database bersama dan alamat HTTPS; lihat ecommerce/PANDUAN.md pada paket kode. Tidak ada API key Midtrans atau DANA pada file ini. Jangan unggah file demo ke hosting sebagai toko sungguhan: data tiap pengunjung akan terpisah.\n`);
 console.log(`Versi perangkat dibuat: ${output}/Aynetpremium.html`);
}finally{rmSync(temporary,{recursive:true,force:true});}
