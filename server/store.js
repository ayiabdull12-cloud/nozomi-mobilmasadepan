import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const clean = (value, limit = 200) => String(value ?? '').trim().slice(0, limit);
function integer(value, name, min = 0, max = 1e12) {
  const number = Number(value);
  if (value === '' || value === null || value === undefined || typeof value === 'boolean' || !Number.isSafeInteger(number) || number < min || number > max) throw new AppError(`${name} harus berupa bilangan bulat antara ${min} dan ${max}.`);
  return number;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new AppError('Tanggal tidak valid.');
  return value;
}

export function createStore(file, { demo = true } = {}) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, category TEXT NOT NULL, unit TEXT NOT NULL, cost INTEGER NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), min_stock INTEGER NOT NULL, emoji TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, date TEXT NOT NULL, created_at TEXT NOT NULL, customer TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, total INTEGER NOT NULL, cost INTEGER NOT NULL, provider_id TEXT UNIQUE, payment TEXT);
    CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY, sale_id TEXT REFERENCES sales(id), product_id TEXT REFERENCES products(id), name TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL, cost INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT NOT NULL, method TEXT NOT NULL, sale_id TEXT UNIQUE REFERENCES sales(id), source TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS stock_events (id TEXT PRIMARY KEY, product_id TEXT REFERENCES products(id), date TEXT NOT NULL, delta INTEGER NOT NULL, note TEXT NOT NULL);
  `);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const atomic = fn => { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  if (!one('SELECT id FROM settings WHERE id=1')) run('INSERT INTO settings VALUES(1,?)', JSON.stringify({ name: 'Warung Berkah', owner: 'Ibu Sari', address: 'Jl. Melati No. 12, Bandung', phone: '', tagline: 'Belanja dekat, hati hangat.', receipt: 'Terima kasih sudah berbelanja. Semoga harimu menyenangkan!', initialBalance: 0, demo }));
  const settings = () => JSON.parse(one('SELECT value FROM settings WHERE id=1').value);
  const product = id => { const p = one('SELECT * FROM products WHERE id=? AND archived=0', id); if (!p) throw new AppError('Barang tidak ditemukan.', 404); return p; };
  function saveProduct(input, id = randomUUID()) {
    const name = clean(input.name), sku = clean(input.sku, 40), category = clean(input.category, 50) || 'Lainnya', unit = clean(input.unit, 30) || 'pcs';
    if (!name || !sku) throw new AppError('Nama barang dan kode barang wajib diisi.');
    if (one('SELECT id FROM products WHERE sku=? AND id<>?', sku, id)) throw new AppError('Kode barang sudah dipakai. Gunakan kode lain.');
    const cost = integer(input.cost, 'Harga modal', 0, 1e9), price = integer(input.price, 'Harga jual', 0, 1e9), min = integer(input.min_stock, 'Batas stok', 0, 1e6);
    const existing = one('SELECT * FROM products WHERE id=?', id);
    const stock = existing ? existing.stock : integer(input.stock, 'Stok awal', 0, 1e6);
    run('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET name=excluded.name,sku=excluded.sku,category=excluded.category,unit=excluded.unit,cost=excluded.cost,price=excluded.price,min_stock=excluded.min_stock,emoji=excluded.emoji', id, name, sku, category, unit, cost, price, stock, min, clean(input.emoji, 8) || '📦');
    if (!existing) run('INSERT INTO stock_events VALUES(?,?,?,?,?)', randomUUID(), id, jakartaDate(), stock, 'Stok awal');
    return id;
  }
  function ledger(input, entryId) {
    if (!['income', 'expense'].includes(input.type)) throw new AppError('Jenis catatan tidak valid.');
    if (!['Tunai', 'QRIS', 'Transfer'].includes(input.method)) throw new AppError('Metode pembayaran tidak valid.');
    const category = clean(input.category, 50), note = clean(input.note, 300);
    const allowed = input.type === 'income' ? ['Pemasukan lain', 'Modal pemilik'] : ['Operasional', 'Sewa', 'Listrik & air', 'Gaji', 'Transportasi', 'Lainnya'];
    if (!allowed.includes(category) || !note) throw new AppError('Pilih kategori yang tersedia dan isi keterangan.');
    if (entryId && one('SELECT source FROM ledger WHERE id=?', entryId)?.source !== 'manual') throw new AppError('Hanya catatan manual yang dapat diubah.');
    const id = entryId || randomUUID();
    run('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET date=excluded.date,type=excluded.type,category=excluded.category,amount=excluded.amount,note=excluded.note,method=excluded.method', id, validDate(input.date), input.type, category, integer(input.amount, 'Nominal', 1), note, input.method, null, 'manual');
    return id;
  }
  function restock(id, input) {
    return atomic(() => {
      const p = product(id), mode = input.mode || 'purchase';
      if (!['purchase', 'adjust'].includes(mode)) throw new AppError('Jenis perubahan stok tidak valid.');
      const qty = integer(input.qty, 'Jumlah', mode === 'purchase' ? 1 : 0, 1e6);
      if (mode === 'purchase' && p.stock + qty > 1e6) throw new AppError('Jumlah stok melebihi batas 1.000.000 unit.');
      const delta = mode === 'purchase' ? qty : qty - p.stock;
      const note = clean(input.note, 300);
      if (!note) throw new AppError('Keterangan perubahan stok wajib diisi.');
      if (mode === 'adjust' && one("SELECT id FROM sales WHERE status='pending' AND id IN (SELECT sale_id FROM sale_items WHERE product_id=?)", id)) throw new AppError('Selesaikan atau batalkan QRIS tertunda untuk barang ini sebelum menyesuaikan stok.');
      run('UPDATE products SET stock=stock+? WHERE id=?', delta, id);
      run('INSERT INTO stock_events VALUES(?,?,?,?,?)', randomUUID(), id, jakartaDate(), delta, note);
      if (mode === 'purchase') {
        const amount = integer(input.amount, 'Total pembelian', 1);
        if (!['Tunai', 'Transfer', 'QRIS'].includes(input.method)) throw new AppError('Metode pembayaran tidak valid.');
        run('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?,?)', randomUUID(), jakartaDate(), 'expense', 'Pembelian stok', amount, `Restok ${p.name}: ${qty} ${p.unit}. ${note}`, input.method, null, 'stock');
        const average = Math.round((p.stock * p.cost + amount) / (p.stock + qty));
        if (average > 1e9) throw new AppError('Harga modal rata-rata melebihi batas nominal.');
        run('UPDATE products SET cost=? WHERE id=?', average, id);
      }
    });
  }
  function createSale(input, { pending = false, date = jakartaDate() } = {}) {
    return atomic(() => {
      if (!['Tunai', 'QRIS', 'Transfer'].includes(input.method)) throw new AppError('Metode pembayaran tidak valid.');
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 300) throw new AppError('Tambahkan barang ke keranjang terlebih dahulu.');
      if (input.method === 'QRIS' && !pending && input.received !== true) throw new AppError('Pastikan pembayaran QRIS sudah diterima sebelum mencatatnya.');
      const merged = new Map();
      for (const item of input.items) {
        if (!item || typeof item.id !== 'string') throw new AppError('Kode barang dalam keranjang tidak valid.');
        merged.set(item.id, (merged.get(item.id) || 0) + integer(item.qty, 'Jumlah barang', 1, 1e6));
      }
      const items = [...merged].map(([id, qty]) => {
        const p = product(id);
        if (qty > p.stock) throw new AppError(`Stok ${p.name} tidak cukup (tersisa ${p.stock}).`);
        return { ...p, qty };
      });
      const total = items.reduce((s, p) => s + p.price * p.qty, 0), cost = items.reduce((s, p) => s + p.cost * p.qty, 0);
      if (!Number.isSafeInteger(total) || !Number.isSafeInteger(cost) || total > 1e12 || cost > 1e12) throw new AppError('Nominal transaksi terlalu besar.');
      if (input.method === 'Tunai' && integer(input.paid, 'Uang diterima') < total) throw new AppError('Uang diterima kurang dari total belanja.');
      const id = randomUUID(), providerId = pending ? `WR-${id}` : null;
      run('INSERT INTO sales VALUES(?,?,?,?,?,?,?,?,?,?)', id, validDate(date), new Date().toISOString(), clean(input.customer, 100) || 'Pelanggan umum', input.method, pending ? 'pending' : 'paid', total, cost, providerId, null);
      for (const p of items) {
        run('INSERT INTO sale_items(sale_id,product_id,name,qty,price,cost) VALUES(?,?,?,?,?,?)', id, p.id, p.name, p.qty, p.price, p.cost);
        run('UPDATE products SET stock=stock-? WHERE id=?', p.qty, p.id);
        run('INSERT INTO stock_events VALUES(?,?,?,?,?)', randomUUID(), p.id, date, -p.qty, `${pending ? 'Reservasi QRIS' : 'Penjualan'} ${id.slice(0, 8)}`);
      }
      if (!pending) postSale(id);
      return getSale(id);
    });
  }
  function getSale(id) { const sale = one('SELECT * FROM sales WHERE id=?', id); if (!sale) throw new AppError('Transaksi tidak ditemukan.', 404); return { ...sale, items: all('SELECT * FROM sale_items WHERE sale_id=?', id), payment: sale.payment ? JSON.parse(sale.payment) : null }; }
  function postSale(id) {
    const s = one('SELECT * FROM sales WHERE id=?', id);
    run('INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?,?,?,?,?)', randomUUID(), s.date, 'income', 'Penjualan', s.total, `Penjualan · ${s.customer}`, s.method, id, 'sale');
  }
  function settle(providerId, status) {
    return atomic(() => {
      const s = one('SELECT * FROM sales WHERE provider_id=?', providerId);
      if (!s) throw new AppError('Pesanan QRIS tidak ditemukan.', 404);
      if (s.status !== 'pending') return getSale(s.id);
      if (status === 'paid') { run("UPDATE sales SET status='paid',date=? WHERE id=?", jakartaDate(), s.id); postSale(s.id); }
      else if (status === 'cancelled') {
        run("UPDATE sales SET status='cancelled' WHERE id=?", s.id);
        for (const item of all('SELECT * FROM sale_items WHERE sale_id=?', s.id)) {
          run('UPDATE products SET stock=stock+? WHERE id=?', item.qty, item.product_id);
          run('INSERT INTO stock_events VALUES(?,?,?,?,?)', randomUUID(), item.product_id, jakartaDate(), item.qty, 'Reservasi QRIS dibatalkan');
        }
      }
      return getSale(s.id);
    });
  }
  function snapshot() {
    return { settings: settings(), products: all('SELECT * FROM products WHERE archived=0 ORDER BY name'), sales: all('SELECT * FROM sales ORDER BY created_at DESC').map(s => getSale(s.id)), ledger: all('SELECT * FROM ledger ORDER BY date DESC,rowid DESC'), stockEvents: all('SELECT e.*,p.name FROM stock_events e JOIN products p ON p.id=e.product_id ORDER BY e.rowid DESC LIMIT 500') };
  }
  function saveSettings(input) {
    const current = settings();
    if (!clean(input.name)) throw new AppError('Nama warung wajib diisi.');
    const next = { ...current, name: clean(input.name, 80), owner: clean(input.owner, 80), address: clean(input.address, 300), phone: clean(input.phone, 30), tagline: clean(input.tagline, 150), receipt: clean(input.receipt, 300), initialBalance: integer(input.initialBalance, 'Saldo awal') };
    run('UPDATE settings SET value=? WHERE id=1', JSON.stringify(next));
  }
  function archiveProduct(id) {
    const p = product(id);
    if (p.stock > 0) throw new AppError('Stok harus nol sebelum barang diarsipkan.');
    if (one("SELECT id FROM sales WHERE status='pending' AND id IN (SELECT sale_id FROM sale_items WHERE product_id=?)", id)) throw new AppError('Barang masih ada pada pembayaran tertunda.');
    run('UPDATE products SET archived=1 WHERE id=?', id);
  }
  function deleteLedger(id) {
    const entry = one('SELECT * FROM ledger WHERE id=?', id);
    if (!entry || entry.source !== 'manual') throw new AppError('Hanya catatan manual yang dapat dihapus.');
    run('DELETE FROM ledger WHERE id=?', id);
  }
  if (demo && settings().demo && !one('SELECT id FROM products LIMIT 1') && !one('SELECT id FROM sales LIMIT 1')) {
    atomic(() => {
      const seeds = [
        ['Beras Pandan Wangi', 'BR001', 'Sembako', 'kg', 12500, 15000, 64, 10, '🌾'],
        ['Minyak Goreng Bimoli', 'MY001', 'Sembako', 'botol', 15500, 19000, 40, 8, '🧴'],
        ['Indomie Goreng', 'MI001', 'Makanan', 'pcs', 2600, 3500, 120, 15, '🍜'],
        ['Telur Ayam', 'TL001', 'Sembako', 'kg', 24000, 29000, 30, 5, '🥚'],
        ['Gula Pasir Gulaku', 'GL001', 'Sembako', 'pcs', 15000, 18000, 46, 8, '🍚'],
        ['Aqua 600 ml', 'AQ001', 'Minuman', 'botol', 2300, 4000, 80, 12, '💧'],
        ['Kopi Kapal Api', 'KP001', 'Minuman', 'sachet', 1200, 2000, 60, 10, '☕'],
        ['Teh Pucuk Harum', 'TH001', 'Minuman', 'botol', 2700, 4000, 45, 8, '🍵'],
        ['Sabun Lifebuoy', 'SB001', 'Kebutuhan rumah', 'pcs', 3500, 5000, 17, 8, '🧼'],
        ['Biskuit Roma Kelapa', 'BS001', 'Makanan', 'pcs', 7500, 10000, 34, 8, '🍪'],
        ['Susu UHT Ultra', 'SU001', 'Minuman', 'kotak', 4500, 6000, 29, 6, '🥛'],
        ['Tepung Terigu', 'TP001', 'Sembako', 'kg', 10000, 13000, 18, 5, '🌿']
      ];
      seeds.forEach(([name, sku, category, unit, cost, price, stock, min_stock, emoji], i) => saveProduct({ name, sku, category, unit, cost, price, stock, min_stock, emoji }, `demo-${i}`));
    });
    for (let d = 13; d >= 0; d--) {
      const date = jakartaDate(new Date(Date.now() - d * 86400000));
      for (let n = 0; n < 3; n++) createSale({ customer: ['Bu Rina', 'Pak Agus', 'Pelanggan umum'][n], method: ['Tunai', 'QRIS', 'Transfer'][(d + n) % 3], paid: 1000000, received: true, items: [{ id: `demo-${(d + n) % 8}`, qty: (d % 3) + 1 }, { id: `demo-${8 + n}`, qty: 1 }] }, { date });
      if (d % 3 === 0) ledger({ date, type: 'expense', category: 'Operasional', amount: 7500 + d * 500, note: 'Keperluan operasional warung', method: 'Tunai' });
    }
  }
  function clearDemo() {
    if (!settings().demo) throw new AppError('Data contoh sudah dihapus.');
    atomic(() => { db.exec('DELETE FROM stock_events; DELETE FROM ledger; DELETE FROM sale_items; DELETE FROM sales; DELETE FROM products;'); run('UPDATE settings SET value=? WHERE id=1', JSON.stringify({ ...settings(), demo: false, initialBalance: 0 })); });
  }
  return { db, snapshot, saveProduct: (input, id) => atomic(() => { if (id) product(id); return saveProduct(input, id); }), saveSettings, restock, createSale, getSale, settle, ledger, archiveProduct, deleteLedger, clearDemo, setPayment: (id, payment) => run('UPDATE sales SET payment=? WHERE id=?', JSON.stringify(payment), id), close: () => db.close() };
}
