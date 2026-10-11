import { expireOrders, handle } from '../domain.js';
export function installDemo(seed) {
  const native = window.fetch.bind(window);
  let logged = false;
  const database = new Promise((resolve, reject) => { const request = indexedDB.open('aynetpremium-preview-v1', 1); request.onupgradeneeded = () => request.result.createObjectStore('state'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Penyimpanan browser tidak tersedia. Gunakan browser biasa atau versi server.')); });
  window.fetch = async (input, options = {}) => {
    const address = typeof input === 'string' ? input : input.url;
    if (!address.startsWith('/shop-api/')) return native(input, options);
    const path = address.slice('/shop-api'.length), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : {};
    const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (path === '/session') return response({ admin: logged, csrf: 'demo-local', demo: true, demoPassword: true, portable: true });
    if (path === '/login') { if (body.password !== 'demo-toko') return response({ error: 'Kata sandi demo: demo-toko' }, 401); logged = true; return response({ admin: true, csrf: 'demo-local', demo: true, demoPassword: true, portable: true }); }
    if (path === '/logout') { logged = false; return response({ ok: true }); }
    if (path === '/admin/server-info' && logged) return response({ publicUrl: '', storeUrl: '', canShare: false, canIndex: false, portable: true, demo: true });
    if (path === '/admin/share-qr' && logged) return response({ error: 'Versi perangkat belum mempunyai alamat toko publik.' }, 400);
    try { const db = await database; return await new Promise(resolve => { const tx = db.transaction('state', 'readwrite'), table = tx.objectStore('state'), request = table.get('main'); let result, error;
      request.onsuccess = () => { try { const state = request.result || structuredClone(seed); expireOrders(state); result = handle(state, method, path, body, { admin: logged }); table.put(state, 'main'); } catch (e) { error = e; tx.abort(); } };
      tx.oncomplete = () => resolve(response(result)); tx.onabort = tx.onerror = () => resolve(response({ error: error?.message || 'Data gagal disimpan.' }, error?.status || 400));
    }); } catch (e) { return response({ error: e.message }, 500); }
  };
}
