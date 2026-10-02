/* Service Worker — Absensi QR SMP Muhammadiyah 9 Nagreg
   Naikkan VERSI setiap kali berkas aplikasi diganti agar cache lama dibuang. */
const VERSI = 'absensi-qr-v2';
const CACHE_SHELL = VERSI + '-shell';
const CACHE_LIB = VERSI + '-lib';
const SHELL = ['./', './index.html', './manifest-absensi.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const HOST_LIB = ['unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'i.ibb.co.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.indexOf(VERSI) !== 0).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(req, namaCache) {
  return caches.open(namaCache).then(cache =>
    cache.match(req).then(cached => {
      const jaringan = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || jaringan;
    })
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST ke Apps Script tidak pernah disentuh
  const url = new URL(req.url);
  if (/script\.google\.com|googleusercontent\.com|drive\.google\.com/.test(url.hostname)) return; // data selalu live

  // Halaman utama: jaringan dulu (agar update cepat sampai), cache kalau offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const salinan = res.clone();
        caches.open(CACHE_SHELL).then(c => c.put('./index.html', salinan));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, CACHE_SHELL));
  } else if (HOST_LIB.indexOf(url.hostname) !== -1) {
    e.respondWith(staleWhileRevalidate(req, CACHE_LIB));
  }
});
