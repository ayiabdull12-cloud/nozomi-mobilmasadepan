import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createStore } from '../server/store.js';

const output = resolve(process.env.PORTABLE_OUTPUT_DIR || '/workspace/warung-delivery');
const temporary = mkdtempSync(resolve(tmpdir(), 'warung-portable-build-'));
const store = createStore(':memory:');
try {
  const seed = store.snapshot();
  seed.sales.reverse(); seed.stockEvents.reverse();
  // A single script and inlined fonts allow file:// and completely offline use.
  await build({ configFile: false, plugins: [react()], define: { 'process.env.NODE_ENV': '"production"' }, build: { outDir: temporary, emptyOutDir: true, lib: { entry: resolve('src/main.jsx'), name: 'WarungRaya', formats: ['iife'], fileName: () => 'warung.js' }, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } }, target: 'es2020' } });
  const script = readFileSync(resolve(temporary, 'warung.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const style = readFileSync(resolve(temporary, 'warung-raya.css'), 'utf8');
  const data = JSON.stringify(seed).replaceAll('<', '\\u003c');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'WarungRaya.html'), `<!DOCTYPE html>\n<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#276447"><title>WarungRaya — Pencatatan Warung</title><style>${style}</style></head><body><div id="root"></div><noscript>Aktifkan JavaScript untuk memakai WarungRaya.</noscript><script>window.__WARUNG_PORTABLE__=${data};</script><script>${script}</script></body></html>`);
  writeFileSync(resolve(output, 'BACA-DULU.txt'), `WARUNGRAYA — VERSI PERANGKAT\n\n1. Unduh WarungRaya.html ke komputer dan buka dengan Chrome, Edge, atau Firefox.\n2. Aplikasi dapat digunakan tanpa server dan tanpa internet setelah berkas diunduh.\n3. Buka Pengaturan, ubah identitas warung, lalu hapus data contoh ketika siap memakai data sendiri.\n4. Tambahkan barang, gunakan kasir, catat keuangan, dan lihat laporan. QRIS manual dicatat setelah pembayaran benar-benar diterima.\n5. Unduh cadangan JSON dari Pengaturan secara berkala. Gunakan Pulihkan cadangan JSON untuk pindah perangkat.\n\nData disimpan di browser perangkat ini, bukan akun online. Menghapus data browser, memakai mode privat, mengganti browser/profil, atau memindahkan berkas dapat menyebabkan data tidak tersedia. Gunakan browser biasa dan buat cadangan. Di HP, membuka HTML lokal bergantung pada kemampuan browser/manajer berkas; bila tidak bisa dijalankan, gunakan versi server atau komputer.\n\nVersi ini tidak memerlukan kunci Midtrans dan tidak menyediakan QRIS otomatis. Versi server di repositori sudah menyiapkan integrasi Midtrans, yang memerlukan konfigurasi aman dan alamat HTTPS. Jangan memasukkan Server Key ke berkas HTML.\n\nIni adalah aplikasi mandiri siap dijalankan dari berkas, bukan deployment website publik.\n`);
  console.log(`Aplikasi siap: ${resolve(output, 'WarungRaya.html')}`);
} finally { store.close(); rmSync(temporary, { recursive: true, force: true }); }
