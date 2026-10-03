/* 时钟静态版 Service Worker：预缓存外壳 + 导航网络优先/静态缓存优先 */
const CACHE = 'clock-static-v5'
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/views.css',
  './js/utils.js',
  './js/store.js',
  './js/cities.js',
  './js/ringtones.js',
  './js/components.js',
  './js/ringtone-modal.js',
  './js/ring-overlay.js',
  './js/views-alarm.js',
  './js/views-world.js',
  './js/views-stopwatch.js',
  './js/views-timer.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // cache: 'reload' 强制绕过 HTTP 缓存，避免预缓存到陈旧响应
        Promise.all(
          PRECACHE.map((u) =>
            fetch(u, { cache: 'reload' }).then((res) => {
              if (res && res.ok) return cache.put(u, res)
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 页面导航：网络优先，离线回退到缓存的首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // 静态资源：缓存优先 + 后台更新
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
