export class ShopError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const fail = message => { throw new ShopError(message); };
export const id = () => crypto.randomUUID();
export const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(value));
const text = (value, label, max = 200, required = true) => { const s = String(value ?? '').trim(); if ((required && !s) || s.length > max) fail(`${label} ${!s ? 'wajib diisi' : 'terlalu panjang'}.`); return s; };
const integer = (value, label, max = 1e9, min = 0) => { if (!['string', 'number'].includes(typeof value) || value === '' || value == null || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(`${label} harus berupa angka bulat antara ${min} dan ${max}.`); return Number(value); };
const url = (value, label) => { const s = text(value, label, 2000, false); if (!s) return ''; try { if (!['https:', 'http:'].includes(new URL(s).protocol)) fail(`${label} harus memakai https atau http.`); } catch { fail(`${label} tidak valid.`); } return s; };
const image = value => { const s = String(value || ''); if (!s) return ''; if (s.startsWith('data:')) { if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) || s.length > 2_800_000) fail('Gunakan gambar PNG, JPEG, atau WebP maksimal 2 MB.'); return s; } return url(s, 'Tautan gambar'); };
export function artwork(kind, color = '#e8d5ba') {
  const drawings = {
    coffee: '<path d="M111 69h98l12 169H99z" fill="#422a21"/><path d="M113 68h94v16h-94z" fill="#251b19"/><rect x="111" y="116" width="98" height="78" rx="2" fill="#f9f0d8"/><text x="160" y="145" text-anchor="middle" fill="#422a21" font-size="13" font-family="serif">AYNET</text><path d="M145 167q15-23 30 0q-15 23-30 0z" fill="#c0774c"/><path d="M151 175l18-16" stroke="#f9f0d8" stroke-width="2"/>',
    tote: '<path d="M108 104h104l12 134H96z" fill="#eee6d4" stroke="#c8b99e" stroke-width="2"/><path d="M131 108V84a29 29 0 0158 0v24" fill="none" stroke="#b8a58a" stroke-width="12"/><path d="M138 170q22-39 44 0q-22 35-44 0" fill="#3e5947"/><text x="160" y="202" text-anchor="middle" fill="#3e5947" font-size="14" font-family="serif">everyday.</text>',
    bottle: '<rect x="129" y="74" width="62" height="158" rx="20" fill="#6e846c"/><rect x="136" y="62" width="48" height="24" rx="8" fill="#293e30"/><path d="M143 95v111" stroke="#c2cfb8" stroke-width="5" opacity=".5"/><text x="160" y="160" text-anchor="middle" fill="#ecebda" font-size="13" font-family="serif">AYNET</text>',
    pouch: '<path d="M99 127q61-18 122 0l9 89q-70 15-140 0z" fill="#b3684f"/><path d="M101 125h118" stroke="#653c32" stroke-width="6"/><path d="M105 136h111" stroke="#d59d82" stroke-width="2"/><rect x="142" y="154" width="36" height="38" fill="#f3dcc3"/><text x="160" y="177" text-anchor="middle" fill="#653c32" font-size="9">AYNET</text>',
    mug: '<path d="M204 113h18q38 0 30 45q-4 28-49 26" fill="none" stroke="#b2ae91" stroke-width="15"/><path d="M105 111h105v86q-4 31-52 31q-49 0-53-31z" fill="#e7e0c6"/><ellipse cx="157" cy="112" rx="52" ry="13" fill="#b9af94"/><ellipse cx="157" cy="111" rx="43" ry="8" fill="#614032"/><path d="M122 140v53" stroke="#fdf8e9" stroke-width="7" opacity=".7"/>',
    candle: '<rect x="112" y="108" width="96" height="119" rx="7" fill="#967050"/><ellipse cx="160" cy="109" rx="48" ry="11" fill="#efdfbd"/><rect x="120" y="135" width="80" height="59" fill="#f6e9cd"/><text x="160" y="159" text-anchor="middle" fill="#5d4739" font-size="13" font-family="serif">slow days</text><text x="160" y="176" text-anchor="middle" fill="#5d4739" font-size="8">SOY CANDLE</text><path d="M160 108v-16" stroke="#4b392f" stroke-width="2"/><path d="M160 93q-13-16 1-34q16 22-1 34" fill="#d59449"/>'
  };
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 290"><defs><radialGradient id="g"><stop stop-color="#fff" stop-opacity=".65"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="s"><feGaussianBlur stdDeviation="7"/></filter></defs><rect width="320" height="290" fill="${color}"/><circle cx="145" cy="100" r="155" fill="url(#g)"/><ellipse cx="160" cy="240" rx="64" ry="10" fill="#3d342d" opacity=".12" filter="url(#s)"/>${drawings[kind] || drawings.coffee}</svg>`);
}
export function createSeed(demo = true) {
  const state = { version: 1, settings: { name: 'Aynetpremium', tagline: 'Pilihan baik, untuk setiap hari.', description: 'Temukan barang favorit yang dibuat untuk menemani keseharian Anda. Dipilih dengan hati, dikirim dengan rapi.', owner: '', whatsapp: '', address: '', danaNumber: '085156840563', danaName: '', qrisImage: '', shippingFee: 15000, allowDelivery: true, demo }, products: [], orders: [], ledger: [] };
  if (demo) {
    const samples = [ ['Kopi Nusantara', 'Kopi & makanan', 85000, 52000, 'coffee', '#e1d0bc', 'Biji kopi pilihan dengan aroma cokelat dan rasa yang seimbang. Kemasan 250 gram.'], ['Everyday Tote', 'Aksesori', 69000, 35000, 'tote', '#e0e5d8', 'Tas kanvas serbaguna untuk kerja, belanja, dan akhir pekan. Ukuran 35 × 40 cm.'], ['Tumbler Sage', 'Rumah & gaya hidup', 129000, 79000, 'bottle', '#d9e1d3', 'Teman minum sehari-hari. Tumbler stainless 500 ml dengan tutup rapat.'], ['Pouch Terracotta', 'Aksesori', 49000, 23000, 'pouch', '#ecd8ce', 'Tempat kecil untuk barang penting Anda. Bahan kanvas dengan resleting.'], ['Mug Senja', 'Rumah & gaya hidup', 79000, 41000, 'mug', '#e5dfd0', 'Mug keramik 300 ml untuk menikmati jeda dan minuman favorit.'], ['Slow Days Candle', 'Rumah & gaya hidup', 99000, 54000, 'candle', '#e6d2b7', 'Lilin kedelai dengan aroma hangat untuk suasana rumah yang nyaman.'] ];
    state.products = samples.map(([name, category, price, cost, kind, color, description], i) => ({ id: id(), name, category, price, cost, stock: 20 + i * 3, description, image: artwork(kind, color), kind: 'physical', deliveryLink: '', revision: 0, link: '', active: true, featured: i < 3, createdAt: new Date().toISOString() }));
  }
  return state;
}
const publicProduct = ({ cost, deliveryLink, ...product }) => product;
export const catalog = state => ({ settings: state.settings, products: state.products.filter(p => p.active).map(publicProduct) });
const findOrder = (state, orderId) => state.orders.find(o => o.id === orderId) || fail('Pesanan tidak ditemukan.');
const publicOrder = ({ token, cost, checkoutKey, checkoutSignature, ...order }) => ({ ...order, items: order.items.map(({ cost, deliveryLink, ...item }) => ({ ...item, ...(order.paymentStatus === 'paid' && deliveryLink ? { deliveryLink } : {}) })) });
function cancel(state, order, reason) {
  if (order.paymentStatus === 'cancelled') return;
  if (order.paymentStatus === 'paid') fail('Pesanan lunas tidak dapat dibatalkan di sini. Pengembalian dana perlu rekonsiliasi terpisah.');
  for (const item of order.items) { const product = state.products.find(p => p.id === item.id); if (product) { product.stock += item.qty; product.revision = (product.revision || 0) + 1; } }
  order.paymentStatus = 'cancelled'; order.cancelReason = reason; order.updatedAt = new Date().toISOString();
}
export function expireOrders(state, now = Date.now()) { for (const order of state.orders) if (['pending', 'review'].includes(order.paymentStatus) && new Date(order.expiresAt).getTime() <= now) cancel(state, order, 'Batas pembayaran 24 jam berakhir.'); }
export function report(state, from = '0000-01-01', to = '9999-12-31') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) fail('Rentang tanggal tidak valid.');
  const within = value => value >= from && value <= to;
  const orders = state.orders.filter(o => o.paymentStatus === 'paid' && within(day(o.paidAt)));
  const entries = state.ledger.filter(e => within(e.date));
  const sum = list => list.reduce((a, e) => a + e.amount, 0);
  const revenue = orders.reduce((a, o) => a + o.total, 0), cost = orders.reduce((a, o) => a + o.cost, 0);
  const expenses = sum(entries.filter(e => !e.orderId && e.type === 'expense' && e.profitImpact));
  const otherIncome = sum(entries.filter(e => !e.orderId && e.type === 'income' && e.profitImpact));
  const incoming = sum(entries.filter(e => e.type === 'income')), outgoing = sum(entries.filter(e => e.type === 'expense'));
  const byDate = new Map();
  for (const order of orders) { const d = day(order.paidAt); const row = byDate.get(d) || { date: d, revenue: 0, profit: 0 }; row.revenue += order.total; row.profit += order.total - order.cost; byDate.set(d, row); }
  for (const e of entries.filter(e => !e.orderId && e.profitImpact)) { const row = byDate.get(e.date) || { date: e.date, revenue: 0, profit: 0 }; row.profit += e.type === 'income' ? e.amount : -e.amount; byDate.set(e.date, row); }
  const best = new Map(); for (const order of orders) for (const item of order.items) { const row = best.get(item.id) || { name: item.name, qty: 0, revenue: 0 }; row.qty += item.qty; row.revenue += item.qty * item.price; best.set(item.id, row); }
  return { revenue, cost, expenses, otherIncome, gross: revenue - cost, net: revenue - cost + otherIncome - expenses, incoming, outgoing, cash: incoming - outgoing, paidCount: orders.length, entries, series: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), best: [...best.values()].sort((a, b) => b.revenue - a.revenue) };
}
export function handle(state, method, path, body = {}, { admin = false } = {}) {
  const parts = path.split('/').filter(Boolean);
  if (method === 'GET' && path === '/catalog') return catalog(state);
  if (method === 'GET' && parts[0] === 'order' && parts[1]) { const order = state.orders.find(o => o.token === parts[1]); if (!order) throw new ShopError('Pesanan tidak ditemukan.', 404); return publicOrder(order); }
  if (method === 'POST' && path === '/orders') {
    const checkoutKey = text(body.checkoutKey, 'Kode checkout', 36); if (!/^[0-9a-f-]{36}$/i.test(checkoutKey)) fail('Kode checkout tidak valid.');
    const checkoutSignature = JSON.stringify({ items: body.items, customer: body.customer, delivery: body.delivery, method: body.method });
    const existing = state.orders.find(o => o.checkoutKey === checkoutKey); if (existing) { if (existing.checkoutSignature !== checkoutSignature) fail('Isi pesanan berubah. Mulai checkout baru.'); return { ...publicOrder(existing), token: existing.token }; }
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail('Keranjang harus berisi 1–100 produk.');
    const customer = { name: text(body.customer?.name, 'Nama pembeli', 100), phone: text(body.customer?.phone, 'Nomor WhatsApp', 20), address: text(body.customer?.address, 'Alamat', 600, body.delivery === 'delivery'), note: text(body.customer?.note, 'Catatan', 500, false) };
    if (!/^\+?[0-9 ()-]{8,20}$/.test(customer.phone)) fail('Nomor WhatsApp tidak valid.');
    const digitalOnly = body.items.every(i => state.products.find(p => p.id === i.id)?.kind === 'digital');
    if ((digitalOnly && body.delivery !== 'digital') || (!digitalOnly && body.delivery === 'digital')) fail('Pilihan pengiriman tidak sesuai jenis produk.');
    if (!['pickup', 'delivery', 'digital'].includes(body.delivery) || (body.delivery === 'delivery' && !state.settings.allowDelivery)) fail('Pilihan pengiriman tidak tersedia.');
    if (!['QRIS', 'DANA'].includes(body.method)) fail('Pilih QRIS atau DANA.');
    if (body.method === 'QRIS' && !state.settings.qrisImage) fail('Pemilik toko belum memasang QRIS.');
    if (body.method === 'DANA' && (!state.settings.danaNumber || !state.settings.danaName)) fail('Pemilik toko belum mengisi rekening DANA.');
    const seen = new Set();
    const items = body.items.map(i => { if (seen.has(i.id)) fail('Produk ganda dalam keranjang.'); seen.add(i.id); const p = state.products.find(p => p.id === i.id && p.active); if (!p) fail('Produk sudah tidak tersedia.'); const qty = integer(i.qty, 'Jumlah produk', 1e6, 1); if (qty > p.stock) fail(`Stok ${p.name} hanya ${p.stock}.`); return { id: p.id, name: p.name, qty, price: p.price, cost: p.cost, image: p.image, kind: p.kind || 'physical', deliveryLink: p.deliveryLink || '' }; });
    const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0), cost = items.reduce((a, i) => a + i.qty * i.cost, 0), shipping = body.delivery === 'delivery' ? state.settings.shippingFee : 0;
    if (subtotal + shipping > 1e12 || cost > 1e12) fail('Total pesanan melebihi batas.');
    for (const i of items) { const p = state.products.find(p => p.id === i.id); p.stock -= i.qty; p.revision = (p.revision || 0) + 1; }
    const now = new Date(), order = { checkoutKey, checkoutSignature, id: id(), token: id() + id(), number: `AY-${day(now).replaceAll('-', '')}-${id().slice(0, 6).toUpperCase()}`, customer, items, subtotal, shipping, total: subtotal + shipping, cost, method: body.method, delivery: body.delivery, paymentStatus: 'pending', fulfillment: 'baru', createdAt: now.toISOString(), updatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86400000).toISOString(), payment: { qrisImage: body.method === 'QRIS' ? state.settings.qrisImage : '', danaNumber: body.method === 'DANA' ? state.settings.danaNumber : '', danaName: body.method === 'DANA' ? state.settings.danaName : '' }, proof: '', paymentNote: '' };
    state.orders.push(order); return { ...publicOrder(order), token: order.token };
  }
  if (method === 'POST' && parts[0] === 'order' && parts[2] === 'proof') {
    const order = state.orders.find(o => o.token === parts[1]); if (!order) throw new ShopError('Pesanan tidak ditemukan.', 404);
    if (!['pending', 'review'].includes(order.paymentStatus)) fail('Pesanan sudah lunas atau dibatalkan.');
    const proof = image(body.proof); if (proof && !proof.startsWith('data:')) fail('Bukti pembayaran harus berupa unggahan gambar.');
    const note = text(body.note, 'Keterangan pembayaran', 500, false); if (!proof && !note) fail('Unggah bukti atau tulis nama pengirim dan waktu pembayaran.');
    order.proof = proof; order.paymentNote = note; order.paymentStatus = 'review'; order.updatedAt = new Date().toISOString(); return publicOrder(order);
  }
  if (!admin) throw new ShopError('Silakan masuk sebagai pemilik toko.', 401);
  if (method === 'GET' && path === '/admin/state') return { ...state, report: report(state) };
  if (method === 'GET' && path === '/admin/backup') return structuredClone(state);
  if (method === 'PUT' && path === '/admin/settings') {
    const s = state.settings;
    const settings = { ...s, name: text(body.name, 'Nama toko', 80), tagline: text(body.tagline, 'Tagline', 140, false), description: text(body.description, 'Deskripsi toko', 1000, false), owner: text(body.owner, 'Nama pemilik', 100, false), whatsapp: text(body.whatsapp, 'WhatsApp toko', 20, false), address: text(body.address, 'Alamat toko', 600, false), danaNumber: text(body.danaNumber, 'Nomor DANA', 20, false), danaName: text(body.danaName, 'Nama penerima DANA', 100, false), qrisImage: image(body.qrisImage), shippingFee: integer(body.shippingFee, 'Ongkos kirim'), allowDelivery: body.allowDelivery === true };
    if (settings.danaNumber && !/^0[0-9]{8,14}$/.test(settings.danaNumber)) fail('Nomor DANA harus diawali 0 dan berisi 9–15 angka.');
    if (settings.whatsapp && !/^\+?[0-9]{8,16}$/.test(settings.whatsapp)) fail('Nomor WhatsApp toko tidak valid.');
    if (settings.qrisImage && !settings.qrisImage.startsWith('data:')) fail('QRIS harus diunggah sebagai gambar.');
    state.settings = settings; return { ok: true };
  }
  if (parts[0] === 'admin' && parts[1] === 'products') {
    const product = parts[2] ? state.products.find(p => p.id === parts[2]) : null;
    if (parts[2] && !product) fail('Produk tidak ditemukan.');
    if (method === 'DELETE') { product.active = false; return { ok: true }; }
    if (['POST', 'PUT'].includes(method)) { if (product && Number(body.revision) !== (product.revision || 0)) throw new ShopError('Stok atau rincian produk berubah. Tutup formulir dan buka kembali sebelum menyimpan.', 409); const kind = body.kind || 'physical'; if (!['physical', 'digital'].includes(kind)) fail('Jenis produk tidak valid.'); const p = { id: product?.id || id(), createdAt: product?.createdAt || new Date().toISOString(), name: text(body.name, 'Nama produk', 120), description: text(body.description, 'Deskripsi produk', 2000, false), category: text(body.category, 'Kategori', 80), price: integer(body.price, 'Harga jual', 1e9, 1), cost: integer(body.cost, 'Harga modal'), stock: integer(body.stock, 'Stok tersedia', 1e6), image: body.image === product?.image ? product.image : image(body.image), link: url(body.link, 'Tautan produk'), kind, deliveryLink: kind === 'digital' ? url(body.deliveryLink, 'Tautan akses digital') : '', revision: (product?.revision || 0) + 1, active: body.active !== false, featured: body.featured === true }; if (product) Object.assign(product, p); else state.products.push(p); return { ok: true, product: p }; }
  }
  if (method === 'POST' && parts[0] === 'admin' && parts[1] === 'orders') {
    const order = findOrder(state, parts[2]);
    if (parts[3] === 'confirm') { if (order.paymentStatus === 'paid') return { ok: true }; if (order.paymentStatus === 'cancelled') fail('Pesanan sudah dibatalkan.'); if (body.received !== true) fail('Periksa rekening dan konfirmasi dana telah masuk.'); order.paymentStatus = 'paid'; if (order.items.every(i => i.kind === 'digital')) order.fulfillment = 'selesai'; order.paidAt = new Date().toISOString(); order.updatedAt = order.paidAt; state.ledger.push({ id: id(), date: day(order.paidAt), type: 'income', category: 'Penjualan', amount: order.total, note: `Pesanan ${order.number} · ${order.method}`, orderId: order.id, profitImpact: true }); return { ok: true }; }
    if (parts[3] === 'cancel') { cancel(state, order, text(body.reason, 'Alasan pembatalan', 500)); return { ok: true }; }
    if (parts[3] === 'fulfillment') { if (order.paymentStatus !== 'paid') fail('Konfirmasi pembayaran sebelum memproses pengiriman.'); if (!['baru', 'diproses', 'dikirim', 'selesai'].includes(body.status)) fail('Status pengiriman tidak valid.'); order.fulfillment = body.status; order.tracking = text(body.tracking, 'Nomor resi', 120, false); order.updatedAt = new Date().toISOString(); return { ok: true }; }
  }
  if (parts[0] === 'admin' && parts[1] === 'ledger') {
    const entry = parts[2] ? state.ledger.find(e => e.id === parts[2]) : null;
    if (parts[2] && !entry) fail('Catatan tidak ditemukan.'); if (entry?.orderId) fail('Catatan penjualan berasal dari pembayaran dan tidak dapat diubah manual.');
    if (method === 'DELETE') { state.ledger = state.ledger.filter(e => e.id !== entry.id); return { ok: true }; }
    if (['POST', 'PUT'].includes(method)) { if (!['income', 'expense'].includes(body.type)) fail('Jenis keuangan tidak valid.'); const date = text(body.date, 'Tanggal', 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) fail('Tanggal tidak valid.'); const category = text(body.category, 'Kategori', 80); const e = { id: entry?.id || id(), date, type: body.type, category, amount: integer(body.amount, 'Nominal', 1e12, 1), note: text(body.note, 'Keterangan', 500), orderId: null, profitImpact: !['Pembelian stok', 'Modal pemilik', 'Penarikan pemilik', 'Aset'].includes(category) }; if (entry) Object.assign(entry, e); else state.ledger.push(e); return { ok: true }; }
  }
  if (method === 'POST' && path === '/admin/clear-demo') { if (!state.settings.demo || body.confirmation !== 'HAPUS DATA CONTOH') fail('Konfirmasi penghapusan data contoh diperlukan.'); state.products = []; state.orders = []; state.ledger = []; state.settings.demo = false; return { ok: true }; }
  throw new ShopError('Layanan tidak ditemukan.', 404);
}
