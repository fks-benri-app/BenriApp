// オフライン対応の Service Worker。インストール時に、ビルドで決まったファイル一覧(precache.json)を端末に入れる。
const SCOPE = self.registration.scope; // 例: https://…/BenriApp/
const CACHE_PREFIX = 'benri-app-';

function loadManifest() {
  return fetch(SCOPE + 'precache.json', { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('precache.json が読めません');
    return r.json();
  });
}

// 今の版のキャッシュ(ある場合)を返す。古い版は activate で消す
async function currentCache(version) {
  return caches.open(CACHE_PREFIX + (version || 'runtime'));
}

async function activeVersionCache() {
  const names = (await caches.keys()).filter((k) => k.startsWith(CACHE_PREFIX));
  return names[0] ? caches.open(names[0]) : currentCache(null);
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    try {
      const m = await loadManifest();
      const cache = await currentCache(m.version);
      await Promise.all(m.files.map(async (f) => {
        try {
          const res = await fetch(SCOPE + f, { cache: 'reload' });
          if (res.ok) await cache.put(SCOPE + f, res);
        } catch { /* 取れなかったものは、使うときにネットワークから読む */ }
      }));
    } catch { /* 一覧が読めなければ、オフライン対応はこの回だけ諦める */ }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const m = await loadManifest();
      const keep = CACHE_PREFIX + m.version;
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== keep).map((k) => caches.delete(k)));
    } catch { /* 消せなくても動く */ }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // このアプリの中身だけ対象(Firebase・GAS などの通信は触らない)
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  // repair.html など別のページは触らない(アプリ本体の画面として、キャッシュに入れないため)
  if (url.pathname.endsWith('.html') && url.href !== SCOPE) return;

  if (req.mode === 'navigate') {
    // 画面は、まずネットワーク。だめならキャッシュの画面を出す
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await activeVersionCache()).put(SCOPE, res.clone());
        return res;
      } catch {
        return (await caches.match(SCOPE)) || Response.error();
      }
    })());
    return;
  }

  // JS・CSS・画像: キャッシュがあればすぐ出し、裏で新しいものに入れ替える(インストール時に入れたものは、起動直後でも即座に出る)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req)
      .then(async (res) => { if (res.ok) (await activeVersionCache()).put(req, res.clone()); return res; })
      .catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    return (await network) || Response.error();
  })());
});
