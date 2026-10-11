import { today } from './model';
const STORAGE_KEY = 'warungraya-portable-v1';
const id = () => crypto.randomUUID();
const text = (v, limit = 200) => String(v ?? '').trim().slice(0, limit);
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
function integer(value, label, minimum = 0, maximum = 1e12) {
  const n = Number(value);
  requireValue(value !== '' && value !== null && value !== undefined && typeof value !== 'boolean' && Number.isSafeInteger(n) && n >= minimum && n <= maximum, `${label} harus berupa bilangan bulat antara ${minimum} dan ${maximum}.`);
  return n;
}
function date(value) {
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Tanggal tidak valid.');
  return value;
}
const method = value => { requireValue(['Tunai', 'QRIS', 'Transfer'].includes(value), 'Metode pembayaran tidak valid.'); return value; };
function productFields(input) {
  const name = text(input.name), sku = text(input.sku, 40);
  requireValue(name && sku, 'Nama barang dan kode barang wajib diisi.');
  return { name, sku, category: text(input.category, 50) || 'Lainnya', unit: text(input.unit, 30) || 'pcs', cost: integer(input.cost, 'Harga modal', 0, 1e9), price: integer(input.price, 'Harga jual', 0, 1e9), min_stock: integer(input.min_stock, 'Batas stok', 0, 1e6), emoji: text(input.emoji, 8) || '📦' };
}
function settingsFields(input) {
  requireValue(text(input.name), 'Nama warung wajib diisi.');
  return { name: text(input.name, 80), owner: text(input.owner, 80), address: text(input.address, 300), phone: text(input.phone, 30), tagline: text(input.tagline, 150), receipt: text(input.receipt, 300), initialBalance: integer(input.initialBalance, 'Saldo awal'), demo: input.demo === true };
}
function ledgerFields(input) {
  requireValue(['income', 'expense'].includes(input.type), 'Jenis catatan tidak valid.');
  const category = text(input.category, 50), note = text(input.note, 300);
  const allowed = input.type === 'income' ? ['Pemasukan lain', 'Modal pemilik'] : ['Operasional', 'Sewa', 'Listrik & air', 'Gaji', 'Transportasi', 'Lainnya'];
  requireValue(allowed.includes(category) && note, 'Pilih kategori yang tersedia dan isi keterangan.');
  return { date: date(input.date), type: input.type, category, amount: integer(input.amount, 'Nominal', 1), note, method: method(input.method) };
}
function validateBackup(raw) {
  requireValue(raw && raw.version === 1, 'Format cadangan tidak didukung. Gunakan cadangan JSON WarungRaya.');
  for (const key of ['products', 'sales', 'ledger', 'stockEvents']) requireValue(Array.isArray(raw[key]) && raw[key].length <= 50000, `Cadangan ${key} tidak valid atau terlalu besar.`);
  requireValue(raw.archivedProducts === undefined || Array.isArray(raw.archivedProducts), 'Data barang arsip tidak valid.');
  const products = [...raw.products, ...(raw.archivedProducts || [])].map(p => ({ ...productFields(p), id: text(p.id, 100), stock: integer(p.stock, 'Stok', 0, 1e6), archived: p.archived === 1 ? 1 : 0 }));
  requireValue(products.every(p => p.id) && new Set(products.map(p => p.id)).size === products.length && new Set(products.map(p => p.sku)).size === products.length, 'Kode/ID barang dalam cadangan tidak unik.');
  const productIds = new Set(products.map(p => p.id));
  const sales = raw.sales.map(s => {
    requireValue(['paid', 'cancelled'].includes(s.status), 'Cadangan dengan QRIS tertunda harus dipulihkan di versi server.');
    requireValue(Array.isArray(s.items) && s.items.length > 0 && s.items.length <= 300, 'Rincian penjualan tidak valid.');
    const items = s.items.map(i => {
      requireValue(productIds.has(i.product_id), 'Barang pada penjualan tidak ditemukan dalam cadangan.');
      return { id: text(i.id, 100), product_id: i.product_id, name: text(i.name), qty: integer(i.qty, 'Jumlah', 1, 1e6), price: integer(i.price, 'Harga jual', 0, 1e9), cost: integer(i.cost, 'Harga modal', 0, 1e9) };
    });
    const total = integer(s.total, 'Total'), cost = integer(s.cost, 'HPP');
    requireValue(total === items.reduce((n, i) => n + i.qty * i.price, 0) && cost === items.reduce((n, i) => n + i.qty * i.cost, 0), 'Jumlah penjualan pada cadangan tidak sesuai rinciannya.');
    requireValue(Number.isFinite(Date.parse(s.created_at)), 'Waktu transaksi tidak valid.');
    return { id: text(s.id, 100), date: date(s.date), created_at: s.created_at, customer: text(s.customer, 100) || 'Pelanggan umum', method: method(s.method), status: s.status, total, cost, provider_id: null, payment: null, items };
  });
  requireValue(sales.every(s => s.id) && new Set(sales.map(s => s.id)).size === sales.length, 'ID penjualan tidak valid.');
  const ledger = raw.ledger.map(e => {
    requireValue(['sale', 'stock', 'manual'].includes(e.source), 'Sumber catatan keuangan tidak valid.');
    if (e.source === 'manual') return { id: text(e.id, 100), ...ledgerFields(e), sale_id: null, source: 'manual' };
    requireValue(['income', 'expense'].includes(e.type), 'Jenis arus kas tidak valid.');
    requireValue(e.source === 'sale' ? e.type === 'income' && e.category === 'Penjualan' : e.type === 'expense' && e.category === 'Pembelian stok', 'Kategori catatan otomatis tidak valid.');
    return { id: text(e.id, 100), date: date(e.date), type: e.type, category: text(e.category, 50), amount: integer(e.amount, 'Nominal'), note: text(e.note, 300), method: method(e.method), sale_id: e.source === 'sale' ? text(e.sale_id, 100) : null, source: e.source };
  });
  requireValue(ledger.every(e => e.id) && new Set(ledger.map(e => e.id)).size === ledger.length, 'ID catatan keuangan tidak valid.');
  for (const s of sales) {
    const entries = ledger.filter(e => e.sale_id === s.id);
    requireValue(s.status === 'paid' ? entries.length === 1 && entries[0].amount === s.total && entries[0].type === 'income' && entries[0].category === 'Penjualan' : entries.length === 0, 'Catatan keuangan dan penjualan pada cadangan tidak cocok.');
  }
  requireValue(ledger.every(e => !e.sale_id || sales.some(s => s.id === e.sale_id)), 'Catatan keuangan memiliki penjualan yang tidak ditemukan.');
  const stockEvents = raw.stockEvents.map(e => {
    requireValue(productIds.has(e.product_id) && Number.isSafeInteger(e.delta) && Math.abs(e.delta) <= 1e6, 'Riwayat stok tidak valid.');
    return { id: text(e.id, 100), product_id: e.product_id, date: date(e.date), delta: e.delta, note: text(e.note, 300), name: text(e.name) };
  });
  sales.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { settings: settingsFields(raw.settings), products, sales, ledger, stockEvents };
}
export function installPortable(seed) {
  const originalFetch = window.fetch.bind(window);
  const database = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Penyimpanan perangkat tidak tersedia. Gunakan Chrome/Edge biasa.'));
    const request = indexedDB.open(STORAGE_KEY, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Penyimpanan perangkat tidak dapat dibuka. Periksa izin penyimpanan browser.'));
    request.onblocked = () => reject(new Error('Tutup tab WarungRaya lain, lalu coba buka kembali.'));
  });
  // Each read/write transaction reads the latest committed state. IndexedDB
  // serializes these across tabs and persists all related updates atomically.
  const qris = { configured: false, production: false, provider: 'Midtrans' };
  function snapshot(state) {
    return { ...state, storage: 'browser', qris, products: state.products.filter(p => !p.archived).sort((a, b) => a.name.localeCompare(b.name)), archivedProducts: state.products.filter(p => p.archived), sales: [...state.sales].reverse(), ledger: [...state.ledger].sort((a, b) => b.date.localeCompare(a.date)), stockEvents: [...state.stockEvents].reverse() };
  }
  function handle(path, verb, body, state) {
    if (verb === 'GET' && path === '/api/state') return snapshot(state);
    if (verb === 'GET' && path === '/api/health') return { ok: true, database: 'browser', qris: 'manual' };
    const product = key => { const p = state.products.find(p => p.id === key && !p.archived); requireValue(p, 'Barang tidak ditemukan.'); return p; };
    function stockEvent(p, delta, note) { state.stockEvents.push({ id: id(), product_id: p.id, date: today(), delta, note, name: p.name }); }
    const parts = path.split('/').filter(Boolean);
    let result = { ok: true };
    if (parts[1] === 'products' && (verb === 'POST' && parts.length === 2 || verb === 'PUT' && parts.length === 3)) {
      const fields = productFields(body), existing = verb === 'PUT' ? product(parts[2]) : null;
      requireValue(!state.products.some(p => p.sku === fields.sku && p.id !== existing?.id), 'Kode barang sudah dipakai. Gunakan kode lain.');
      if (existing) Object.assign(existing, fields);
      else { const p = { ...fields, id: id(), stock: integer(body.stock, 'Stok awal', 0, 1e6), archived: 0 }; state.products.push(p); stockEvent(p, p.stock, 'Stok awal'); }
    } else if (verb === 'DELETE' && parts[1] === 'products' && parts.length === 3) {
      const p = product(parts[2]); requireValue(p.stock === 0, 'Stok harus nol sebelum barang diarsipkan.'); p.archived = 1;
    } else if (verb === 'POST' && parts[1] === 'products' && parts[3] === 'stock') {
      const p = product(parts[2]), mode = body.mode || 'purchase'; requireValue(['purchase', 'adjust'].includes(mode), 'Jenis perubahan stok tidak valid.');
      const qty = integer(body.qty, 'Jumlah', mode === 'purchase' ? 1 : 0, 1e6), note = text(body.note, 300); requireValue(note, 'Keterangan perubahan stok wajib diisi.');
      const next = mode === 'purchase' ? p.stock + qty : qty; requireValue(next <= 1e6, 'Jumlah stok terlalu besar.');
      if (mode === 'purchase') {
        const amount = integer(body.amount, 'Total pembelian', 1), average = Math.round((p.stock * p.cost + amount) / next); requireValue(average <= 1e9, 'Harga modal rata-rata terlalu besar.');
        state.ledger.unshift({ id: id(), date: today(), type: 'expense', category: 'Pembelian stok', amount, note: `Restok ${p.name}: ${qty} ${p.unit}. ${note}`, method: method(body.method), sale_id: null, source: 'stock' }); p.cost = average;
      }
      stockEvent(p, next - p.stock, note); p.stock = next;
    } else if (parts[1] === 'ledger' && (verb === 'POST' && parts.length === 2 || verb === 'PUT' && parts.length === 3)) {
      const fields = ledgerFields(body);
      if (verb === 'PUT') { const entry = state.ledger.find(e => e.id === parts[2]); requireValue(entry?.source === 'manual', 'Hanya catatan manual yang dapat diubah.'); Object.assign(entry, fields); }
      else state.ledger.unshift({ id: id(), ...fields, source: 'manual', sale_id: null });
    } else if (verb === 'DELETE' && parts[1] === 'ledger' && parts.length === 3) {
      requireValue(state.ledger.find(e => e.id === parts[2])?.source === 'manual', 'Hanya catatan manual yang dapat dihapus.'); state.ledger = state.ledger.filter(e => e.id !== parts[2]);
    } else if (verb === 'PUT' && path === '/api/settings') {
      state.settings = { ...settingsFields(body), demo: state.settings.demo };
    } else if (verb === 'POST' && path === '/api/clear-demo') {
      requireValue(state.settings.demo && body.confirmation === 'HAPUS DATA CONTOH', 'Konfirmasi penghapusan data contoh diperlukan.'); state.settings = { ...state.settings, demo: false, initialBalance: 0 }; for (const key of ['products', 'sales', 'ledger', 'stockEvents']) state[key] = [];
    } else if (verb === 'POST' && path === '/api/restore') {
      requireValue(body.confirmation === 'PULIHKAN CADANGAN', 'Konfirmasi pemulihan diperlukan.'); Object.assign(state, validateBackup(body.backup));
    } else if (verb === 'POST' && path === '/api/sales') {
      const paymentMethod = method(body.method); requireValue(!body.automatic, 'QRIS otomatis tersedia pada versi server. Di versi perangkat gunakan QRIS manual.');
      requireValue(Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 300, 'Tambahkan barang ke keranjang terlebih dahulu.');
      if (paymentMethod === 'QRIS') requireValue(body.received === true, 'Pastikan pembayaran QRIS sudah diterima sebelum mencatatnya.');
      const merged = new Map(); for (const i of body.items) merged.set(i.id, (merged.get(i.id) || 0) + integer(i.qty, 'Jumlah barang', 1, 1e6));
      const items = [...merged].map(([key, qty]) => { const p = product(key); requireValue(qty <= p.stock, `Stok ${p.name} tidak cukup (tersisa ${p.stock}).`); return { id: id(), product_id: p.id, name: p.name, qty, price: p.price, cost: p.cost }; });
      const total = integer(items.reduce((n, i) => n + i.qty * i.price, 0), 'Total'), cost = integer(items.reduce((n, i) => n + i.qty * i.cost, 0), 'HPP');
      if (paymentMethod === 'Tunai') requireValue(integer(body.paid, 'Uang diterima') >= total, 'Uang diterima kurang dari total belanja.');
      const sale = { id: id(), date: today(), created_at: new Date().toISOString(), customer: text(body.customer, 100) || 'Pelanggan umum', method: paymentMethod, status: 'paid', total, cost, provider_id: null, payment: null, items };
      state.sales.push(sale);
      for (const i of items) { const p = product(i.product_id); p.stock -= i.qty; stockEvent(p, -i.qty, `Penjualan ${sale.id.slice(0, 8)}`); }
      state.ledger.unshift({ id: id(), date: sale.date, type: 'income', category: 'Penjualan', amount: total, note: `Penjualan · ${sale.customer}`, method: paymentMethod, sale_id: sale.id, source: 'sale' }); result = { sale };
    } else throw new Error('Layanan ini tidak tersedia pada versi perangkat.');
    return result;
  }
  window.fetch = async (resource, options = {}) => {
    const path = typeof resource === 'string' ? resource : resource.url;
    if (!path.startsWith('/api/')) return originalFetch(resource, options);
    const response = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
    try {
      const db = await database;
      return await new Promise(resolve => {
        const verb = options.method || 'GET';
        const transaction = db.transaction('state', verb === 'GET' ? 'readonly' : 'readwrite');
        const table = transaction.objectStore('state');
        const request = table.get('main');
        let result, problem;
        request.onsuccess = () => {
          try {
            const state = request.result || structuredClone(seed);
            result = handle(path, verb, options.body ? JSON.parse(options.body) : {}, state);
            if (verb !== 'GET') table.put(state, 'main');
          } catch (error) { problem = error.message; transaction.abort(); }
        };
        transaction.oncomplete = () => resolve(response(result));
        transaction.onabort = () => resolve(response({ error: problem || 'Data belum disimpan. Periksa izin/ruang penyimpanan browser dan unduh cadangan.' }, 400));
      });
    } catch (error) { return response({ error: error.message }, 400); }
  };
}
