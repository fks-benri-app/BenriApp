// オフライン対応の Service Worker(アプリ本体のキャッシュ)。main.jsx から登録する
// ===== オフライン対応(アプリ本体のキャッシュ) =====
const APP_CACHE = 'benri-app-v1'; // 更新するときは v2, v3… と上げる
const APP_SCOPE = self.registration.scope; // 例: https://…/BenriApp/

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.add(APP_SCOPE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('benri-app-') && k !== APP_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // このアプリの中身だけ対象(Firebase・GAS などの通信は触らない)
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_SCOPE)) return;
  // repair.html など別のページは触らない(アプリ本体の画面として、キャッシュに入れないため)
  if (url.pathname.endsWith('.html')) return;

  if (req.mode === 'navigate') {
    // 画面は、まずネットワーク。だめならキャッシュの画面を出す
    event.respondWith((async () => {
      const c = await caches.open(APP_CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) c.put(APP_SCOPE, res.clone());
        return res;
      } catch {
        return (await c.match(APP_SCOPE)) || Response.error();
      }
    })());
    return;
  }

  // JS・CSS・画像: キャッシュがあればすぐ出し、裏で新しいものに入れ替える
  event.respondWith((async () => {
    const c = await caches.open(APP_CACHE);
    const cached = await c.match(req);
    const network = fetch(req)
      .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
      .catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
