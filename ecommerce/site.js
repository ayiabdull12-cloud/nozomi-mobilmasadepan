export const storefrontDefaults = {
  logoImage: '', bannerImage: '', accentColor: '#314d3b', storefrontLayout: 'catalog', catalogColumns: 3,
  announcement: 'Produk pilihan. Belanja lebih sederhana.', acceptOrders: true,
  closedMessage: 'Toko sedang tidak menerima pesanan baru. Silakan kembali lagi nanti.',
  enableQRIS: true, enableDANA: true, orderHoldHours: 24,
  seoTitle: '', seoDescription: '', allowIndexing: true, googleSiteVerification: ''
};
export const normalizeSettings = settings => ({ ...storefrontDefaults, ...settings });
export function productPath(product) {
  const slug = product.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'produk';
  return `/produk/${encodeURIComponent(product.id)}/${slug}`;
}
export function validatePublicUrl(value) {
  if (!value) return '';
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('SHOP_PUBLIC_URL harus berupa alamat HTTPS toko.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('SHOP_PUBLIC_URL harus berupa origin HTTPS tanpa path, username, query, atau fragment.');
  const name = parsed.hostname.toLowerCase();
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local') || name.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(name) || !name.includes('.')) throw new Error('Gunakan nama domain publik HTTPS untuk SHOP_PUBLIC_URL.');
  return parsed.origin;
}
export const siteInfo = ({ publicUrl = '', demo = false }, settings) => ({ publicUrl, canShare: Boolean(publicUrl), canIndex: Boolean(publicUrl) && !demo && settings.demo !== true && settings.allowIndexing !== false });
