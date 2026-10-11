import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import QRCode from 'qrcode';
import { createStore, AppError } from './store.js';
import { createGateway, providerState, verifySignature } from './payments.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const store = createStore(process.env.DATABASE_PATH || resolve(root, 'data/warung.sqlite'), { demo: process.env.SEED_DEMO !== 'false' });
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });
const password = process.env.APP_PASSWORD;
app.use((req, res, next) => {
  if (!password || req.path === '/api/qris/webhook') return next();
  const encoded = req.headers.authorization?.match(/^Basic ([A-Za-z0-9+/=]+)$/)?.[1];
  const credential = encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
  const colon = credential.indexOf(':');
  const valid = credential.slice(0, colon) === 'warung' && timingSafeEqual(createHash('sha256').update(credential.slice(colon + 1)).digest(), createHash('sha256').update(password).digest());
  if (valid) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="WarungRaya", charset="UTF-8"');
  res.status(401).json({ error: 'Masuk dengan nama pengguna warung dan kata sandi aplikasi.' });
});
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const production = process.env.MIDTRANS_PRODUCTION === 'true';
const configured = Boolean(serverKey && process.env.PUBLIC_BASE_URL);
if (process.env.PUBLIC_BASE_URL && !password) throw new Error('APP_PASSWORD diperlukan sebelum mengaktifkan alamat publik.');
if (process.env.PUBLIC_BASE_URL && !/^https:\/\//.test(process.env.PUBLIC_BASE_URL)) throw new Error('PUBLIC_BASE_URL harus berupa alamat HTTPS.');
const callMidtrans = createGateway({ key: serverKey, production });
async function midtrans(path, method = 'GET', body) {
  if (!configured) throw new AppError('QRIS otomatis belum terhubung. Gunakan QRIS manual atau hubungkan Midtrans melalui konfigurasi server.', 503);
  return callMidtrans(path, method, body);
}
app.get('/api/health', (req, res) => res.json({ ok: true, database: 'sqlite', qris: configured ? (production ? 'production' : 'sandbox') : 'manual' }));
app.get('/api/state', (req, res) => res.json({ ...store.snapshot(), qris: { configured, production, provider: 'Midtrans' } }));
app.get('/api/backup', (req, res, next) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'warung-backup-'));
  const file = resolve(directory, 'warung.sqlite');
  try {
    store.db.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
    res.download(file, `cadangan-warung-${new Date().toISOString().slice(0, 10)}.sqlite`, error => { rmSync(directory, { recursive: true, force: true }); if (error && !res.headersSent) next(error); });
  } catch (error) { rmSync(directory, { recursive: true, force: true }); next(error); }
});
app.post('/api/products', (req, res) => { store.saveProduct(req.body); res.json({ ok: true }); });
app.put('/api/products/:id', (req, res) => { store.saveProduct(req.body, req.params.id); res.json({ ok: true }); });
app.delete('/api/products/:id', (req, res) => { store.archiveProduct(req.params.id); res.json({ ok: true }); });
app.post('/api/products/:id/stock', (req, res) => { store.restock(req.params.id, req.body); res.json({ ok: true }); });
app.post('/api/ledger', (req, res) => { store.ledger(req.body); res.json({ ok: true }); });
app.put('/api/ledger/:id', (req, res) => { store.ledger(req.body, req.params.id); res.json({ ok: true }); });
app.delete('/api/ledger/:id', (req, res) => { store.deleteLedger(req.params.id); res.json({ ok: true }); });
app.put('/api/settings', (req, res) => { store.saveSettings(req.body); res.json({ ok: true }); });
app.post('/api/clear-demo', (req, res) => { if (req.body.confirmation !== 'HAPUS DATA CONTOH') throw new AppError('Konfirmasi penghapusan diperlukan.'); store.clearDemo(); res.json({ ok: true }); });
app.post('/api/sales', async (req, res) => {
  const automatic = req.body.method === 'QRIS' && req.body.automatic === true;
  if (automatic && !configured) throw new AppError('Midtrans belum dikonfigurasi.', 503);
  const sale = store.createSale(req.body, { pending: automatic });
  if (automatic) {
    try {
      const result = await midtrans('charge', 'POST', { payment_type: 'qris', transaction_details: { order_id: sale.provider_id, gross_amount: sale.total }, qris: { acquirer: 'gopay' }, custom_expiry: { expiry_duration: 15, unit: 'minute' } });
      if (!result.qr_string) throw new AppError('Penyedia tidak mengembalikan kode QRIS.', 502);
      store.setPayment(sale.id, { qrImage: await QRCode.toDataURL(result.qr_string), expiresAt: new Date(Date.now() + 15 * 60000).toISOString() });
    } catch (error) {
      if (error.confirmedRejected) { store.settle(sale.provider_id, 'cancelled'); throw error; }
      // An ambiguous provider timeout must retain the reservation. Poll provider status before cancelling.
      store.setPayment(sale.id, { error: 'Permintaan QRIS belum terkonfirmasi. Periksa status sebelum membatalkan.' });
      return res.status(202).json({ sale: store.getSale(sale.id), warning: 'Permintaan QRIS belum terkonfirmasi. Stok direservasi sampai status pembayaran diperiksa.' });
    }
  }
  res.status(201).json({ sale: store.getSale(sale.id) });
});
app.post('/api/sales/:id/check', async (req, res) => {
  const sale = store.getSale(req.params.id);
  if (!sale.provider_id || sale.status !== 'pending') return res.json({ sale });
  const result = await midtrans(`${encodeURIComponent(sale.provider_id)}/status`);
  res.json({ sale: store.settle(sale.provider_id, providerState(result, sale)) });
});
app.post('/api/sales/:id/cancel', async (req, res) => {
  const sale = store.getSale(req.params.id);
  if (!sale.provider_id || sale.status !== 'pending') throw new AppError('Pembayaran tidak dapat dibatalkan.');
  const status = await midtrans(`${encodeURIComponent(sale.provider_id)}/status`);
  const current = providerState(status, sale);
  if (current === 'paid') return res.json({ sale: store.settle(sale.provider_id, 'paid') });
  if (current === 'pending') {
    await midtrans(`${encodeURIComponent(sale.provider_id)}/cancel`, 'POST');
    const result = await midtrans(`${encodeURIComponent(sale.provider_id)}/status`);
    if (providerState(result, sale) !== 'cancelled') throw new AppError('Pembatalan belum dikonfirmasi penyedia. Periksa status kembali.', 409);
  }
  res.json({ sale: store.settle(sale.provider_id, 'cancelled') });
});
app.post('/api/qris/webhook', async (req, res) => {
  if (!configured) throw new AppError('QRIS belum dikonfigurasi.', 503);
  const data = req.body;
  if (!verifySignature(data, serverKey)) throw new AppError('Tanda tangan pembayaran tidak valid.', 401);
  const sale = store.snapshot().sales.find(s => s.provider_id === data.order_id);
  if (!sale) throw new AppError('Pesanan tidak ditemukan.', 404);
  const authoritative = await midtrans(`${encodeURIComponent(sale.provider_id)}/status`);
  store.settle(sale.provider_id, providerState(authoritative, sale));
  res.json({ ok: true });
});
app.use('/api', (req, res) => res.status(404).json({ error: 'Layanan tidak ditemukan.' }));
app.use(express.static(resolve(root, 'dist')));
app.get('/{*path}', (req, res) => res.sendFile(resolve(root, 'dist/index.html')));
app.use((error, req, res, next) => {
  if (!(error instanceof AppError)) console.error('Server error:', error.name);
  res.status(error.status || 500).json({ error: error instanceof AppError ? error.message : 'Terjadi kesalahan server. Silakan coba lagi.' });
});
const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log(`WarungRaya server siap pada port ${process.env.PORT || 3001}.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
