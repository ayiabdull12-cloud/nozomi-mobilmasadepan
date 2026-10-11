import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Cloud Chromium forbids file:// navigation. Serve the exact standalone bytes
// through a test fixture, without API requests or external assets.
const file = 'http://127.0.0.1:3002/portable.html';
test.beforeEach(async ({ context }) => {
  const content = await readFile(resolve('/workspace/warung-delivery/WarungRaya.html'), 'utf8');
  await context.route(file, route => route.fulfill({ contentType: 'text/html', body: content }));
});
const stateOf = page => page.evaluate(() => fetch('/api/state').then(r => r.json()));
const api = (page, path, body, verb = 'POST') => page.evaluate(async ({ path, body, verb }) => {
  const r = await fetch(path, { method: verb, body: JSON.stringify(body) }); return { status: r.status, result: await r.json() };
}, { path, body, verb });

test('HTML mandiri: barang, kasir, laba, penyimpanan ulang, cadangan dan pemulihan', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(file); await expect(page.getByRole('heading', { name: /Usaha tertata/ })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus data contoh', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ketik HAPUS DATA CONTOH').fill('HAPUS DATA CONTOH');
  await dialog.getByRole('button', { name: 'Hapus & mulai pencatatan sendiri' }).click(); await expect(dialog).not.toBeVisible();
  await page.getByLabel('Nama warung', { exact: true }).fill('Warung Portabel');
  await page.getByRole('button', { name: 'Simpan pengaturan' }).click(); await expect(page.getByRole('status')).toContainText('Pengaturan warung disimpan');
  await page.getByRole('navigation').getByRole('button', { name: 'Barang & stok' }).click();
  await page.getByRole('button', { name: 'Tambah barang', exact: true }).first().click();
  await dialog.getByLabel('Nama barang').fill('Kopi Portabel'); await dialog.getByLabel('Kode barang').fill('KP-PORT');
  await dialog.getByLabel('Harga modal').fill('3000'); await dialog.getByLabel('Harga jual').fill('5000'); await dialog.getByLabel('Stok awal').fill('10');
  await dialog.getByRole('button', { name: 'Simpan barang' }).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Kasir & penjualan' }).click();
  await page.getByRole('button', { name: /Kopi Portabel/ }).first().click();
  await page.getByRole('button', { name: 'Tambah Kopi Portabel' }).click();
  await page.getByRole('button', { name: 'Lanjut pembayaran' }).click();
  await dialog.getByRole('button', { name: 'Uang pas' }).click(); await dialog.getByRole('button', { name: 'Selesaikan & catat penjualan' }).click();
  await expect(dialog.getByText('Lunas', { exact: true })).toBeVisible(); await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Keuangan', exact: true }).click();
  await page.getByRole('button', { name: 'Catat keuangan' }).click();
  await dialog.getByLabel('Nominal').fill('1000'); await dialog.getByLabel('Keterangan').fill('Plastik belanja');
  await dialog.getByRole('button', { name: 'Simpan catatan' }).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Laporan', exact: true }).click();
  await expect(page.locator('.net-profit')).toContainText('Rp 3.000');
  await page.reload();
  let state = await stateOf(page); expect(state.settings.name).toBe('Warung Portabel'); expect(state.products[0].stock).toBe(8); expect(state.sales).toHaveLength(1); expect(state.settings.demo).toBe(false);
  await page.getByRole('navigation').getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh cadangan JSON' }).click();
  const downloaded = await downloadPromise; const buffer = await readFile(await downloaded.path()); const backup = JSON.parse(buffer.toString());
  expect(backup.settings.name).toBe('Warung Portabel'); expect(backup.products[0].stock).toBe(8);
  const expense = state.ledger.find(e => e.source === 'manual');
  expect((await api(page, `/api/ledger/${expense.id}`, { ...expense, amount: 2000 }, 'PUT')).status).toBe(200);
  await page.getByLabel('Pilih cadangan JSON').setInputFiles({ name: 'cadangan.json', mimeType: 'application/json', buffer });
  await dialog.getByLabel('Ketik PULIHKAN CADANGAN').fill('PULIHKAN CADANGAN'); await dialog.getByRole('button', { name: 'Pulihkan data' }).click(); await expect(dialog).not.toBeVisible();
  state = await stateOf(page); expect(state.ledger.find(e => e.source === 'manual').amount).toBe(1000); expect(state.products[0].stock).toBe(8);
  const before = structuredClone(state); const badBackup = { ...backup, products: [{ ...backup.products[0], stock: -9 }] };
  expect((await api(page, '/api/restore', { backup: badBackup, confirmation: 'PULIHKAN CADANGAN' })).status).toBe(400);
  expect(await stateOf(page)).toEqual(before); expect(errors).toEqual([]);
});

test('HTML mandiri bekerja offline dan tampil rapi di ponsel', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await context.setOffline(true);
  const network = []; page.on('request', req => { if (/^https?:/.test(req.url()) && req.url() !== file) network.push(req.url()); });
  await page.goto(file); await expect(page.getByRole('heading', { name: /Usaha tertata/ })).toBeVisible();
  await expect(page.getByText(/Versi perangkat ·/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Buka menu' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Barang & stok' }).click();
  await page.getByRole('button', { name: 'Tambah barang', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); expect(network).toEqual([]);
});

test('Dua tab berbagi stok dan tidak dapat menjual barang yang sama berlebihan', async ({ page, context }) => {
  await page.goto(file); await page.getByRole('heading', { name: /Usaha tertata/ }).waitFor();
  await api(page, '/api/products', { name: 'Barang bersama', sku: 'SHARED-01', category: 'Makanan', unit: 'pcs', cost: 1000, price: 2000, stock: 4, min_stock: 1 });
  const state = await stateOf(page), product = state.products.find(p => p.sku === 'SHARED-01');
  const second = await context.newPage(); await second.goto(file); await second.getByRole('heading', { name: /Usaha tertata/ }).waitFor();
  const input = { method: 'Transfer', items: [{ id: product.id, qty: 3 }] };
  const results = await Promise.all([api(page, '/api/sales', input), api(second, '/api/sales', input)]);
  expect(results.map(r => r.status).sort()).toEqual([200, 400]);
  const after = await stateOf(page); expect(after.products.find(p => p.id === product.id).stock).toBe(1); expect(after.sales.length).toBe(state.sales.length + 1);
  const qris = await api(page, '/api/sales', { method: 'QRIS', items: [{ id: product.id, qty: 1 }], received: false }); expect(qris.status).toBe(400);
});
