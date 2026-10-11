import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from './store.js';

export function verifySignature(data, key) {
  const actual = String(data.signature_key || '');
  if (!key || !/^[a-f0-9]{128}$/i.test(actual)) return false;
  const expected = createHash('sha512').update(`${data.order_id}${data.status_code}${data.gross_amount}${key}`).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual.toLowerCase()));
}
export function providerState(data, sale) {
  if (String(data.order_id) !== sale.provider_id || Number(data.gross_amount) !== sale.total || data.payment_type !== 'qris') throw new AppError('Detail pembayaran tidak sesuai pesanan.');
  if (data.transaction_status === 'settlement') return 'paid';
  if (['expire', 'cancel', 'deny', 'failure'].includes(data.transaction_status)) return 'cancelled';
  return 'pending';
}
export function createGateway({ key, production = false, fetchImpl = fetch }) {
  const base = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  return async (path, method = 'GET', body) => {
    if (!key) throw new AppError('Midtrans belum dikonfigurasi.', 503);
    const response = await fetchImpl(`${base}/v2/${path}`, { method, headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !['200', '201'].includes(String(result.status_code))) {
      const error = new AppError(`Penyedia QRIS menolak permintaan (${result.status_code || response.status}). Periksa konfigurasi Midtrans.`, 502);
      error.confirmedRejected = ['400', '401', '402', '403'].includes(String(result.status_code));
      throw error;
    }
    return result;
  };
}
