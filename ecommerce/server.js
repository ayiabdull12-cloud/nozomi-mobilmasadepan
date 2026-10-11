import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { validatePublicUrl, siteInfo } from './site.js';
import { registerStorePages } from './web.js';
import QRCode from 'qrcode';
import { createSeed, expireOrders, handle, ShopError } from './domain.js';

const directory = dirname(fileURLToPath(import.meta.url));
const host = process.env.SHOP_HOST || '127.0.0.1';
const publicUrl = validatePublicUrl(process.env.SHOP_PUBLIC_URL || '');
const configuredPassword = process.env.SHOP_ADMIN_PASSWORD || '';
if (publicUrl && !/^https:\/\//.test(publicUrl)) throw new Error('SHOP_PUBLIC_URL harus memakai HTTPS.');
const local = ['127.0.0.1', 'localhost', '::1'].includes(host) && !publicUrl;
const demo = process.env.SHOP_DEMO === 'true' || (!configuredPassword && local && process.env.SHOP_DEMO !== 'false');
if (!configuredPassword && (!local || !demo)) throw new Error('Isi SHOP_ADMIN_PASSWORD sebelum menjalankan toko non-demo atau mengakses dari jaringan.');
if (configuredPassword && configuredPassword.length < 12) throw new Error('SHOP_ADMIN_PASSWORD minimal 12 karakter.');
const password = configuredPassword || 'demo-toko';
const databasePath = process.env.SHOP_DATABASE_PATH || resolve(directory, '../data/toko.sqlite');
if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS shop_state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');
if (!db.prepare('SELECT id FROM shop_state WHERE id=1').get()) db.prepare('INSERT INTO shop_state VALUES (1, ?)').run(JSON.stringify(createSeed(demo)));
function transact(method, path, body, access) {
  db.exec('BEGIN IMMEDIATE');
  try { const state = JSON.parse(db.prepare('SELECT value FROM shop_state WHERE id=1').get().value); expireOrders(state); const result = handle(state, method, path, body, access); db.prepare('UPDATE shop_state SET value=? WHERE id=1').run(JSON.stringify(state)); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
const app = express();
app.disable('x-powered-by');
if (process.env.SHOP_TRUST_PROXY) { const value = process.env.SHOP_TRUST_PROXY; if (!['loopback', '1', '2', '3'].includes(value)) throw new Error('SHOP_TRUST_PROXY harus loopback atau jumlah proxy 1–3 yang dipercaya.'); app.set('trust proxy', value === 'loopback' ? value : Number(value)); }
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY'); if (req.path.startsWith('/shop-api')) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); } next(); });
const sessions = new Map(), attempts = new Map();
const cookieName = 'aynet_session';
const cookie = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
const session = req => { const key = cookie(req), s = sessions.get(key); if (s && s.expires > Date.now()) return s; if (key) sessions.delete(key); return null; };
function limit(req, kind, maximum) {
  const key = `${kind}:${req.ip}`, now = Date.now();
  let a = attempts.get(key); if (!a || a.until <= now) { a = { count: 0, until: now + 15 * 60000 }; attempts.set(key, a); }
  if (++a.count > maximum) throw new ShopError('Terlalu banyak percobaan. Coba lagi dalam 15 menit.', 429);
}
app.get('/shop-api/health', (req, res) => res.json({ ok: true, storage: 'sqlite', demo }));
app.get('/shop-api/session', (req, res) => { const s = session(req); res.json({ admin: Boolean(s), csrf: s?.csrf || '', demo, demoPassword: !configuredPassword, portable: false }); });
app.post('/shop-api/login', (req, res) => {
  limit(req, 'login', 20);
  if (!timingSafeEqual(createHash('sha256').update(String(req.body.password || '')).digest(), createHash('sha256').update(password).digest())) throw new ShopError('Kata sandi pemilik tidak sesuai.', 401);
  const old = cookie(req); if (old) sessions.delete(old);
  const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
  sessions.set(token, { csrf, expires: Date.now() + 8 * 3600000 });
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: Boolean(publicUrl), maxAge: 8 * 3600000, path: '/' });
  res.json({ admin: true, csrf, demo, demoPassword: !configuredPassword, portable: false });
});
app.post('/shop-api/logout', (req, res) => { const s = session(req); if (s && req.headers['x-shop-csrf'] !== s.csrf) throw new ShopError('Sesi tidak valid.', 403); const token = cookie(req); if (token) sessions.delete(token); res.clearCookie(cookieName, { path: '/' }); res.json({ ok: true }); });
app.use('/shop-api', async (req, res) => {
  const s = session(req), adminPath = req.path.startsWith('/admin/');
  if (adminPath && !s) throw new ShopError('Silakan masuk sebagai pemilik toko.', 401);
  if (adminPath && req.method !== 'GET' && req.headers['x-shop-csrf'] !== s.csrf) throw new ShopError('Sesi tidak valid. Masuk ulang.', 403);
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    if (origin) { const expected = publicUrl ? new URL(publicUrl).origin : `${req.protocol}://${req.get('host')}`; if (origin !== expected) throw new ShopError('Permintaan berasal dari situs lain.', 403); }
    if (req.path === '/orders' || req.path.endsWith('/proof')) limit(req, 'checkout', 40);
  }
  if (req.method === 'GET' && ['/admin/server-info', '/admin/share-qr'].includes(req.path)) {
    const c = transact('GET', '/catalog');
    const info = siteInfo({ publicUrl, demo }, c.settings);
    if (req.path === '/admin/share-qr') {
      if (!publicUrl) throw new ShopError('Alamat publik toko belum diatur oleh pemilik server.');
      return res.json({ image: await QRCode.toDataURL(publicUrl + '/toko', { width: 320, margin: 2 }), url: publicUrl + '/toko' });
    }
    return res.json({ ...info, storeUrl: publicUrl ? publicUrl + '/toko' : '', ownerUrl: publicUrl ? publicUrl + '/pemilik' : '', portable: false, demo, configuredPassword: Boolean(configuredPassword) });
  }
  const result = transact(req.method, req.path, req.body, { admin: Boolean(s) });
  if (req.method === 'GET' && req.path === '/catalog') result.site = siteInfo({ publicUrl, demo }, result.settings);
  if (req.path === '/admin/backup') res.setHeader('Content-Disposition', `attachment; filename="cadangan-aynetpremium-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(result);
});
registerStorePages(app, () => transact('GET', '/catalog'), { publicUrl, demo, distDir: resolve(directory, 'dist') });
app.use(express.static(resolve(directory, 'dist'), { index: false }));
app.get('/{*path}', (req, res) => { res.setHeader('X-Robots-Tag', 'noindex'); res.status(404).type('html').send('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Halaman tidak ditemukan</title><meta name="robots" content="noindex"></head><body><h1>Halaman tidak ditemukan</h1><a href="/toko">Kembali ke toko</a></body></html>'); });
app.use((error, req, res, next) => { res.status(error.status || 500).json({ error: error instanceof ShopError ? error.message : error.type === 'entity.too.large' ? 'Berkas terlalu besar.' : 'Terjadi kesalahan server. Coba lagi.' }); });
const cleanup = setInterval(() => { const now = Date.now(); for (const [key, s] of sessions) if (s.expires <= now) sessions.delete(key); for (const [key, a] of attempts) if (a.until <= now) attempts.delete(key); }, 60000).unref();
const server = app.listen(Number(process.env.SHOP_PORT || process.env.PORT || 3003), host, () => console.log(`Toko siap pada port ${process.env.SHOP_PORT || process.env.PORT || 3003}; mode ${demo ? 'contoh lokal' : 'server'}.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(cleanup); server.close(() => { db.close(); process.exit(0); }); });
