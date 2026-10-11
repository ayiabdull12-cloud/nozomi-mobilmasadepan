import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, jakartaDate } from '../server/store.js';
import { summarize } from '../src/model.js';
const item = { name: 'Kopi', sku: 'KP01', category: 'Minuman', unit: 'pcs', cost: 3000, price: 5000, stock: 10, min_stock: 3, emoji: '☕' };
function setup(t) { const store = createStore(':memory:', { demo: false }); t.after(() => store.close()); const id = store.saveProduct(item); return { store, id }; }
test('Penjualan mengurangi stok, mencatat kas, dan memakai snapshot modal', t => {
  const { store, id } = setup(t);
  const sale = store.createSale({ method: 'Tunai', paid: 20000, items: [{ id, qty: 2 }] });
  assert.equal(sale.total, 10000); assert.equal(sale.cost, 6000);
  assert.equal(store.snapshot().products[0].stock, 8); assert.equal(store.snapshot().ledger[0].amount, 10000);
  store.saveProduct({ ...item, cost: 4000 }, id);
  assert.equal(store.getSale(sale.id).cost, 6000);
});
test('Penjualan berlebih dan uang kurang tidak mengubah database', t => {
  const { store, id } = setup(t), before = store.snapshot();
  assert.throws(() => store.createSale({ method: 'Tunai', paid: 100000, items: [{ id, qty: 11 }] }), /tidak cukup/);
  assert.throws(() => store.createSale({ method: 'Tunai', paid: 1, items: [{ id, qty: 2 }] }), /kurang/);
  assert.deepEqual(store.snapshot(), before);
});
test('Barang duplikat dalam keranjang dijumlahkan sebelum validasi stok', t => {
  const { store, id } = setup(t);
  assert.throws(() => store.createSale({ method: 'Transfer', items: [{ id, qty: 6 }, { id, qty: 6 }] }), /tidak cukup/);
  assert.equal(store.snapshot().products[0].stock, 10);
});
test('QRIS manual mensyaratkan konfirmasi pembayaran diterima', t => {
  const { store, id } = setup(t);
  assert.throws(() => store.createSale({ method: 'QRIS', items: [{ id, qty: 1 }] }), /diterima/);
  store.createSale({ method: 'QRIS', received: true, items: [{ id, qty: 1 }] });
  assert.equal(store.snapshot().ledger.length, 1);
});
test('QRIS pending reservasi stok, belum menambah kas, settlement idempoten', t => {
  const { store, id } = setup(t);
  const sale = store.createSale({ method: 'QRIS', items: [{ id, qty: 2 }] }, { pending: true });
  assert.equal(sale.status, 'pending'); assert.equal(store.snapshot().ledger.length, 0); assert.equal(store.snapshot().products[0].stock, 8);
  store.settle(sale.provider_id, 'paid'); store.settle(sale.provider_id, 'paid');
  assert.equal(store.snapshot().ledger.length, 1); assert.equal(store.snapshot().ledger[0].amount, 10000);
  assert.equal(store.snapshot().products[0].stock, 8);
});
test('Pembatalan QRIS mengembalikan stok sekali dan tidak menambah kas', t => {
  const { store, id } = setup(t);
  const sale = store.createSale({ method: 'QRIS', items: [{ id, qty: 2 }] }, { pending: true });
  assert.throws(() => store.restock(id, { mode: 'adjust', qty: 3, note: 'Hitung' }), /tertunda/);
  store.settle(sale.provider_id, 'cancelled'); store.settle(sale.provider_id, 'cancelled');
  assert.equal(store.snapshot().products[0].stock, 10); assert.equal(store.snapshot().ledger.length, 0);
});
test('Restok memperbarui modal rata-rata dan dicatat sebagai pembelian stok', t => {
  const { store, id } = setup(t);
  store.restock(id, { mode: 'purchase', qty: 10, amount: 50000, method: 'Tunai', note: 'Distributor' });
  const data = store.snapshot(); assert.equal(data.products[0].stock, 20); assert.equal(data.products[0].cost, 4000);
  assert.equal(data.ledger[0].category, 'Pembelian stok');
  const before = store.snapshot();
  assert.throws(() => store.restock(id, { mode: 'purchase', qty: 3, amount: -1, method: 'Tunai', note: 'Salah' }));
  assert.deepEqual(store.snapshot(), before);
});
test('Laba berbeda dari kas: modal dan pembelian stok dikecualikan dari laba', t => {
  const { store, id } = setup(t), date = jakartaDate();
  store.createSale({ method: 'Tunai', paid: 10000, items: [{ id, qty: 2 }] });
  store.ledger({ date, type: 'income', category: 'Modal pemilik', amount: 100000, note: 'Modal', method: 'Tunai' });
  store.ledger({ date, type: 'expense', category: 'Operasional', amount: 1000, note: 'Plastik', method: 'Tunai' });
  store.restock(id, { qty: 2, amount: 6000, method: 'Tunai', note: 'Restok' });
  const report = summarize(store.snapshot(), { from: date, to: date });
  assert.equal(report.profit, 3000); assert.equal(report.balance, 103000); assert.equal(report.cost, 6000);
});
test('Validasi kode unik, tanggal, jumlah, dan perlindungan catatan otomatis', t => {
  const { store, id } = setup(t);
  assert.throws(() => store.saveProduct(item), /sudah dipakai/);
  assert.throws(() => store.ledger({ type: 'expense', date: '2026-02-30', category: 'Operasional', amount: 1, note: 'Biaya', method: 'Tunai' }), /Tanggal/);
  assert.throws(() => store.createSale({ method: 'Transfer', items: [{ id, qty: 0.5 }] }), /bilangan bulat/);
  store.createSale({ method: 'Transfer', items: [{ id, qty: 1 }] });
  assert.throws(() => store.deleteLedger(store.snapshot().ledger[0].id), /manual/);
});
test('Database dan pengaturan tetap ada setelah dimulai ulang', () => {
  const dir = mkdtempSync(join(tmpdir(), 'warung-test-'));
  try {
    const path = join(dir, 'test.sqlite'); let store = createStore(path, { demo: false });
    store.saveProduct(item); store.saveSettings({ ...store.snapshot().settings, name: 'Warung Makmur', initialBalance: 120000 }); store.close();
    store = createStore(path, { demo: false }); assert.equal(store.snapshot().products.length, 1); assert.equal(store.snapshot().settings.name, 'Warung Makmur'); assert.equal(store.snapshot().settings.initialBalance, 120000); store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('Data contoh tidak muncul kembali sesudah dihapus dan server dimulai ulang', () => {
  const dir = mkdtempSync(join(tmpdir(), 'warung-demo-test-'));
  try {
    const path = join(dir, 'test.sqlite'); let store = createStore(path);
    assert.ok(store.snapshot().sales.length > 0); store.clearDemo(); store.close();
    store = createStore(path); assert.equal(store.snapshot().settings.demo, false); assert.equal(store.snapshot().products.length, 0); assert.equal(store.snapshot().sales.length, 0); store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('Catatan manual bisa diedit tanpa menggandakan entri', t => {
  const { store } = setup(t), date = jakartaDate();
  const id = store.ledger({ date, type: 'expense', category: 'Operasional', amount: 1000, note: 'Biaya', method: 'Tunai' });
  store.ledger({ date, type: 'expense', category: 'Operasional', amount: 2000, note: 'Biaya koreksi', method: 'Tunai' }, id);
  assert.equal(store.snapshot().ledger.length, 1); assert.equal(store.snapshot().ledger[0].amount, 2000);
});
