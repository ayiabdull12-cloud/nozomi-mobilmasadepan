import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifySignature, providerState, createGateway } from '../server/payments.js';

test('Tanda tangan Midtrans valid diterima dan perubahan nominal ditolak', () => {
  const key = 'dummy-test-key', notification = { order_id: 'WR-test', status_code: '200', gross_amount: '10000.00' };
  notification.signature_key = createHash('sha512').update('WR-test20010000.00' + key).digest('hex');
  assert.equal(verifySignature(notification, key), true);
  assert.equal(verifySignature({ ...notification, gross_amount: '20000.00' }, key), false);
  assert.equal(verifySignature({ ...notification, signature_key: 'é'.repeat(128) }, key), false);
  assert.equal(verifySignature(notification, 'another-key'), false);
});
test('Status pembayaran wajib cocok pesanan, nominal, dan tipe QRIS', () => {
  const sale = { provider_id: 'WR-test', total: 10000 };
  const status = { order_id: 'WR-test', gross_amount: '10000.00', payment_type: 'qris', transaction_status: 'settlement' };
  assert.equal(providerState(status, sale), 'paid');
  assert.equal(providerState({ ...status, transaction_status: 'pending' }, sale), 'pending');
  assert.equal(providerState({ ...status, transaction_status: 'expire' }, sale), 'cancelled');
  assert.throws(() => providerState({ ...status, gross_amount: '1.00' }, sale), /tidak sesuai/);
  assert.throws(() => providerState({ ...status, order_id: 'WR-other' }, sale), /tidak sesuai/);
  assert.throws(() => providerState({ ...status, payment_type: 'credit_card' }, sale), /tidak sesuai/);
});
test('Gateway memakai endpoint sandbox, autentikasi server, dan body yang sesuai', async () => {
  let call;
  const gateway = createGateway({ key: 'dummy-test-key', fetchImpl: async (url, options) => { call = { url, options }; return { ok: true, json: async () => ({ status_code: '201', qr_string: 'test-qr' }) }; } });
  const result = await gateway('charge', 'POST', { payment_type: 'qris' });
  assert.equal(call.url, 'https://api.sandbox.midtrans.com/v2/charge');
  assert.equal(call.options.headers.Authorization, 'Basic ' + Buffer.from('dummy-test-key:').toString('base64'));
  assert.equal(JSON.parse(call.options.body).payment_type, 'qris'); assert.equal(result.qr_string, 'test-qr');
});
test('Penolakan definitif dibedakan dari kegagalan jaringan yang ambigu', async () => {
  const rejected = createGateway({ key: 'test', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ status_code: '401' }) }) });
  await assert.rejects(rejected('charge', 'POST', {}), error => error.confirmedRejected === true);
  const unavailable = createGateway({ key: 'test', fetchImpl: async () => { throw new Error('Network timeout'); } });
  await assert.rejects(unavailable('charge', 'POST', {}), error => !error.confirmedRejected);
});
