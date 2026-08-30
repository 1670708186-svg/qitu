/* 王半仙 PWA Service Worker v3（独立站点版）
   策略：
   - 静态资源（css/js/img）：缓存优先 + 后台更新（cache-first, stale-while-revalidate）
   - HTML 页面：网络优先（发版即时生效），失败回缓存，再失败回离线壳
   - API（/api/，外域原站）：永远走网络，不缓存 */
const CACHE_NAME = 'qitu-v3-cache-v1';
const SHELL_ASSETS = [
  'css/spirit.css',
  'css/starla.css',
  'js/starfield.js',
  'js/spirit.js',
  'js/config.js',
  'js/auth.js',
  'js/report.js',
  'js/tabbar.js',
  'img/icons/icon-192.png',
  'manifest.json',
  'index.html',
  'report.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(SHELL_ASSETS.map((a) => cache.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 离线提示页
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>离线 · 王半仙</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#08080c;color:rgba(255,255,255,.55);font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:2rem}
.box{max-width:320px}
.orb{width:56px;height:56px;margin:0 auto 1.2rem;border-radius:50%;
background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.9), rgba(91,141,239,.7) 40%, rgba(167,139,250,.5) 75%, rgba(10,10,20,.1));
box-shadow:0 0 30px rgba(129,140,248,.5);animation:bob 3s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
h1{color:rgba(255,255,255,.9);font-size:1.25rem;letter-spacing:3px;margin:0 0 .6rem;font-weight:300}
p{font-size:.85rem;line-height:1.8;margin:.3rem 0;opacity:.85}
button{margin-top:1.4rem;padding:.65rem 2.2rem;border-radius:999px;border:1px solid rgba(167,139,250,.6);
background:rgba(167,139,250,.12);color:#fff;font-size:.9rem;cursor:pointer}
</style></head>
<body><div class="box"><div class="orb"></div>
<h1>灵体暂隐</h1>
<p>当前处于离线状态，此页面需要联网加载。</p>
<p>已生成的报告保存在本机，联网后即可查看全部功能。</p>
<button onclick="location.reload()">重新连接</button></div></body></html>`;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // 外域（原站 API）不处理
  if (url.pathname.startsWith('/api/')) return;

  const isStaticAsset =
    url.pathname.indexOf('/css/') >= 0 ||
    url.pathname.indexOf('/js/') >= 0 ||
    url.pathname.indexOf('/img/') >= 0 ||
    url.pathname.indexOf('/vendor/') >= 0;

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // 页面请求：网络优先，失败回缓存，再失败回离线壳
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(req);
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            return resp;
          }
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } catch (e) {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
      })()
    );
  }
});
